import type { Ticket, EmployeeFeatures, FeatureValues, TicketEvent } from "@/types/index";
import {
  isoWeek,
  ticketsPerWeek,
  avgResponseMin,
  avgExecutionHours,
  executionTrendSlope,
  highPriorityShare,
  afterHoursShare,
  taskEntropy,
  activityGapsCount,
  uniqueContacts,
  openTicketsCount,
  avgDescriptionLength,
} from "@/lib/features/formulas";

function windowOf(tickets: Ticket[], days: number, reference: Date): Ticket[] {
  const start = new Date(reference.getTime() - days * 86400000);
  return tickets.filter((t) => t.created_at >= start && t.created_at <= reference);
}

function computeFeatureValues(
  tickets: Ticket[],
  windowDays: number,
  windowStart: Date,
  windowEnd: Date
): FeatureValues {
  return {
    tickets_per_week: ticketsPerWeek(tickets, windowDays),
    avg_response_min: avgResponseMin(tickets),
    avg_execution_hours: avgExecutionHours(tickets),
    execution_trend_slope: executionTrendSlope(tickets),
    high_priority_share: highPriorityShare(tickets),
    after_hours_share: afterHoursShare(tickets),
    task_entropy: taskEntropy(tickets),
    activity_gaps_count: activityGapsCount(tickets, windowStart, windowEnd),
    unique_contacts: uniqueContacts(tickets),
    open_tickets_count: openTicketsCount(tickets),
    avg_description_length: avgDescriptionLength(tickets),
  };
}

function weeklyVolume(tickets: Ticket[]): { week: string; count: number }[] {
  const map = new Map<string, number>();
  for (const t of tickets) {
    const w = isoWeek(t.created_at);
    map.set(w, (map.get(w) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));
}

function weeklyExecution(tickets: Ticket[]): { week: string; avg_hours: number }[] {
  const map = new Map<string, number[]>();
  for (const t of tickets) {
    if (!t.resolved_at) continue;
    const w = isoWeek(t.created_at);
    const hours = (t.resolved_at.getTime() - t.accepted_at.getTime()) / 3600000;
    if (!map.has(w)) map.set(w, []);
    map.get(w)!.push(hours);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, hrs]) => ({
      week,
      avg_hours: Math.round((hrs.reduce((s, h) => s + h, 0) / hrs.length) * 10) / 10,
    }));
}

function computeEvents(tickets: Ticket[], windowStart: Date, windowEnd: Date): TicketEvent[] {
  const events: TicketEvent[] = [];
  const window = tickets.filter((t) => t.created_at >= windowStart && t.created_at <= windowEnd);

  // P1 incidents
  for (const t of window.filter((t) => t.priority === "P1")) {
    events.push({
      date: t.created_at.toISOString().split("T")[0],
      type: "p1_incident",
      label: `P1-инцидент: ${t.category || t.ticket_id}`,
    });
  }

  // Activity gaps ≥ 5 days
  const days = new Set(window.map((t) => t.created_at.toISOString().split("T")[0]));
  let gapStart: Date | null = null;
  let gapLen = 0;
  const cur = new Date(windowStart);
  while (cur <= windowEnd) {
    const key = cur.toISOString().split("T")[0];
    if (!days.has(key)) {
      if (!gapStart) gapStart = new Date(cur);
      gapLen++;
    } else {
      if (gapStart && gapLen >= 5) {
        events.push({
          date: gapStart.toISOString().split("T")[0],
          type: "activity_gap",
          label: `Отсутствие активности ${gapLen} дн. (возможный отпуск/больничный)`,
        });
      }
      gapStart = null;
      gapLen = 0;
    }
    cur.setDate(cur.getDate() + 1);
  }

  // After-hours spikes: weeks where after-hours share > 30%
  const byWeek = new Map<string, { total: number; afterHours: number }>();
  for (const t of window) {
    const w = isoWeek(t.created_at);
    if (!byWeek.has(w)) byWeek.set(w, { total: 0, afterHours: 0 });
    const entry = byWeek.get(w)!;
    entry.total++;
    const h = t.accepted_at.getHours();
    const isWeekend = [0, 6].includes(t.accepted_at.getDay());
    if (isWeekend || h < 9 || h >= 18) entry.afterHours++;
  }
  for (const [week, { total, afterHours }] of byWeek) {
    if (total >= 3 && afterHours / total > 0.3) {
      events.push({
        date: week,
        type: "after_hours_spike",
        label: `Переработки на неделе ${week}: ${Math.round((afterHours / total) * 100)}% вне рабочего времени`,
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Compute EmployeeFeatures[] from all tickets.
 * Reference date = latest ticket date in the dataset.
 *
 * @example
 * const features = engineerFeatures(tickets);
 */
export function engineerFeatures(allTickets: Ticket[]): EmployeeFeatures[] {
  if (allTickets.length === 0) return [];

  const reference = new Date(Math.max(...allTickets.map((t) => t.created_at.getTime())));
  const window30Start = new Date(reference.getTime() - 30 * 86400000);
  const window90Start = new Date(reference.getTime() - 90 * 86400000);

  const employeeIds = [...new Set(allTickets.map((t) => t.assigned_to_hash))].filter(Boolean);

  return employeeIds.map((empId) => {
    const empTickets = allTickets.filter((t) => t.assigned_to_hash === empId);
    const t30 = windowOf(empTickets, 30, reference);
    const t90 = windowOf(empTickets, 90, reference);

    return {
      employee_id: empId,
      window_30d: computeFeatureValues(t30, 30, window30Start, reference),
      window_90d: computeFeatureValues(t90, 90, window90Start, reference),
      weekly_volume: weeklyVolume(empTickets),
      weekly_execution: weeklyExecution(empTickets),
      events: computeEvents(empTickets, window90Start, reference),
    };
  });
}
