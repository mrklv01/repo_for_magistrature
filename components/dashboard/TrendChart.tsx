"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

interface Props {
  data: { week: string; avg_hours: number }[];
}

function shortWeek(w: string) {
  const m = w.match(/W(\d+)/);
  return m ? `Нед ${m[1]}` : w;
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
          tickFormatter={shortWeek}
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
          labelFormatter={(w) => shortWeek(String(w))}
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
