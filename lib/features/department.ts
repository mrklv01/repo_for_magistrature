import type { Ticket, NameMap } from "@/types/index";

export interface TopRequester {
  hash: string;
  name: string;
  count: number;
  p1p2Count: number;
}

export interface CategoryStat {
  category: string;
  count: number;
  avgResolutionHours: number;
  openCount: number;
}

export interface SlaStat {
  priority: "P1" | "P2" | "P3" | "P4";
  thresholdHours: number;
  total: number;
  met: number;
  pct: number;
}

export interface HeatmapCell {
  day: number;   // 0=Пн … 6=Вс
  hour: number;  // 0..23
  count: number;
}

export interface DepartmentInsights {
  topRequesters: TopRequester[];
  topCategories: CategoryStat[];
  slaStats: SlaStat[];
  heatmap: HeatmapCell[];
}

const SLA_HOURS: Record<"P1" | "P2" | "P3" | "P4", number> = {
  P1: 4,
  P2: 8,
  P3: 24,
  P4: 72,
};

/**
 * Compute department-level insights from raw tickets.
 * All computations are pure — no side effects.
 */
export function computeDepartmentInsights(
  tickets: Ticket[],
  nameMap: NameMap
): DepartmentInsights {
  // ── Top requesters ────────────────────────────────────────────────────────
  const reqMap = new Map<string, { count: number; p1p2Count: number }>();
  for (const t of tickets) {
    if (!t.initiator_hash) continue;
    const r = reqMap.get(t.initiator_hash) ?? { count: 0, p1p2Count: 0 };
    r.count++;
    if (t.priority === "P1" || t.priority === "P2") r.p1p2Count++;
    reqMap.set(t.initiator_hash, r);
  }
  const topRequesters: TopRequester[] = [...reqMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([hash, { count, p1p2Count }]) => ({
      hash,
      name: nameMap.get(hash) ?? hash.slice(0, 8) + "…",
      count,
      p1p2Count,
    }));

  // ── Top categories ────────────────────────────────────────────────────────
  const catMap = new Map<string, { count: number; hours: number[]; openCount: number }>();
  for (const t of tickets) {
    const cat = t.category?.trim() || "Без категории";
    const c = catMap.get(cat) ?? { count: 0, hours: [], openCount: 0 };
    c.count++;
    if (t.resolved_at) {
      c.hours.push((t.resolved_at.getTime() - t.accepted_at.getTime()) / 3600000);
    } else {
      c.openCount++;
    }
    catMap.set(cat, c);
  }
  const topCategories: CategoryStat[] = [...catMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([category, { count, hours, openCount }]) => ({
      category,
      count,
      avgResolutionHours:
        hours.length > 0
          ? Math.round((hours.reduce((s, h) => s + h, 0) / hours.length) * 10) / 10
          : 0,
      openCount,
    }));

  // ── SLA compliance ────────────────────────────────────────────────────────
  const slaAcc: Record<"P1" | "P2" | "P3" | "P4", { total: number; met: number }> = {
    P1: { total: 0, met: 0 },
    P2: { total: 0, met: 0 },
    P3: { total: 0, met: 0 },
    P4: { total: 0, met: 0 },
  };
  for (const t of tickets) {
    if (!t.resolved_at) continue;
    const hours = (t.resolved_at.getTime() - t.accepted_at.getTime()) / 3600000;
    const p = t.priority as "P1" | "P2" | "P3" | "P4";
    slaAcc[p].total++;
    if (hours <= SLA_HOURS[p]) slaAcc[p].met++;
  }
  const slaStats: SlaStat[] = (["P1", "P2", "P3", "P4"] as const).map((p) => ({
    priority: p,
    thresholdHours: SLA_HOURS[p],
    total: slaAcc[p].total,
    met: slaAcc[p].met,
    pct: slaAcc[p].total > 0 ? slaAcc[p].met / slaAcc[p].total : 0,
  }));

  // ── Heatmap: day-of-week × hour (based on accepted_at) ───────────────────
  const hmMap = new Map<string, number>();
  for (const t of tickets) {
    // JS getDay(): 0=Sun → convert to 0=Mon…6=Sun
    const day = (t.accepted_at.getDay() + 6) % 7;
    const hour = t.accepted_at.getHours();
    const key = `${day}-${hour}`;
    hmMap.set(key, (hmMap.get(key) ?? 0) + 1);
  }
  const heatmap: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({ day, hour, count: hmMap.get(`${day}-${hour}`) ?? 0 });
    }
  }

  return { topRequesters, topCategories, slaStats, heatmap };
}
