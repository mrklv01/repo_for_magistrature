"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClaudeAnalysis } from "@/lib/schemas";
import type { NameMap } from "@/types/index";
import { resolveNames } from "@/lib/resolveNames";

interface Action {
  priority: "high" | "medium" | "low";
  text: string;
}

function buildActions(analysis: ClaudeAnalysis, nameMap: NameMap): Action[] {
  const actions: Action[] = [];
  const rn = (s: string) => resolveNames(s, nameMap);

  const critical = analysis.employees.filter((e) => e.burnout_risk >= 0.7);
  const elevated = analysis.employees.filter((e) => e.burnout_risk >= 0.4 && e.burnout_risk < 0.7);
  const overloaded = analysis.employees.filter(
    (e) => e.overload_category === "критический" || e.overload_category === "высокий"
  );
  const hiringSignals = analysis.employees.filter((e) => e.hiring_signal);

  if (critical.length > 0) {
    const names = critical.map((e) => rn(e.employee_id)).join(", ");
    actions.push({
      priority: "high",
      text: `Провести срочную индивидуальную беседу: ${names}`,
    });
  }

  if (overloaded.length > 0) {
    const names = overloaded.map((e) => rn(e.employee_id)).join(", ");
    actions.push({
      priority: "high",
      text: `Оценить перераспределение нагрузки для: ${names}`,
    });
  }

  if (elevated.length > 0) {
    const names = elevated.map((e) => rn(e.employee_id)).join(", ");
    actions.push({
      priority: "medium",
      text: `Усилить мониторинг состояния сотрудников: ${names}`,
    });
  }

  if (hiringSignals.length > 0) {
    actions.push({
      priority: "medium",
      text: `Рассмотреть необходимость найма — признаки кадрового дефицита выявлены у ${hiringSignals.length} ${hiringSignals.length === 1 ? "сотрудника" : "сотрудников"}`,
    });
  }

  if (analysis.department.avg_burnout_risk >= 0.4) {
    actions.push({
      priority: "low",
      text: "Провести командный чек-ин для оценки морального климата в отделе",
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: "low",
      text: "Ситуация стабильная — плановый мониторинг согласно регламенту",
    });
  }

  return actions;
}

const ACTION_STYLE: Record<Action["priority"], { dot: string; bg: string; text: string }> = {
  high:   { dot: "bg-red-500",   bg: "bg-red-50 dark:bg-red-950/30",   text: "text-red-900 dark:text-red-200" },
  medium: { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-900 dark:text-amber-200" },
  low:    { dot: "bg-green-500", bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-900 dark:text-green-200" },
};

function riskColor(r: number) {
  if (r >= 0.7) return { text: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 dark:bg-red-500/20", label: "Высокий риск 🔴" };
  if (r >= 0.4) return { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 dark:bg-amber-500/20", label: "Средний риск 🟡" };
  return { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 dark:bg-emerald-500/20", label: "Низкий риск 🟢" };
}

interface StatCardProps {
  emoji: string;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
  subColor?: string;
}

function StatCard({ emoji, iconBg, label, value, sub, subColor }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-4xl font-black tabular-nums text-foreground">{value}</p>
            <p className={`mt-1 text-xs font-medium ${subColor ?? "text-muted-foreground"}`}>{sub}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${iconBg}`}>
            {emoji}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  analysis: ClaudeAnalysis;
  nameMap: NameMap;
}

export function DepartmentSummary({ analysis, nameMap }: Props) {
  const { department, hiring_forecast } = analysis;
  const rc = riskColor(department.avg_burnout_risk);
  const rn = (text: string) => resolveNames(text, nameMap);
  const actions = buildActions(analysis, nameMap);

  return (
    <div className="flex flex-col gap-5">
      {/* Top KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          emoji="🔥"
          iconBg="bg-red-500/15"
          label="Средний риск выгорания"
          value={`${Math.round(department.avg_burnout_risk * 100)}%`}
          sub={rc.label}
          subColor={rc.text}
        />
        <StatCard
          emoji="⚠️"
          iconBg="bg-amber-500/15"
          label="В зоне риска"
          value={String(department.high_risk_count)}
          sub="сотрудников требуют внимания"
          subColor="text-amber-500 dark:text-amber-400"
        />
        <StatCard
          emoji="👥"
          iconBg="bg-blue-500/15"
          label="Рекомендованный найм"
          value={`+${hiring_forecast.needed_hires_next_quarter}`}
          sub="позиций в след. квартале"
          subColor="text-blue-500 dark:text-blue-400"
        />
      </div>

      {/* Narrative */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            📋 Общий диагноз отдела
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-foreground/90">{rn(department.narrative)}</p>

          {department.key_observations.length > 0 && (
            <div className="flex flex-col gap-2">
              {department.key_observations.map((obs, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="mt-0.5 shrink-0 text-primary">→</span>
                  <span>{rn(obs)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm dark:border-blue-900 dark:bg-blue-950/40">
            <span className="shrink-0">🎯</span>
            <div>
              <span className="font-semibold">Прогноз найма: </span>
              {rn(hiring_forecast.justification)}
            </div>
          </div>

          {/* Recommended actions */}
          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Рекомендуемые действия
            </p>
            {actions.map((action, i) => {
              const s = ACTION_STYLE[action.priority];
              return (
                <div key={i} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm ${s.bg} ${s.text}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <span>{action.text}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
