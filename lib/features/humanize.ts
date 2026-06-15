/**
 * Этап 1 анализа: детерминированное предвычисление всех метрик в человекочитаемый вид.
 * Claude получает ТОЛЬКО эти готовые факты — никакой арифметики на стороне LLM.
 */

import type { EmployeeFeatures, FeatureValues } from "@/types/index";

// ── Типы ─────────────────────────────────────────────────────────────────────

export interface EmployeeFactSheet {
  employee_id: string;

  execution: {
    month: string;       // "28 мин." / "2 ч. 15 мин."
    quarter: string;
    delta: string;       // "+15 мин. к уровню 3 мес." / "без изменений"
    trend_per_week: string;   // "+4 мин./нед."
    forecast_4w: string;      // "через 4 нед.: +16 мин."
  };

  workload: {
    per_week_month: string;   // "3.2 тик./нед."
    per_week_quarter: string;
    dept_avg: string;         // "2.1 тик./нед. (среднее по отделу)"
    overload_vs_avg: string;  // "+52% от нормы" / "в норме"
  };

  priorities: {
    high_pct: string;         // "28% тикетов P1–P2"
  };

  after_hours: {
    month_pct: string;        // "67%"
    quarter_pct: string;
    dept_avg_pct: string;     // "18% (среднее по отделу)"
    is_elevated: boolean;
  };

  activity: {
    gaps: number;
    open_tickets: number;
    contacts: number;
    diversity: string;        // "узкая специализация" / ...
  };

  // Детерминированные оценки (вычислены в JS — BINDING, Claude не меняет)
  computed: {
    trend_direction: "ухудшение" | "стабильно" | "улучшение";
    burnout_risk: number;       // 0..1 — финальное значение, JS формула
    overload_category: "низкий" | "средний" | "высокий" | "критический";
    paradoxes: string[];
  };
}

// ── Форматтеры ────────────────────────────────────────────────────────────────

function fmtHours(h: number): string {
  if (h <= 0) return "< 1 мин.";
  if (h < 1) return `${Math.round(h * 60)} мин.`;
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (h >= 8) return `${(h / 8).toFixed(1)} раб. дн.`;
  if (mins === 0) return `${hrs} ч.`;
  return `${hrs} ч. ${mins} мин.`;
}

function fmtSlope(slope: number): { perWeek: string; in4weeks: string } {
  const minsPerWeek = Math.round(slope * 60);
  if (Math.abs(minsPerWeek) < 1) {
    return { perWeek: "< 1 мин./нед. (стабильно)", in4weeks: "без изменений" };
  }
  const sign = minsPerWeek > 0 ? "+" : "";
  return {
    perWeek: `${sign}${minsPerWeek} мин./нед.`,
    in4weeks: `${sign}${minsPerWeek * 4} мин.`,
  };
}

function fmtPct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function fmtEntropy(e: number): string {
  if (e < 1.5) return "узкая специализация";
  if (e < 2.5) return "умеренное разнообразие задач";
  return "широкий спектр задач";
}

/** Русское склонение числительного: 1 тикет / 2 тикета / 5 тикетов */
export function fmtCount(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} ${many}`;
  if (mod10 === 1) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

/**
 * Единый читаемый форматтер для каждой из 11 метрик.
 * Используется и в Claude-промпте, и в UI — один источник правды.
 */
export function fmtFeatureValue(key: keyof import("@/types/index").FeatureValues, value: number): string {
  switch (key) {
    case "tickets_per_week":
      return `${value.toFixed(1)} тик./нед.`;
    case "avg_response_min":
      return value < 60
        ? `${Math.round(value)} мин.`
        : `${(value / 60).toFixed(1)} ч.`;
    case "avg_execution_hours":
      return fmtHours(value);
    case "execution_trend_slope":
      return fmtSlope(value).perWeek;
    case "high_priority_share":
      return `${fmtPct(value)} тикетов P1–P2`;
    case "after_hours_share":
      return `${fmtPct(value)} вне рабочих часов`;
    case "task_entropy":
      return fmtEntropy(value);
    case "activity_gaps_count":
      return fmtCount(Math.round(value), "разрыв", "разрыва", "разрывов");
    case "unique_contacts":
      return fmtCount(Math.round(value), "контакт", "контакта", "контактов");
    case "open_tickets_count":
      return fmtCount(Math.round(value), "открытый тикет", "открытых тикета", "открытых тикетов");
    case "avg_description_length":
      return `${Math.round(value)} симв.`;
  }
}

// ── Детерминированные оценки ─────────────────────────────────────────────────

function computeTrendDirection(
  w30: FeatureValues,
  w90: FeatureValues
): "ухудшение" | "стабильно" | "улучшение" {
  let score = 0;

  // Время выполнения
  if (w90.avg_execution_hours > 0) {
    const d = (w30.avg_execution_hours - w90.avg_execution_hours) / w90.avg_execution_hours;
    if (d > 0.25) score += 2;
    else if (d > 0.10) score += 1;
    else if (d < -0.10) score -= 1;
    else if (d < -0.25) score -= 2;
  }

  // Наклон тренда
  if (w30.execution_trend_slope > 0.10) score += 2;
  else if (w30.execution_trend_slope > 0.04) score += 1;
  else if (w30.execution_trend_slope < -0.04) score -= 1;

  // Нерабочее время
  const afterDelta = w30.after_hours_share - w90.after_hours_share;
  if (afterDelta > 0.10) score += 1;
  else if (afterDelta < -0.10) score -= 1;

  if (score >= 2) return "ухудшение";
  if (score <= -2) return "улучшение";
  return "стабильно";
}

function computeRiskHint(
  w30: FeatureValues,
  w90: FeatureValues,
  deptAvgTickets: number
): number {
  let risk = 0;

  if (w30.after_hours_share > 0.35) risk += 0.25;
  else if (w30.after_hours_share > 0.20) risk += 0.15;
  else if (w30.after_hours_share > 0.10) risk += 0.07;

  if (w30.execution_trend_slope > 0.15) risk += 0.25;
  else if (w30.execution_trend_slope > 0.05) risk += 0.13;

  if (w30.activity_gaps_count >= 5) risk += 0.15;
  else if (w30.activity_gaps_count >= 3) risk += 0.08;

  if (w90.avg_execution_hours > 0) {
    const d = (w30.avg_execution_hours - w90.avg_execution_hours) / w90.avg_execution_hours;
    if (d > 0.35) risk += 0.15;
    else if (d > 0.15) risk += 0.08;
  }

  if (w30.open_tickets_count > 8) risk += 0.10;
  else if (w30.open_tickets_count > 5) risk += 0.05;

  if (deptAvgTickets > 0 && w30.tickets_per_week > deptAvgTickets * 1.8) risk += 0.10;

  return Math.min(0.93, Math.max(0.03, risk));
}

function computeOverloadHint(
  w30: FeatureValues,
  deptAvgTickets: number
): "низкий" | "средний" | "высокий" | "критический" {
  const ratio = deptAvgTickets > 0 ? w30.tickets_per_week / deptAvgTickets : 1;
  const highPrio = w30.high_priority_share;
  const open = w30.open_tickets_count;

  let score = 0;
  if (ratio > 2.0) score += 3;
  else if (ratio > 1.5) score += 2;
  else if (ratio > 1.2) score += 1;

  if (highPrio > 0.4) score += 2;
  else if (highPrio > 0.25) score += 1;

  if (open > 8) score += 2;
  else if (open > 4) score += 1;

  if (score >= 5) return "критический";
  if (score >= 3) return "высокий";
  if (score >= 1) return "средний";
  return "низкий";
}

function detectParadoxes(w30: FeatureValues, w90: FeatureValues): string[] {
  const out: string[] = [];

  // Парадокс A: разрывы + нерабочее время
  if (w30.activity_gaps_count >= 3 && w30.after_hours_share > 0.20) {
    out.push(
      `⚠️ Аномалия: ${w30.activity_gaps_count} разрыва(-ов) активности, ` +
      `но при этом ${fmtPct(w30.after_hours_share)} работы вне рабочего времени. ` +
      `Возможно: удалённая работа или некорректное логирование — рекомендуется уточнить у руководителя.`
    );
  }

  // Парадокс B: рост нагрузки без деградации скорости
  if (
    w90.tickets_per_week > 0 &&
    w30.tickets_per_week > w90.tickets_per_week * 1.30 &&
    w90.avg_execution_hours > 0 &&
    Math.abs(w30.avg_execution_hours - w90.avg_execution_hours) / w90.avg_execution_hours < 0.10
  ) {
    out.push(
      `✅ Положительный сигнал: нагрузка выросла (${w30.tickets_per_week.toFixed(1)} vs ` +
      `${w90.tickets_per_week.toFixed(1)} тик./нед.), но время выполнения стабильно ` +
      `(${fmtHours(w30.avg_execution_hours)}). Сотрудник хорошо справляется с ростом нагрузки.`
    );
  }

  // Парадокс C: много открытых P1 при низкой доле P1 в текущих
  if (w30.open_tickets_count > 5 && w30.high_priority_share < 0.10) {
    out.push(
      `⚠️ Критичные тикеты накапливаются (${w30.open_tickets_count} незакрытых), ` +
      `хотя текущий поток не высокоприоритетный (${fmtPct(w30.high_priority_share)} P1–P2). ` +
      `Рекомендуется проверить причины накопления открытых задач.`
    );
  }

  return out;
}

// ── Публичный API ─────────────────────────────────────────────────────────────

export interface DeptAverages {
  tickets_per_week: number;
  after_hours_share: number;
}

/**
 * Строит факт-лист сотрудника с предвычисленными человекочитаемыми значениями.
 * Все арифметические операции выполняются здесь (JS), не в LLM.
 */
export function humanizeEmployee(
  emp: EmployeeFeatures,
  dept: DeptAverages
): EmployeeFactSheet {
  const w30 = emp.window_30d;
  const w90 = emp.window_90d;

  const slope = fmtSlope(w30.execution_trend_slope);

  const execDeltaMin =
    w90.avg_execution_hours > 0
      ? Math.round((w30.avg_execution_hours - w90.avg_execution_hours) * 60)
      : null;

  const execDelta =
    execDeltaMin === null
      ? "нет данных за 3 мес."
      : Math.abs(execDeltaMin) < 3
      ? "без изменений"
      : `${execDeltaMin > 0 ? "+" : ""}${execDeltaMin} мин. к уровню 3 мес.`;

  const overloadPct =
    dept.tickets_per_week > 0
      ? Math.round(((w30.tickets_per_week - dept.tickets_per_week) / dept.tickets_per_week) * 100)
      : 0;

  const overloadLabel =
    overloadPct > 50
      ? `+${overloadPct}% выше нормы отдела`
      : overloadPct < -20
      ? `${overloadPct}% ниже нормы отдела`
      : "в норме отдела";

  return {
    employee_id: emp.employee_id,

    execution: {
      month: fmtHours(w30.avg_execution_hours),
      quarter: fmtHours(w90.avg_execution_hours),
      delta: execDelta,
      trend_per_week: slope.perWeek,
      forecast_4w: slope.in4weeks,
    },

    workload: {
      per_week_month: `${w30.tickets_per_week.toFixed(1)} тик./нед.`,
      per_week_quarter: `${w90.tickets_per_week.toFixed(1)} тик./нед.`,
      dept_avg: `${dept.tickets_per_week.toFixed(1)} тик./нед. (ср. по отделу)`,
      overload_vs_avg: overloadLabel,
    },

    priorities: {
      high_pct: `${fmtPct(w30.high_priority_share)} тикетов P1–P2`,
    },

    after_hours: {
      month_pct: fmtPct(w30.after_hours_share),
      quarter_pct: fmtPct(w90.after_hours_share),
      dept_avg_pct: `${fmtPct(dept.after_hours_share)} (ср. по отделу)`,
      is_elevated: w30.after_hours_share > Math.max(0.15, dept.after_hours_share * 1.3),
    },

    activity: {
      gaps: w30.activity_gaps_count,
      open_tickets: w30.open_tickets_count,
      contacts: w30.unique_contacts,
      diversity: fmtEntropy(w30.task_entropy),
    },

    computed: {
      trend_direction: computeTrendDirection(w30, w90),
      burnout_risk: computeRiskHint(w30, w90, dept.tickets_per_week),
      overload_category: computeOverloadHint(w30, dept.tickets_per_week),
      paradoxes: detectParadoxes(w30, w90),
    },
  };
}

/**
 * Вычисляет средние по отделу для использования как бенчмарк.
 */
export function computeDeptAverages(employees: EmployeeFeatures[]): DeptAverages {
  if (!employees.length) return { tickets_per_week: 2.5, after_hours_share: 0.15 };
  const n = employees.length;
  return {
    tickets_per_week:
      employees.reduce((s, e) => s + e.window_30d.tickets_per_week, 0) / n,
    after_hours_share:
      employees.reduce((s, e) => s + e.window_30d.after_hours_share, 0) / n,
  };
}
