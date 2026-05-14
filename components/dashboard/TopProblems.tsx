"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryStat } from "@/lib/features/department";

interface Props {
  data: CategoryStat[];
}

export function TopProblems({ data }: Props) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    category: d.category.length > 20 ? d.category.slice(0, 18) + "…" : d.category,
    fullCategory: d.category,
    count: d.count,
    openCount: d.openCount,
    avgHours: d.avgResolutionHours,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🔧 Топ проблем
          <span className="text-xs font-normal text-muted-foreground">по категориям тикетов</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 48, bottom: 0, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={110}
              tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v, name) =>
                name === "count"
                  ? [Number(v), "тикетов"]
                  : [Number(v), "открытых"]
              }
              labelFormatter={(label) => {
                const d = chartData.find((x) => x.category === label);
                return d?.fullCategory ?? label;
              }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
              }}
            />
            <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={18}>
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={`hsl(var(--primary) / ${1 - i * 0.08})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Detail table */}
        <div className="flex flex-col divide-y divide-border">
          {data.map((d) => (
            <div key={d.category} className="flex items-center justify-between gap-2 py-1.5 text-xs">
              <span className="truncate text-muted-foreground">{d.category}</span>
              <div className="flex shrink-0 items-center gap-3">
                {d.openCount > 0 && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {d.openCount} открыт.
                  </span>
                )}
                {d.avgResolutionHours > 0 && (
                  <span className="text-muted-foreground">
                    ⌀ {d.avgResolutionHours}ч
                  </span>
                )}
                <span className="font-semibold text-foreground tabular-nums">{d.count}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
