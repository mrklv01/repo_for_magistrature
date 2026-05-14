"use client";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import type { FeatureValues } from "@/types/index";

const LABELS: Record<keyof FeatureValues, string> = {
  tickets_per_week:      "Нагрузка",
  avg_response_min:      "Реакция",
  avg_execution_hours:   "Исполнение",
  execution_trend_slope: "Тренд",
  high_priority_share:   "P1–P2",
  after_hours_share:     "Вне часов",
  task_entropy:          "Разнообразие",
  activity_gaps_count:   "Разрывы",
  unique_contacts:       "Контакты",
  open_tickets_count:    "Открытые",
  avg_description_length:"Сложность",
};

interface Props {
  values: FeatureValues;
  /** Max value per metric key across the whole department (for 0..1 normalization) */
  maxValues: Record<keyof FeatureValues, number>;
}

export function MetricRadar({ values, maxValues }: Props) {
  const data = (Object.keys(LABELS) as (keyof FeatureValues)[]).map((key) => ({
    subject: LABELS[key],
    value: maxValues[key] > 0 ? Math.min(values[key] / maxValues[key], 1) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        />
        <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
        <Tooltip
          formatter={(v) => [`${((Number(v) || 0) * 100).toFixed(0)}%`, "Относительно отдела"]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
          }}
        />
        <Radar
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.25}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
