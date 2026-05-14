import { z } from "zod";

// Clamp burnout_risk to [0, 1] regardless of what Claude returns
const RiskScore = z
  .number()
  .transform((v) => Math.max(0, Math.min(1, v)));

// Fuzzy-match overload_category — Claude sometimes returns "высокий риск" instead of "высокий"
const OverloadCategory = z
  .string()
  .transform((v): "низкий" | "средний" | "высокий" | "критический" => {
    const s = v.toLowerCase();
    if (s.includes("критич")) return "критический";
    if (s.includes("высок")) return "высокий";
    if (s.includes("средн")) return "средний";
    return "низкий";
  });

export const ClaudeEmployeeSchema = z.object({
  employee_id: z.string(),
  burnout_risk: RiskScore,
  overload_category: OverloadCategory,
  hiring_signal: z.boolean().default(false),
  key_drivers: z.array(z.string()).default([]),
  narrative: z.string().default(""),
  trend_direction: z.enum(["ухудшение", "стабильно", "улучшение"]).default("стабильно"),
  forecast_narrative: z.string().default(""),
});

export const ClaudeResponseSchema = z.object({
  department: z.object({
    avg_burnout_risk: RiskScore,
    high_risk_count: z
      .number()
      .transform((v) => Math.max(0, Math.round(v))),
    narrative: z.string().default(""),
    key_observations: z.array(z.string()).default([]),
  }),
  employees: z.array(ClaudeEmployeeSchema),
  hiring_forecast: z.object({
    needed_hires_next_quarter: z
      .number()
      .transform((v) => Math.max(0, Math.round(v))),
    justification: z.string().default(""),
  }),
});

export type ClaudeAnalysis = z.infer<typeof ClaudeResponseSchema>;
