"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  data: { week: string; count: number }[];
}

function shortWeek(w: string) {
  const m = w.match(/W(\d+)/);
  return m ? `Нед ${m[1]}` : w;
}

export function VolumeChart({ data }: Props) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Нет данных</p>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
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
          width={24}
        />
        <Tooltip
          formatter={(v) => [Number(v), "тикетов"]}
          labelFormatter={(w) => shortWeek(String(w))}
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
