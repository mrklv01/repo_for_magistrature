"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopRequester } from "@/lib/features/department";

interface Props {
  data: TopRequester[];
}

export function TopRequesters({ data }: Props) {
  if (data.length === 0) return null;
  const max = data[0].count;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          📨 Топ заявителей
          <span className="text-xs font-normal text-muted-foreground">за весь период</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {data.map((r, i) => (
          <div key={r.hash} className="flex items-center gap-3">
            <span className="w-5 shrink-0 text-right text-xs font-mono text-muted-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{r.name}</span>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {r.p1p2Count > 0 && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {r.p1p2Count} P1/P2
                    </span>
                  )}
                  <span className="font-semibold text-foreground tabular-nums">{r.count}</span>
                </div>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
