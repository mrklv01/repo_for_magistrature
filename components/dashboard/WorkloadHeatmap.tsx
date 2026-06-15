"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeatmapCell } from "@/lib/features/department";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WORK_START = 9;
const WORK_END = 18;

function intensityClass(count: number, max: number, afterHours: boolean): string {
  if (count === 0 || max === 0) return "bg-muted/40";
  const ratio = count / max;
  if (afterHours) {
    // Нерабочее время с тикетами — красная шкала
    if (ratio < 0.15) return "bg-red-200/70  dark:bg-red-900/50";
    if (ratio < 0.35) return "bg-red-300/80  dark:bg-red-800/70";
    if (ratio < 0.6)  return "bg-red-400/90  dark:bg-red-700/80";
    if (ratio < 0.8)  return "bg-red-500     dark:bg-red-600";
    return                    "bg-red-700     dark:bg-red-500";
  }
  // Рабочее время — синяя шкала
  if (ratio < 0.15) return "bg-blue-200/60 dark:bg-blue-900/40";
  if (ratio < 0.35) return "bg-blue-300/70 dark:bg-blue-800/60";
  if (ratio < 0.6)  return "bg-blue-400/80 dark:bg-blue-700/70";
  if (ratio < 0.8)  return "bg-blue-500    dark:bg-blue-600";
  return                    "bg-blue-700    dark:bg-blue-500";
}

interface Props {
  data: HeatmapCell[];
}

export function WorkloadHeatmap({ data }: Props) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((c) => c.count));

  // Build lookup: [day][hour] → count
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const c of data) {
    grid[c.day][c.hour] = c.count;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          🗓 Тепловая карта нагрузки
          <span className="text-xs font-normal text-muted-foreground">день × час (принятие тикетов)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Hour labels */}
            <div className="mb-1 flex pl-8">
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="flex-1 text-center text-[9px] text-muted-foreground"
                  style={{ minWidth: 0 }}
                >
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {DAYS.map((dayLabel, d) => (
              <div key={d} className="mb-0.5 flex items-center gap-1">
                <span className="w-7 shrink-0 text-right text-[10px] font-medium text-muted-foreground">
                  {dayLabel}
                </span>
                {Array.from({ length: 24 }, (_, h) => {
                  const count = grid[d][h];
                  const isAfterHours = h < WORK_START || h >= WORK_END || d >= 5;
                  return (
                    <div
                      key={h}
                      title={`${dayLabel} ${h}:00 — ${count} тик.${isAfterHours ? " ⚠️ вне рабочего времени" : ""}`}
                      className={[
                        "flex-1 rounded-sm transition-colors",
                        intensityClass(count, max, isAfterHours),
                      ].join(" ")}
                      style={{ aspectRatio: "1 / 1", minWidth: 0 }}
                    />
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="mt-3 flex flex-col gap-1.5 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-36 shrink-0">Рабочее время:</span>
                <span>Мало</span>
                {["bg-blue-200/60", "bg-blue-300/70", "bg-blue-400/80", "bg-blue-500", "bg-blue-700"].map((c, i) => (
                  <span key={i} className={`inline-block h-2.5 w-4 rounded-sm ${c}`} />
                ))}
                <span>Много</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-36 shrink-0">Вне рабочего времени:</span>
                <span>Мало</span>
                {["bg-red-200/70", "bg-red-300/80", "bg-red-400/90", "bg-red-500", "bg-red-700"].map((c, i) => (
                  <span key={i} className={`inline-block h-2.5 w-4 rounded-sm ${c}`} />
                ))}
                <span>Много</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
