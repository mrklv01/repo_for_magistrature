"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryStat } from "@/lib/features/department";

interface Props {
  data: CategoryStat[];
}

export function TopProblems({ data }: Props) {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🔧 Топ проблем
          <span className="text-xs font-normal text-muted-foreground">по категориям тикетов</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y divide-border">
          {data.map((d) => {
            const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
            const detail = [
              `${d.count} тикетов`,
              d.openCount > 0 ? `${d.openCount} незакрытых` : null,
              d.avgResolutionHours > 0 ? `среднее время ${d.avgResolutionHours} ч` : null,
              `${Math.round(pct)}% от топ-категории`,
            ].filter(Boolean).join(" · ");

            return (
              <div
                key={d.category}
                className="group -mx-2 flex flex-col gap-1 rounded-md px-2 py-2.5 transition-colors duration-300 hover:bg-muted/60 cursor-default"
              >
                {/* Строка: название + метрики */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">{d.category}</span>
                  <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
                    {d.openCount > 0 && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {d.openCount} открыт.
                      </span>
                    )}
                    {d.avgResolutionHours > 0 && (
                      <span>ср. {d.avgResolutionHours} ч</span>
                    )}
                    <span className="w-6 text-right font-semibold text-foreground tabular-nums">
                      {d.count}
                    </span>
                  </div>
                </div>

                {/* Полоска */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all duration-300 ease-in-out group-hover:bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Расшифровка — плавно появляется через opacity */}
                <p className="max-h-0 overflow-hidden text-[11px] text-muted-foreground opacity-0 transition-all duration-500 ease-in-out group-hover:max-h-8 group-hover:opacity-100">
                  {detail}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
