"use client";

import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import type { ClaudeAnalysis } from "@/lib/schemas";
import type { EmployeeFeatures, FeatureValues, NameMap } from "@/types/index";
import { resolveNames } from "@/lib/resolveNames";
import { fmtIsoDate } from "@/lib/fmtDate";

const OVERLOAD_COLORS: Record<string, string> = {
  низкий: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  средний: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  высокий: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  критический: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
};

const EVENT_ICONS: Record<string, string> = {
  p1_incident: "🚨",
  activity_gap: "🏖️",
  after_hours_spike: "🌙",
};

const TREND_CONFIG = {
  ухудшение: { icon: TrendingUp, color: "text-red-500", label: "Ухудшение" },
  стабильно:  { icon: Minus,      color: "text-amber-500", label: "Стабильно" },
  улучшение:  { icon: TrendingDown, color: "text-emerald-500", label: "Улучшение" },
} as const;

interface Props {
  name: string;
  features: EmployeeFeatures;
  result: ClaudeAnalysis["employees"][number];
  maxValues: Record<keyof FeatureValues, number>;
  nameMap: NameMap;
  hrNote: string;
  onHrNoteChange: (note: string) => void;
  onClose: () => void;
}

export function EmployeeCard({ name, features, result, maxValues, nameMap, hrNote, onHrNoteChange, onClose }: Props) {
  const rn = (text: string) => resolveNames(text, nameMap);
  const trend = result.trend_direction ? TREND_CONFIG[result.trend_direction] : null;
  const TrendIcon = trend?.icon;

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{name}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Риск выгорания:{" "}
                <span className="font-semibold text-foreground">
                  {Math.round(result.burnout_risk * 100)}%
                </span>
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${OVERLOAD_COLORS[result.overload_category] ?? ""}`}
              >
                {result.overload_category}
              </span>
              {trend && TrendIcon && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${trend.color}`}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {trend.label}
                </span>
              )}
              {result.hiring_signal && (
                <Badge variant="secondary" className="text-xs">сигнал найма</Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Narrative */}
        <p className="text-sm leading-relaxed text-foreground">{rn(result.narrative)}</p>

        {/* Forecast */}
        {result.forecast_narrative && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm dark:border-amber-900 dark:bg-amber-950/40">
            <span className="shrink-0">🔮</span>
            <p className="text-amber-900 dark:text-amber-200">{rn(result.forecast_narrative)}</p>
          </div>
        )}

        {result.key_drivers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {result.key_drivers.map((d) => (
              <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
            ))}
          </div>
        )}

        {/* Event log */}
        {(features.events?.length ?? 0) > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              События за период
            </p>
            <ul className="flex flex-col gap-1.5">
              {features.events.map((ev, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 w-4">{EVENT_ICONS[ev.type]}</span>
                  <span className="text-foreground/70">{fmtIsoDate(ev.date)}</span>
                  <span>{ev.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Показатели (90 дней)
          </p>
          <MetricsGrid values={features.window_90d} maxValues={maxValues} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Объём тикетов по неделям</p>
            <VolumeChart data={features.weekly_volume} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">Тренд времени решения</p>
            <TrendChart data={features.weekly_execution} />
          </div>
        </div>

        {/* HR notes */}
        <div className="flex flex-col gap-1.5 border-t pt-4">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Заметки HR
          </label>
          <textarea
            value={hrNote}
            onChange={(e) => onHrNoteChange(e.target.value)}
            placeholder="Добавьте заметки по сотруднику — они войдут в PDF-отчёт"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </CardContent>
    </Card>
  );
}
