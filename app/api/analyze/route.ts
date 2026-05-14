import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";

import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/claude";
import { ClaudeResponseSchema } from "@/lib/schemas";
import type { EmployeeFeatures, DepartmentStats } from "@/types/index";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RequestBody {
  employees: EmployeeFeatures[];
  department_stats: DepartmentStats;
}

/**
 * Вычисляет бенчмарки отдела из метрик сотрудников.
 * Нужны для сравнения в narrative.
 */
function calculateDepartmentBenchmarks(employees: EmployeeFeatures[]) {
  if (!employees.length) {
    return {
      avg_resolution_time: 4.4,
      avg_tickets_per_week: 2.8,
      p1_p2_percentage: 22,
      work_outside_hours_percentage: 15,
      avg_open_tickets: 3.5,
      sla_compliance_percent: 95,
    };
  }

  const metrics30d = employees.map((e) => e.window_30d);

  const avgResolutionTime =
    metrics30d.reduce((sum, m) => sum + (m.avg_execution_hours || 4.4), 0) /
    employees.length;

  const avgTicketsPerWeek =
    metrics30d.reduce((sum, m) => sum + (m.tickets_per_week || 0), 0) /
    employees.length;

  const avgP1P2Percentage =
    metrics30d.reduce((sum, m) => sum + (m.high_priority_share * 100 || 22), 0) /
    employees.length;

  const avgWorkOutsideHours =
    metrics30d.reduce(
      (sum, m) => sum + (m.after_hours_share * 100 || 15),
      0
    ) / employees.length;

  const avgOpenTickets =
    metrics30d.reduce((sum, m) => sum + (m.open_tickets_count || 3.5), 0) /
    employees.length;

  return {
    avg_resolution_time: Math.round(avgResolutionTime * 10) / 10,
    avg_tickets_per_week: Math.round(avgTicketsPerWeek * 10) / 10,
    p1_p2_percentage: Math.round(avgP1P2Percentage),
    work_outside_hours_percentage: Math.round(avgWorkOutsideHours),
    avg_open_tickets: Math.round(avgOpenTickets * 10) / 10,
    sla_compliance_percent: 95,
  };
}

/**
 * Проверяет качество narrative по правилам.
 * Возвращает предупреждения если нарушены правила.
 */
function validateNarrativeQuality(
  narrative: string
): { warnings: string[]; quality_score: number } {
  const warnings: string[] = [];
  let quality_score = 100;

  // Правило 1: Должны быть конкретные цифры
  if (!narrative.match(/\d+/)) {
    warnings.push("Narrative не содержит конкретные цифры");
    quality_score -= 20;
  }

  // Правило 2: Должна быть ссылка на норму отдела (при норме / в норме отдела)
  if (!narrative.match(/при\s+норме|в\s+норме|норм[а-яё]+\s+отдела/i)) {
    warnings.push("Narrative не содержит сравнение с нормой отдела");
    quality_score -= 15;
  }

  // Правило 3: Не должно быть "нужно", "необходимо" без смягчения
  if (narrative.match(/\bнужно\b|\bнеобходимо\b/i) && 
      !narrative.match(/рекомендуется|стоит|рассмотреть/i)) {
    warnings.push('Narrative звучит как приказ ("нужно") вместо рекомендации');
    quality_score -= 15;
  }

  // Правило 4: Если есть тренд, должен быть переведен в часы/минуты
  if (narrative.match(/тренд\s*[+-]\d/i) && 
      !narrative.match(/час|минут|неделю|месяц/i)) {
    warnings.push("Тренд не переведен в понятные единицы (часы/минуты)");
    quality_score -= 10;
  }

  // Правило 5: Для красного риска (>70%) должны быть Action Items
  if (narrative.includes("критический сигнал") || narrative.includes("срочное")) {
    if (!narrative.match(/рекомендуется|действие|оценить|провести/i)) {
      warnings.push("Критический риск без рекомендуемых действий");
      quality_score -= 10;
    }
  }

  // Правило 6: Для аномалий должно быть объяснение
  if (narrative.includes("аномалия") || narrative.includes("парадокс")) {
    if (!narrative.match(/возможно|может|проверить/i)) {
      warnings.push("Аномалия указана, но нет объяснения или рекомендации");
      quality_score -= 10;
    }
  }

  return { warnings, quality_score: Math.max(0, quality_score) };
}

/**
 * Обогащает ответ Claude дополнительными метаданными.
 */
function enrichResponse(
  raw: unknown,
  benchmarks: ReturnType<typeof calculateDepartmentBenchmarks>
) {
  if (typeof raw !== "object" || raw === null) return raw;

  const response = raw as Record<string, any>;

  // Добавляем benchmarks в department если их нет
  if (response.department && !response.department.benchmarks) {
    response.department.benchmarks = benchmarks;
  }

  // Валидируем quality narrative для каждого сотрудника
  if (Array.isArray(response.employees)) {
    response.employees = response.employees.map((emp: Record<string, any>) => {
      const { warnings, quality_score } = validateNarrativeQuality(
        emp.narrative || ""
      );
      return {
        ...emp,
        _metadata: {
          narrative_quality_score: quality_score,
          narrative_warnings: warnings,
        },
      };
    });
  }

  // Добавляем общую дату анализа
  response._analysis_metadata = {
    timestamp: new Date().toISOString(),
    model: "claude-haiku-4-5-20251001",
    rules_applied: [
      "trend_translation", // Коэффициенты → часы/минуты
      "benchmarking", // Сравнение с нормой
      "paradox_detection", // Выявление парадоксов
      "tone_softening", // Смягчение тона
      "sla_context", // Бизнес-контекст
    ],
  };

  return response;
}

/**
 * Extract the first JSON object from a string.
 * Handles markdown code blocks, leading text, trailing commentary.
 */
function extractJson(text: string): unknown {
  // Try straightforward parse first
  try {
    return JSON.parse(text.trim());
  } catch { /* fall through */ }

  // Strip markdown fences (```json ... ``` or ``` ... ```)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch { /* fall through */ }
  }

  // Find the outermost JSON object by bracket counting
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in Claude response");

  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error("Unclosed JSON object in Claude response");

  return JSON.parse(text.slice(start, end + 1));
}

async function callClaude(body: RequestBody): Promise<unknown> {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(body) }],
  });

  if (msg.content[0].type !== "text") {
    throw new Error("Claude returned non-text content");
  }
  if (msg.stop_reason === "max_tokens") {
    throw new Error("Claude response was cut off — ответ слишком длинный, попробуй уменьшить число сотрудников");
  }
  const text = msg.content[0].text;
  console.log("[analyze] raw Claude output (first 300 chars):", text.slice(0, 300));
  return extractJson(text);
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.employees?.length) {
    return NextResponse.json({ error: "No employees provided" }, { status: 400 });
  }

  // Вычисляем бенчмарки отдела один раз
  const departmentBenchmarks = calculateDepartmentBenchmarks(body.employees);
  console.log("[analyze] department benchmarks calculated:", departmentBenchmarks);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callClaude(body);

      // Обогащаем ответ бенчмарками и метаданными
      const enriched = enrichResponse(raw, departmentBenchmarks);

      // Валидируем по Zod схеме
      const parsed = ClaudeResponseSchema.parse(enriched);

      // Логируем качество ответов (для аналитики)
      if (Array.isArray(parsed.employees)) {
        const avgQualityScore =
          parsed.employees.reduce((sum, emp: any) => {
            return sum + (emp._metadata?.narrative_quality_score || 100);
          }, 0) / parsed.employees.length;

        console.log(
          `[analyze] quality score: ${Math.round(avgQualityScore)}% (${parsed.employees.length} employees)`
        );

        // Логируем warning'и если они есть
        const warningsList = parsed.employees.flatMap(
          (emp: any) => emp._metadata?.narrative_warnings || []
        );
        if (warningsList.length > 0) {
          console.warn("[analyze] narrative warnings:", warningsList);
        }
      }

      return NextResponse.json(parsed);
    } catch (err) {
      let msg =
        err instanceof ZodError
          ? `Схема ответа не совпала: ${err.issues
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join("; ")}`
          : err instanceof Error
          ? err.message
          : String(err);

      // Make billing error human-readable
      if (msg.includes("credit balance is too low")) {
        msg = "Недостаточно средств на счёте Anthropic. Пополните баланс на console.anthropic.com → Billing.";
      } else if (
        msg.includes("invalid_api_key") ||
        msg.includes("authentication")
      ) {
        msg = "Неверный API-ключ. Проверьте ANTHROPIC_API_KEY в файле .env.local.";
      }
      console.error(`[analyze] attempt ${attempt + 1} failed:`, msg);

      if (attempt === 1) {
        return NextResponse.json(
          { error: `Анализ не удался: ${msg}` },
          { status: 502 }
        );
      }
    }
  }

  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}