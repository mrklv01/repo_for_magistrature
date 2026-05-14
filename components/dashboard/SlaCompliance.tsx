"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SlaStat } from "@/lib/features/department";

const PRIORITY_META = {
  P1: { label: "P1 — Критичный", color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", threshold: "≤ 4 ч" },
  P2: { label: "P2 — Высокий",   color: "bg-orange-500", textColor: "text-orange-600 dark:text-orange-400", threshold: "≤ 8 ч" },
  P3: { label: "P3 — Средний",   color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", threshold: "≤ 24 ч" },
  P4: { label: "P4 — Низкий",    color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", threshold: "≤ 72 ч" },
};

function pctColor(pct: number) {
  if (pct >= 0.9) return "bg-emerald-500";
  if (pct >= 0.7) return "bg-amber-500";
  return "bg-red-500";
}

interface Props {
  data: SlaStat[];
}

export function SlaCompliance({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          ⏱ SLA-соблюдение
          <span className="text-xs font-normal text-muted-foreground">по приоритетам</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {data.map((s) => {
          const meta = PRIORITY_META[s.priority];
          const pct = Math.round(s.pct * 100);
          return (
            <div
              key={s.priority}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{meta.label}</span>
                <span className="text-xs text-muted-foreground">{meta.threshold}</span>
              </div>

              {s.total === 0 ? (
                <p className="text-xs text-muted-foreground">Нет данных</p>
              ) : (
                <>
                  <div className="flex items-end gap-1">
                    <span className={`text-2xl font-black tabular-nums ${meta.textColor}`}>
                      {pct}%
                    </span>
                    <span className="mb-0.5 text-xs text-muted-foreground">
                      {s.met}/{s.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${pctColor(s.pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
