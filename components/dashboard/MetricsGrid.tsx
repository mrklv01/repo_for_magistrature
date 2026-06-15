"use client";

import { fmtFeatureValue } from "@/lib/features/humanize";
import type { FeatureValues } from "@/types/index";

// ── Метаданные ────────────────────────────────────────────────────────────────

interface MetricMeta {
  label: string;
  desc: string;
  highIsBad: boolean;
}

const METRICS: { key: keyof FeatureValues; meta: MetricMeta }[] = [
  { key: "tickets_per_week",       meta: { label: "Нагрузка",               desc: "тикетов в неделю",                    highIsBad: true  } },
  { key: "avg_response_min",       meta: { label: "Время реакции",           desc: "от создания до принятия",             highIsBad: true  } },
  { key: "avg_execution_hours",    meta: { label: "Время выполнения",        desc: "от принятия до закрытия",             highIsBad: true  } },
  { key: "execution_trend_slope",  meta: { label: "Тренд скорости",          desc: "«+» — замедляется (сигнал риска)",    highIsBad: true  } },
  { key: "high_priority_share",    meta: { label: "P1–P2",                   desc: "срочные и критичные заявки",          highIsBad: true  } },
  { key: "after_hours_share",      meta: { label: "Вне рабочих часов",       desc: "до 9:00 / после 18:00 / выходные",   highIsBad: true  } },
  { key: "task_entropy",           meta: { label: "Разнообразие задач",      desc: "широта категорий",                   highIsBad: false } },
  { key: "activity_gaps_count",    meta: { label: "Разрывы активности",      desc: "периоды 3+ дней без задач",           highIsBad: true  } },
  { key: "unique_contacts",        meta: { label: "Контакты",                desc: "уникальных коллег в тикетах",         highIsBad: false } },
  { key: "open_tickets_count",     meta: { label: "Открытые тикеты",         desc: "незакрытых на конец периода",         highIsBad: true  } },
  { key: "avg_description_length", meta: { label: "Сложность описаний",      desc: "средняя длина описания",             highIsBad: false } },
];

// ── Компонент ─────────────────────────────────────────────────────────────────

interface Props {
  values: FeatureValues;
  maxValues: Record<keyof FeatureValues, number>;
}

export function MetricsGrid({ values, maxValues }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {METRICS.map(({ key, meta }) => {
        const raw = values[key];
        const max = maxValues[key];
        const pct = max > 0 ? Math.min(raw / max, 1) : 0;

        const barColor = (() => {
          if (!meta.highIsBad) return "bg-primary/60";
          if (pct > 0.75) return "bg-destructive/70";
          if (pct > 0.45) return "bg-amber-400/80";
          return "bg-emerald-500/70";
        })();

        return (
          <div
            key={key}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">
              {meta.label}
            </span>
            <span className="text-base font-semibold leading-snug text-foreground">
              {fmtFeatureValue(key, raw)}
            </span>
            <span className="text-[11px] text-muted-foreground">{meta.desc}</span>

            {/* Полоска относительно макс. по отделу */}
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.round(pct * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {Math.round(pct * 100)}% от макс. по отделу
            </span>
          </div>
        );
      })}
    </div>
  );
}
