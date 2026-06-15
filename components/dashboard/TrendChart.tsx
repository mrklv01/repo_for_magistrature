"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

interface Props {
  data: { week: string; avg_hours: number }[];
}

/** "2026-W04"  →  Date of Monday that week (ISO 8601). */
function isoWeekMonday(w: string): Date | null {
  const m = w.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const monday1 = new Date(jan4.getTime() - (dow - 1) * 86400000);
  return new Date(monday1.getTime() + (week - 1) * 7 * 86400000);
}

const RU_MONTHS = ["янв", "фев", "мар", "апр", "май", "июн",
                   "июл", "авг", "сен", "окт", "ноя", "дек"];

function shortDate(w: string): string {
  const d = isoWeekMonday(w);
  if (!d) return w;
  return `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]}`;
}

function weekRange(w: string): string {
  const mon = isoWeekMonday(w);
  if (!mon) return w;
  const sun = new Date(mon.getTime() + 6 * 86400000);
  const fromDay = mon.getUTCDate();
  const toDay   = sun.getUTCDate();
  const month   = RU_MONTHS[sun.getUTCMonth()];
  const year    = sun.getUTCFullYear();
  if (mon.getUTCMonth() === sun.getUTCMonth()) {
    return `${fromDay}–${toDay} ${month} ${year}`;
  }
  return `${fromDay} ${RU_MONTHS[mon.getUTCMonth()]} – ${toDay} ${month} ${year}`;
}

export function TrendChart({ data }: Props) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Нет закрытых тикетов</p>;
  const avg = data.reduce((s, d) => s + d.avg_hours, 0) / data.length;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
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
          width={32}
          tickFormatter={(v: number) => `${v}ч`}
        />
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(1)} ч`, "Среднее"]}
          labelFormatter={(w) => weekRange(String(w))}
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
          }}
        />
        <ReferenceLine y={avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="avg_hours"
          stroke="hsl(var(--destructive))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
