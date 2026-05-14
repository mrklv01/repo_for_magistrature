"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { HistoryRecord } from "@/types/index";

interface Props {
  older: HistoryRecord;
  newer: HistoryRecord;
  olderLabel: string;
  newerLabel: string;
  onBack: () => void;
}

interface EmployeeRow {
  name: string;
  prev_risk: number;
  curr_risk: number;
  delta: number;
  prev_overload: string;
  curr_overload: string;
}

function isRow(r: EmployeeRow | null): r is EmployeeRow { return r !== null; }

function buildRows(older: HistoryRecord, newer: HistoryRecord): EmployeeRow[] {
  const oldNames = new Map(older.nameMap);
  const newNames = new Map(newer.nameMap);
  const oldByName = new Map(
    older.analysis.employees.map((e) => [oldNames.get(e.employee_id) ?? e.employee_id, e])
  );
  const newByName = new Map(
    newer.analysis.employees.map((e) => [newNames.get(e.employee_id) ?? e.employee_id, e])
  );
  const names = [...new Set([...oldByName.keys(), ...newByName.keys()])];
  const rows: EmployeeRow[] = [];
  for (const name of names) {
    const prev = oldByName.get(name);
    const curr = newByName.get(name);
    if (!prev || !curr) continue;
    rows.push({
      name,
      prev_risk: prev.burnout_risk,
      curr_risk: curr.burnout_risk,
      delta: curr.burnout_risk - prev.burnout_risk,
      prev_overload: prev.overload_category,
      curr_overload: curr.overload_category,
    });
  }
  return rows.filter(isRow).sort((a, b) => b.delta - a.delta);
}

function RiskBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.7 ? "bg-red-500" : value >= 0.4 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-9 shrink-0 text-right text-sm font-bold tabular-nums">{pct}%</span>
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const pct = Math.round(delta * 100);
  if (Math.abs(pct) < 2) return <span className="text-xs text-muted-foreground">≈0%</span>;
  const color = delta > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";
  return <span className={`text-sm font-bold tabular-nums ${color}`}>{delta > 0 ? "+" : ""}{pct}%</span>;
}

function OverloadBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    низкий: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    средний: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    высокий: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    критический: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[value] ?? ""}`}>
      {value}
    </span>
  );
}

export function CompareView({ older, newer, olderLabel, newerLabel, onBack }: Props) {
  const rows = buildRows(older, newer);
  const deptDelta = newer.analysis.department.avg_burnout_risk - older.analysis.department.avg_burnout_risk;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 flex flex-col gap-8">

      {/* Back */}
      <button type="button" onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Назад
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Сравнение анализов</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded bg-muted px-2 py-1 font-medium text-foreground">{olderLabel}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
          <span className="rounded bg-muted px-2 py-1 font-medium text-foreground">{newerLabel}</span>
        </div>
      </div>

      {/* Department summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Средний риск — было</p>
            <p className="text-3xl font-black tabular-nums">{Math.round(older.analysis.department.avg_burnout_risk * 100)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{olderLabel}</p>
          </CardContent>
        </Card>
        <Card className="flex items-center justify-center">
          <CardContent className="pt-5 text-center">
            <ArrowRight className="mx-auto h-8 w-8 text-muted-foreground" />
            <DeltaBadge delta={deptDelta} />
            <p className="mt-1 text-xs text-muted-foreground">изменение</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Средний риск — стало</p>
            <p className="text-3xl font-black tabular-nums">{Math.round(newer.analysis.department.avg_burnout_risk * 100)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{newerLabel}</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee comparison */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-foreground">По сотрудникам</h2>
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Нет совпадающих сотрудников — анализы из разных сессий с разными данными.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.name}>
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  {/* Было */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-foreground">{row.name}</p>
                    <RiskBar value={row.prev_risk} />
                    <OverloadBadge value={row.prev_overload} />
                  </div>

                  {/* Стрелка + дельта */}
                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <DeltaBadge delta={row.delta} />
                  </div>

                  {/* Стало */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-foreground invisible">{row.name}</p>
                    <RiskBar value={row.curr_risk} />
                    <OverloadBadge value={row.curr_overload} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
