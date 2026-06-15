"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  data: { week: string; count: number }[];
}

/** "2026-W04"  →  Date of Monday that week (ISO 8601). */
function isoWeekMonday(w: string): Date | null {
  const m = w.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;          // 1=Mon … 7=Sun
  const monday1 = new Date(jan4.getTime() - (dow - 1) * 86400000);
  return new Date(monday1.getTime() + (week - 1) * 7 * 86400000);
}

const RU_MONTHS = ["янв", "фев", "мар", "апр", "май", "июн",
                   "июл", "авг", "сен", "окт", "ноя", "дек"];

/** Compact axis label: "3 фев" */
function shortDate(w: string): string {
  const d = isoWeekMonday(w);
  if (!d) return w;
  return `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]}`;
}

/** Full tooltip label: "3–9 февр. 2026" */
function weekRange(w: string): string {
  const mon = isoWeekMonday(w);
  if (!mon) return w;
  const sun = new Date(mon.getTime() + 6 * 86400000);
  const fromDay = mon.getUTCDate();
  const toDay   = sun.getUTCDate();
  const month   = RU_MONTHS[sun.getUTCMonth()];
  const year    = sun.getUTCFullYear();
  // If Mon and Sun are in the same month → "3–9 фев 2026"
  // Otherwise → "30 янв – 5 фев 2026"
  if (mon.getUTCMonth() === sun.getUTCMonth()) {
    return `${fromDay}–${toDay} ${month} ${year}`;
  }
  return `${fromDay} ${RU_MONTHS[mon.getUTCMonth()]} – ${toDay} ${month} ${year}`;
}

export function VolumeChart({ data }: Props) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Нет данных</p>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="week"
          tickFormatter={shortDate}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={24}
        />
        <Tooltip
          formatter={(v) => [Number(v), "тикетов"]}
          labelFormatter={(w) => weekRange(String(w))}
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
          }}
        />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
