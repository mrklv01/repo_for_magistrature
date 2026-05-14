"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmployeeCard } from "@/components/dashboard/EmployeeCard";
import type { ClaudeAnalysis } from "@/lib/schemas";
import type { EmployeeFeatures, FeatureValues, NameMap } from "@/types/index";

const RISK_BG: (r: number) => string = (r) => {
  if (r >= 0.7) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (r >= 0.4) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
};

const OVERLOAD_VARIANT: Record<string, string> = {
  низкий: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  средний: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  высокий: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  критический: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
};

interface Props {
  analysis: ClaudeAnalysis;
  features: EmployeeFeatures[];
  nameMap: NameMap;
  maxValues: Record<keyof FeatureValues, number>;
  hrNotes: Map<string, string>;
  setHrNotes: (id: string, note: string) => void;
}

export function EmployeeTable({ analysis, features, nameMap, maxValues, hrNotes, setHrNotes }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedId && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedId]);

  const rows = [...analysis.employees].sort((a, b) =>
    sortAsc ? a.burnout_risk - b.burnout_risk : b.burnout_risk - a.burnout_risk
  );

  function toggle(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  const selectedFeatures = selectedId ? features.find((f) => f.employee_id === selectedId) : null;
  const selectedResult = selectedId ? analysis.employees.find((e) => e.employee_id === selectedId) : null;

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Сотрудник</TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => setSortAsc((v) => !v)}
            >
              <span className="flex items-center gap-1">
                Риск выгорания
                {sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </span>
            </TableHead>
            <TableHead>Перегрузка</TableHead>
            <TableHead>Ключевые факторы</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((emp) => {
            const name = nameMap.get(emp.employee_id) ?? emp.employee_id.slice(0, 8) + "…";
            const isSelected = selectedId === emp.employee_id;
            return (
              <TableRow
                key={emp.employee_id}
                onClick={() => toggle(emp.employee_id)}
                className={`cursor-pointer ${isSelected ? "bg-muted" : ""}`}
              >
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-sm font-semibold tabular-nums ${RISK_BG(emp.burnout_risk)}`}
                  >
                    {Math.round(emp.burnout_risk * 100)}%
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${OVERLOAD_VARIANT[emp.overload_category] ?? ""}`}
                  >
                    {emp.overload_category}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {emp.key_drivers.slice(0, 3).map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Risk scale legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Шкала риска выгорания:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-green-200 dark:bg-green-900/50" />
          <span><strong className="text-foreground">0–39%</strong> — норма, мониторинг не требуется</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-amber-200 dark:bg-amber-900/50" />
          <span><strong className="text-foreground">40–69%</strong> — повышенное внимание, рекомендована беседа</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-red-200 dark:bg-red-900/50" />
          <span><strong className="text-foreground">70–100%</strong> — критический сигнал, требует действий</span>
        </span>
      </div>

      {selectedFeatures && selectedResult && (
        <div ref={cardRef} className="scroll-mt-20">
          <EmployeeCard
            name={nameMap.get(selectedResult.employee_id) ?? selectedResult.employee_id}
            features={selectedFeatures}
            result={selectedResult}
            maxValues={maxValues}
            nameMap={nameMap}
            hrNote={hrNotes.get(selectedResult.employee_id) ?? ""}
            onHrNoteChange={(note) => setHrNotes(selectedResult.employee_id, note)}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}
    </div>
  );
}
