import type { DepartmentStats } from "@/types/index";
import type { EmployeeFactSheet } from "@/lib/features/humanize";

// ── Системный промпт ─────────────────────────────────────────────────────────
// Claude в этой архитектуре делает ТОЛЬКО одно: пишет текст.
// Все числа, оценки рисков и тренды уже вычислены в JS и переданы как факты.

export const SYSTEM_PROMPT = `Ты — HR-аналитик, специализирующийся на интерпретации поведенческих данных из ITSM-систем.

## ТВОЯ ЕДИНСТВЕННАЯ ЗАДАЧА

Написать понятные текстовые пояснения (narrative) на основе готовых фактов.
Все числа и оценки уже вычислены до тебя детерминированной формулой.

## ПРАВИЛО №1 — НЕ ИЗМЕНЯЙ BINDING-ЗНАЧЕНИЯ

В разделе PRE-COMPUTED каждого сотрудника есть три поля — они ФИНАЛЬНЫЕ:

  burnout_risk      ← поставь это значение в JSON как есть (например: 0.74)
  overload_category ← поставь это значение в JSON как есть (например: "высокий")
  trend_direction   ← поставь это значение в JSON как есть (например: "ухудшение")

Эти значения вычислены верифицированной формулой. Не округляй, не корректируй, не спорь.
Если тебе кажется что число неправильное — всё равно используй его и объясни его в narrative.

## ПРАВИЛО №2 — НЕ ИЗОБРЕТАЙ ЧИСЛА

Все цифры в narrative берутся ТОЛЬКО из раздела ФАКТЫ каждого сотрудника.
Если факт гласит "67%" — пиши "67%", не "около 70%" и не "примерно две трети".
Если факт гласит "+4 мин./нед." — пиши "+4 мин./нед.", не "незначительный рост".

## ПРАВИЛО №3 — АНОМАЛИИ

Если в разделе ОБНАРУЖЕННЫЕ АНОМАЛИИ есть записи — включи их содержание в narrative.
Не переформулируй суть аномалии, только добавь контекст.

## КАК ПИСАТЬ NARRATIVE

Стиль по уровню burnout_risk:
  < 0.40: "динамика стабильная", "показатели в пределах нормы отдела"
  0.40–0.70: "появляются признаки", "рекомендуется мониторить", "стоит обратить внимание"
  > 0.70: "критический сигнал", "рекомендуется оценить необходимость действий"

Никогда: "нужно сделать X" — всегда: "рекомендуется оценить X"
Грамматический род: только мужской (сотрудник, специалист, он).
Forecast: используй поле execution.forecast_4w как числовую основу прогноза.

## ФОРМАТ ОТВЕТА

Только валидный JSON без markdown-обёрток. Никакого текста до или после.`;

// ── Схема ответа ──────────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = `{
  "department": {
    "avg_burnout_risk": <среднее burnout_risk по всем сотрудникам>,
    "high_risk_count": <число сотрудников с burnout_risk >= 0.7>,
    "narrative": "<3-4 предложения: общий диагноз с конкретными цифрами>",
    "key_observations": ["<наблюдение с числом>", "...до 5 штук"]
  },
  "employees": [
    {
      "employee_id": "<идентификатор из факт-листа>",
      "burnout_risk": <BINDING — значение из PRE-COMPUTED.burnout_risk>,
      "overload_category": "<BINDING — значение из PRE-COMPUTED.overload_category>",
      "hiring_signal": <true если overload критический + тренд роста нагрузки>,
      "key_drivers": ["<фактор: точная цифра из факт-листа>", "...2-4 штуки"],
      "narrative": "<2-3 предложения с числами из факт-листа>",
      "trend_direction": "<BINDING — значение из PRE-COMPUTED.trend_direction>",
      "forecast_narrative": "<1-2 предложения: используй execution.forecast_4w>"
    }
  ],
  "hiring_forecast": {
    "needed_hires_next_quarter": <целое число>,
    "justification": "<1-2 предложения с конкретными числами>"
  }
}`;

// ── Рендер факт-листа ─────────────────────────────────────────────────────────

function renderFactSheet(f: EmployeeFactSheet): string {
  const anomalyBlock =
    f.computed.paradoxes.length > 0
      ? `\nОБНАРУЖЕННЫЕ АНОМАЛИИ (включи в narrative):\n${f.computed.paradoxes.map((p) => `  • ${p}`).join("\n")}`
      : "";

  return `
=== Сотрудник: ${f.employee_id} ===

ВРЕМЯ ВЫПОЛНЕНИЯ:
  Месяц:        ${f.execution.month}
  3 месяца:     ${f.execution.quarter}
  Изменение:    ${f.execution.delta}
  Тренд:        ${f.execution.trend_per_week}
  Прогноз +4н:  ${f.execution.forecast_4w}

НАГРУЗКА:
  Тик./нед. (месяц):   ${f.workload.per_week_month}  [${f.workload.overload_vs_avg}]
  Тик./нед. (3 мес.):  ${f.workload.per_week_quarter}
  Норма отдела:        ${f.workload.dept_avg}
  Доля P1–P2:          ${f.priorities.high_pct}
  Открытых тикетов:    ${f.activity.open_tickets}

ПРИЗНАКИ ВЫГОРАНИЯ:
  Нерабочее время (месяц):  ${f.after_hours.month_pct}  [норма: ${f.after_hours.dept_avg_pct}]
  Нерабочее время (3 мес.): ${f.after_hours.quarter_pct}
  Превышает норму:          ${f.after_hours.is_elevated ? "ДА" : "нет"}
  Разрывы активности:       ${f.activity.gaps}
  Уникальных контактов:     ${f.activity.contacts}
  Специализация:            ${f.activity.diversity}

PRE-COMPUTED — BINDING (используй эти значения в JSON без изменений):
  burnout_risk:      ${f.computed.burnout_risk.toFixed(2)}
  overload_category: ${f.computed.overload_category}
  trend_direction:   ${f.computed.trend_direction}${anomalyBlock}
`.trim();
}

// ── User prompt ───────────────────────────────────────────────────────────────

export function buildUserPrompt(body: {
  factSheets: EmployeeFactSheet[];
  department_stats: DepartmentStats;
}): string {
  const factsBlock = body.factSheets.map(renderFactSheet).join("\n\n");

  return `Период: ${body.department_stats.period_start} — ${body.department_stats.period_end}
Сотрудников: ${body.department_stats.employee_count} | Тикетов: ${body.department_stats.total_tickets}

ОБЯЗАТЕЛЬНО:
• burnout_risk, overload_category, trend_direction — бери из PRE-COMPUTED, не меняй
• Все числа в тексте — только из раздела ФАКТЫ каждого сотрудника
• Аномалии из раздела ОБНАРУЖЕННЫЕ АНОМАЛИИ — включи в narrative

${factsBlock}

Верни ТОЛЬКО валидный JSON:
${RESPONSE_SCHEMA}`;
}
