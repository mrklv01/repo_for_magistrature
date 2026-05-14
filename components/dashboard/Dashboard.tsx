"use client";

import { useMemo } from "react";
import { DepartmentSummary } from "@/components/dashboard/DepartmentSummary";
import { EmployeeTable } from "@/components/dashboard/EmployeeTable";
import { InsightsSection } from "@/components/dashboard/InsightsSection";
import type { ClaudeAnalysis } from "@/lib/schemas";
import type { EmployeeFeatures, FeatureValues, NameMap } from "@/types/index";
import type { DepartmentInsights } from "@/lib/features/department";

interface Props {
  analysis: ClaudeAnalysis;
  features: EmployeeFeatures[];
  nameMap: NameMap;
  insights: DepartmentInsights;
  hrNotes: Map<string, string>;
  setHrNotes: (id: string, note: string) => void;
  onReset: () => void;
}

const FEATURE_KEYS: (keyof FeatureValues)[] = [
  "tickets_per_week", "avg_response_min", "avg_execution_hours",
  "execution_trend_slope", "high_priority_share", "after_hours_share",
  "task_entropy", "activity_gaps_count", "unique_contacts",
  "open_tickets_count", "avg_description_length",
];

export function Dashboard({ analysis, features, nameMap, insights, hrNotes, setHrNotes }: Props) {
  const maxValues = useMemo(() => {
    const result = {} as Record<keyof FeatureValues, number>;
    for (const key of FEATURE_KEYS) {
      result[key] = Math.max(1, ...features.map((f) => f.window_90d[key]));
    }
    return result;
  }, [features]);

  return (
    <div className="flex flex-col gap-8">
      {/* Department overview */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
          📊 Аналитика отдела
        </h2>
        <DepartmentSummary analysis={analysis} nameMap={nameMap} />
      </section>

      {/* Period insights */}
      <InsightsSection insights={insights} />

      {/* Employee table */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
          👤 Сотрудники
          <span className="text-sm font-normal text-muted-foreground">
            — нажмите на строку для детального просмотра
          </span>
        </h2>
        <EmployeeTable
          analysis={analysis}
          features={features}
          nameMap={nameMap}
          maxValues={maxValues}
          hrNotes={hrNotes}
          setHrNotes={setHrNotes}
        />
      </section>

      {/* Footer */}
      <footer className="border-t pt-6 text-center text-xs text-muted-foreground no-print">
        Инструмент построен на концепции магистерской диссертации Прудникова Д., Esil University,
        2026. Результаты носят рекомендательный характер; финальное кадровое решение остаётся за
        HR-менеджером.
      </footer>
    </div>
  );
}
