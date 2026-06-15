import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";

import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/claude";
import { ClaudeResponseSchema } from "@/lib/schemas";
import { humanizeEmployee, computeDeptAverages } from "@/lib/features/humanize";
import type { EmployeeFeatures, DepartmentStats } from "@/types/index";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RequestBody {
  employees: EmployeeFeatures[];
  department_stats: DepartmentStats;
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
  // ── Этап 1: детерминированное предвычисление (JS, без LLM) ──────────────────
  const deptAverages = computeDeptAverages(body.employees);
  const factSheets = body.employees.map((emp) => humanizeEmployee(emp, deptAverages));

  console.log(
    `[analyze] stage-1 complete: ${factSheets.length} fact-sheets, ` +
    `dept avg ${deptAverages.tickets_per_week.toFixed(1)} tpw / ` +
    `${Math.round(deptAverages.after_hours_share * 100)}% after-hours`
  );

  // ── Этап 2: Claude с Extended Thinking пишет нарративы ─────────────────────
  // Extended Thinking даёт Claude внутренний "буфер мыслей" перед финальным ответом.
  // Он там проверяет противоречия сам, прежде чем зафиксировать текст.
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: buildUserPrompt({ factSheets, department_stats: body.department_stats }),
    }],
  });

  if (msg.stop_reason === "max_tokens") {
    throw new Error("Claude response was cut off — попробуй уменьшить число сотрудников");
  }

  const firstBlock = msg.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error("Claude не вернул текстовый блок");
  }

  console.log("[analyze] raw output (first 300):", firstBlock.text.slice(0, 300));

  const raw = extractJson(firstBlock.text);

  // ── Этап 3: Принудительный override — JS-значения перезаписывают Claude ────
  // Даже если Claude отклонился от BINDING-значений, мы возвращаем верные.
  if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).employees)) {
    const employees = (raw as Record<string, unknown[]>).employees as Record<string, unknown>[];
    for (const emp of employees) {
      const sheet = factSheets.find((f) => f.employee_id === emp.employee_id);
      if (sheet) {
        const prev = { r: emp.burnout_risk, o: emp.overload_category, t: emp.trend_direction };
        emp.burnout_risk      = sheet.computed.burnout_risk;
        emp.overload_category = sheet.computed.overload_category;
        emp.trend_direction   = sheet.computed.trend_direction;
        const changed = prev.r !== emp.burnout_risk || prev.o !== emp.overload_category || prev.t !== emp.trend_direction;
        if (changed) {
          console.log(`[analyze] override ${emp.employee_id}: risk ${prev.r}→${emp.burnout_risk}, overload ${prev.o}→${emp.overload_category}, trend ${prev.t}→${emp.trend_direction}`);
        }
      }
    }
  }

  return raw;
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

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callClaude(body);
      const parsed = ClaudeResponseSchema.parse(raw);
      console.log(`[analyze] ok — ${parsed.employees.length} employees, avg risk ${parsed.department.avg_burnout_risk.toFixed(2)}`);
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