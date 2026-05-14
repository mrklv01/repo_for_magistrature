"use client";

import { TopRequesters } from "@/components/dashboard/TopRequesters";
import { TopProblems } from "@/components/dashboard/TopProblems";
import { SlaCompliance } from "@/components/dashboard/SlaCompliance";
import { WorkloadHeatmap } from "@/components/dashboard/WorkloadHeatmap";
import type { DepartmentInsights } from "@/lib/features/department";

interface Props {
  insights: DepartmentInsights;
}

export function InsightsSection({ insights }: Props) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
        📈 Аналитика периода
      </h2>

      {/* Top 2: requesters + SLA side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TopRequesters data={insights.topRequesters} />
        <SlaCompliance data={insights.slaStats} />
      </div>

      {/* Top problems full width */}
      <TopProblems data={insights.topCategories} />

      {/* Heatmap full width */}
      <WorkloadHeatmap data={insights.heatmap} />
    </section>
  );
}
