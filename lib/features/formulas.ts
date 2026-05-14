import type { Ticket } from "@/types/index";

// ── Week helpers ──────────────────────────────────────────────────────────────

/** Returns ISO week string like "2026-W04" for grouping. */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ── OLS regression ────────────────────────────────────────────────────────────

function olsSlope(points: [number, number][]): number {
  const n = points.length;
  if (n < 2) return 0;
  const sumX = points.reduce((s, [x]) => s + x, 0);
  const sumY = points.reduce((s, [, y]) => s + y, 0);
  const sumXY = points.reduce((s, [x, y]) => s + x * y, 0);
  const sumX2 = points.reduce((s, [x]) => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

// ── 11 formulas ───────────────────────────────────────────────────────────────

/** 1. Average tickets per calendar week. */
export function ticketsPerWeek(tickets: Ticket[], windowDays: number): number {
  return tickets.length / (windowDays / 7);
}

/** 2. Average response time in minutes (created → accepted). */
export function avgResponseMin(tickets: Ticket[]): number {
  if (tickets.length === 0) return 0;
  const sum = tickets.reduce(
    (s, t) => s + (t.accepted_at.getTime() - t.created_at.getTime()) / 60000,
    0
  );
  return sum / tickets.length;
}

/** 3. Average execution time in hours (accepted → resolved) for closed tickets only. */
export function avgExecutionHours(tickets: Ticket[]): number {
  const closed = tickets.filter((t) => t.resolved_at !== null);
  if (closed.length === 0) return 0;
  const sum = closed.reduce(
    (s, t) => s + (t.resolved_at!.getTime() - t.accepted_at.getTime()) / 3600000,
    0
  );
  return sum / closed.length;
}

/** 4. OLS slope of weekly avg execution hours. Positive = getting slower (burnout signal). */
export function executionTrendSlope(tickets: Ticket[]): number {
  const closed = tickets.filter((t) => t.resolved_at !== null);
  if (closed.length < 4) return 0;

  const weekMap = new Map<string, number[]>();
  for (const t of closed) {
    const w = isoWeek(t.created_at);
    const hours = (t.resolved_at!.getTime() - t.accepted_at.getTime()) / 3600000;
    if (!weekMap.has(w)) weekMap.set(w, []);
    weekMap.get(w)!.push(hours);
  }

  const points: [number, number][] = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, hrs], i) => [i, hrs.reduce((s, h) => s + h, 0) / hrs.length]);

  return olsSlope(points);
}

/** 5. Share of P1+P2 tickets. */
export function highPriorityShare(tickets: Ticket[]): number {
  if (tickets.length === 0) return 0;
  return tickets.filter((t) => t.priority === "P1" || t.priority === "P2").length / tickets.length;
}

/** 6. Share of tickets accepted outside 09:00–18:00 or on weekends. */
export function afterHoursShare(tickets: Ticket[]): number {
  if (tickets.length === 0) return 0;
  const count = tickets.filter((t) => {
    const h = t.accepted_at.getHours();
    const day = t.accepted_at.getDay();
    return h < 9 || h >= 18 || day === 0 || day === 6;
  }).length;
  return count / tickets.length;
}

/** 7. Shannon entropy of category distribution. Higher = more diverse tasks. */
export function taskEntropy(tickets: Ticket[]): number {
  if (tickets.length === 0) return 0;
  const counts: Record<string, number> = {};
  for (const t of tickets) {
    counts[t.category || "other"] = (counts[t.category || "other"] ?? 0) + 1;
  }
  const total = tickets.length;
  return Object.values(counts).reduce((entropy, c) => {
    const p = c / total;
    return entropy - p * Math.log2(p);
  }, 0);
}

/** 8. Number of sequences of ≥3 consecutive days with no tickets in the window. */
export function activityGapsCount(tickets: Ticket[], windowStart: Date, windowEnd: Date): number {
  const activeDays = new Set(
    tickets.map((t) => {
      const d = t.created_at;
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  let gapCount = 0;
  let streak = 0;
  const cur = new Date(windowStart);
  while (cur <= windowEnd) {
    const key = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
    if (activeDays.has(key)) {
      if (streak >= 3) gapCount++;
      streak = 0;
    } else {
      streak++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (streak >= 3) gapCount++;
  return gapCount;
}

/** 9. Count of distinct initiator + approver hashes (collaboration network size). */
export function uniqueContacts(tickets: Ticket[]): number {
  const contacts = new Set<string>();
  for (const t of tickets) {
    if (t.initiator_hash) contacts.add(t.initiator_hash);
    if (t.approver_hash) contacts.add(t.approver_hash);
  }
  return contacts.size;
}

/** 10. Count of tickets without resolved_at (open at end of window). */
export function openTicketsCount(tickets: Ticket[]): number {
  return tickets.filter((t) => t.resolved_at === null).length;
}

/** 11. Average character length of ticket descriptions. */
export function avgDescriptionLength(tickets: Ticket[]): number {
  if (tickets.length === 0) return 0;
  return tickets.reduce((s, t) => s + (t.description?.length ?? 0), 0) / tickets.length;
}
