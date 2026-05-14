"use client";

import {
  Document, Page, Text, View, StyleSheet, pdf, Font,
  Svg, Rect, Line, Polyline, Circle, Path,
} from "@react-pdf/renderer";
import type { ClaudeAnalysis } from "@/lib/schemas";
import type { EmployeeFeatures, FeatureValues, NameMap } from "@/types/index";
import { resolveNames } from "@/lib/resolveNames";

Font.register({
  family: "Roboto",
  fonts: [
    { src: "/fonts/Roboto-Regular.woff", fontWeight: "normal" },
    { src: "/fonts/Roboto-Bold.woff", fontWeight: "bold" },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

// ── Colour palette ───────────────────────────────────────────────────────────
const C = {
  primary:  "#1e40af",
  bg:       "#f8fafc",
  border:   "#e2e8f0",
  muted:    "#64748b",
  text:     "#0f172a",
  white:    "#ffffff",
  rHigh:    "#dc2626",
  rMid:     "#d97706",
  rLow:     "#16a34a",
  chartBar: "#3b82f6",
  chartLine:"#ef4444",
  chartGrid:"#e2e8f0",
};

const ovColor = (c: string) =>
  ({ критический: C.rHigh, высокий: "#ea580c", средний: C.rMid, низкий: C.rLow }[c] ?? C.muted);
const rvColor = (r: number) => (r >= 0.7 ? C.rHigh : r >= 0.4 ? C.rMid : C.rLow);

const B = { fontFamily: "Roboto", fontWeight: "bold" } as const;

const METRIC_LABELS: Record<keyof FeatureValues, string> = {
  tickets_per_week:       "Тикетов в неделю",
  avg_response_min:       "Время реакции (мин)",
  avg_execution_hours:    "Время выполнения (ч)",
  execution_trend_slope:  "Тренд выполнения",
  high_priority_share:    "Доля P1–P2",
  after_hours_share:      "Работа вне часов",
  task_entropy:           "Разнообразие задач",
  activity_gaps_count:    "Разрывы активности",
  unique_contacts:        "Уникальных контактов",
  open_tickets_count:     "Открытых тикетов",
  avg_description_length: "Длина описания (символы)",
};

const METRIC_KEYS = Object.keys(METRIC_LABELS) as (keyof FeatureValues)[];

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    color: C.text,
    backgroundColor: C.white,
    paddingTop: 36,
    paddingBottom: 64,
    paddingHorizontal: 40,
  },
  footer: {
    position: "absolute",
    bottom: 20, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 5,
  },
  footerText: { fontSize: 7, color: C.muted, textAlign: "center", lineHeight: 1.5 },

  // page header
  pageHdr:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
  pageTitle:{ fontSize: 17, ...B, color: C.primary },
  pageSub:  { fontSize: 8,  color: C.muted, marginTop: 3 },
  pageDate: { fontSize: 11, ...B, color: C.primary },
  pageDateSub: { fontSize: 7.5, color: C.muted, marginTop: 1 },
  divider:  { borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 16 },

  sectionTitle: { fontSize: 11, ...B, color: C.primary, marginBottom: 8, marginTop: 4 },

  // KPI
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiBox: { flex: 1, backgroundColor: C.bg, borderRadius: 5, padding: 10, borderWidth: 1, borderColor: C.border },
  kpiLbl: { fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  kpiVal: { fontSize: 20, ...B, marginBottom: 2 },
  kpiSub: { fontSize: 7.5 },

  infoBox:  { backgroundColor: C.bg, borderRadius: 5, padding: 11, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  infoText: { fontSize: 9, lineHeight: 1.6 },

  obsItem:  { flexDirection: "row", gap: 6, marginBottom: 5 },
  obsBullet:{ color: C.primary, ...B, fontSize: 9 },
  obsText:  { fontSize: 9, lineHeight: 1.5, flex: 1 },

  forecastBox: {
    flexDirection: "row", gap: 12, backgroundColor: "#eff6ff",
    borderRadius: 5, padding: 11, marginBottom: 20,
    borderWidth: 1, borderColor: "#bfdbfe",
  },
  forecastNum:  { fontSize: 26, ...B, color: C.primary, width: 46, textAlign: "center" },
  forecastText: { flex: 1, fontSize: 9, lineHeight: 1.6 },

  // summary table
  tHead: { flexDirection: "row", backgroundColor: C.primary, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 2 },
  tHCell:{ color: C.white, ...B, fontSize: 8 },
  tRow:  { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  tRowA: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },

  // employee profile
  empSep:  { borderTopWidth: 2, borderTopColor: C.primary, marginTop: 20, marginBottom: 10, opacity: 0.2 },
  empName: { fontSize: 12, ...B, marginBottom: 6 },
  badgeRow:{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  badge:   { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, fontSize: 7.5, ...B, borderWidth: 1 },

  // two-column chart row
  chartRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  chartCol: { flex: 1 },
  chartLbl: { fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },

  // metric bars
  metricGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10, gap: 0 },
  metricItem: { width: "50%", paddingRight: 8, marginBottom: 5 },
  metricLbl:  { fontSize: 7, color: C.muted, marginBottom: 2 },
  metricTrack:{ height: 5, backgroundColor: C.border, borderRadius: 3 },
  metricFill: { height: 5, borderRadius: 3 },

  driversRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  driverChip: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },

  forecastMini:    { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", borderRadius: 4, padding: 7, marginTop: 6 },
  forecastMiniTxt: { fontSize: 8, lineHeight: 1.55, color: "#78350f" },

  hrNotesBox: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 4, padding: 8, marginTop: 8 },
  hrNotesLbl: { fontSize: 7, color: "#15803d", ...B, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  hrNotesTxt: { fontSize: 8.5, lineHeight: 1.6, color: "#166534" },

  sectionBreak: { fontSize: 14, ...B, color: C.primary, marginBottom: 12 },
});

// ── SVG Charts ───────────────────────────────────────────────────────────────

const CHART_W = 220;
const CHART_H = 70;
const PAD = { t: 4, r: 4, b: 18, l: 24 };
const IW = CHART_W - PAD.l - PAD.r;
const IH = CHART_H - PAD.t - PAD.b;

function BarChart({ data }: { data: { week: string; count: number }[] }) {
  const trim = data.slice(-10);
  const maxV = Math.max(1, ...trim.map((d) => d.count));
  const n = trim.length;
  const bw = (IW / n) * 0.6;
  const gap = IW / n;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* grid lines */}
      {[0, 0.5, 1].map((t) => {
        const y = PAD.t + IH * (1 - t);
        return <Line key={t} x1={PAD.l} y1={y} x2={PAD.l + IW} y2={y} stroke={C.chartGrid} strokeWidth={0.5} />;
      })}
      {/* bars */}
      {trim.map((d, i) => {
        const bh = (d.count / maxV) * IH;
        const x = PAD.l + i * gap + (gap - bw) / 2;
        const y = PAD.t + IH - bh;
        return <Rect key={i} x={x} y={y} width={bw} height={bh} fill={C.chartBar} rx={1.5} opacity={0.85} />;
      })}
      {/* y-axis */}
      <Line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke={C.border} strokeWidth={0.8} />
      {/* x-axis */}
      <Line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke={C.border} strokeWidth={0.8} />
      {/* y-axis max label */}
      <Path
        d={`M ${PAD.l - 2} ${PAD.t} L ${PAD.l + 2} ${PAD.t}`}
        stroke={C.muted}
        strokeWidth={0.5}
      />
    </Svg>
  );
}

function LineChart({ data }: { data: { week: string; avg_hours: number }[] }) {
  const trim = data.slice(-10);
  const vals = trim.map((d) => d.avg_hours);
  const maxV = Math.max(1, ...vals);
  const minV = Math.min(...vals);
  const range = maxV - minV || 1;
  const n = trim.length;

  if (n < 2) return <Svg width={CHART_W} height={CHART_H} />;

  const pts = vals.map((v, i) => {
    const x = PAD.l + (i / (n - 1)) * IW;
    const y = PAD.t + IH - ((v - minV) / range) * IH;
    return { x, y };
  });

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");

  // shaded area under line
  const areaD =
    `M ${pts[0].x},${PAD.t + IH} ` +
    pts.map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${pts[pts.length - 1].x},${PAD.t + IH} Z`;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* grid */}
      {[0, 0.5, 1].map((t) => {
        const y = PAD.t + IH * (1 - t);
        return <Line key={t} x1={PAD.l} y1={y} x2={PAD.l + IW} y2={y} stroke={C.chartGrid} strokeWidth={0.5} />;
      })}
      {/* area fill */}
      <Path d={areaD} fill={C.chartLine} opacity={0.08} />
      {/* line */}
      <Polyline points={polyline} stroke={C.chartLine} strokeWidth={1.5} fill="none" />
      {/* dots */}
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2} fill={C.chartLine} />
      ))}
      {/* axes */}
      <Line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke={C.border} strokeWidth={0.8} />
      <Line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke={C.border} strokeWidth={0.8} />
    </Svg>
  );
}

function MetricBars({
  values,
  maxValues,
}: {
  values: FeatureValues;
  maxValues: Record<keyof FeatureValues, number>;
}) {
  return (
    <View style={s.metricGrid}>
      {METRIC_KEYS.map((key) => {
        const ratio = Math.min(1, values[key] / (maxValues[key] || 1));
        const pct = `${Math.round(ratio * 100)}%`;
        const fillColor = ratio >= 0.75 ? C.rHigh : ratio >= 0.45 ? C.rMid : C.chartBar;
        return (
          <View key={key} style={s.metricItem}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.metricLbl}>{METRIC_LABELS[key]}</Text>
              <Text style={[s.metricLbl, { color: fillColor }]}>{pct}</Text>
            </View>
            <View style={s.metricTrack}>
              <View style={[s.metricFill, { width: pct, backgroundColor: fillColor }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Report document ──────────────────────────────────────────────────────────

interface ReportProps {
  analysis: ClaudeAnalysis;
  features: EmployeeFeatures[];
  nameMap: NameMap;
  periodStart: string;
  periodEnd: string;
  hrNotes: Map<string, string>;
}

function ReportDoc({ analysis, features, nameMap, periodStart, periodEnd, hrNotes }: ReportProps) {
  const rn = (t: string) => resolveNames(t, nameMap);
  const { department, hiring_forecast, employees } = analysis;
  const today = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  const rc = rvColor(department.avg_burnout_risk);
  const sorted = [...employees].sort((a, b) => b.burnout_risk - a.burnout_risk);

  // precompute max values across all employees for normalisation
  const maxValues = {} as Record<keyof FeatureValues, number>;
  for (const key of METRIC_KEYS) {
    maxValues[key] = Math.max(1, ...features.map((f) => f.window_90d[key]));
  }

  return (
    <Document title="HR-Agent — Аналитический отчёт" author="HR-Agent MVP">
      <Page size="A4" style={s.page}>

        {/* Fixed footer on every page */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Инструмент построен на концепции магистерской диссертации Прудникова Д., Esil University, 2026.
            Результаты носят рекомендательный характер; финальное кадровое решение остаётся за HR-менеджером.
          </Text>
        </View>

        {/* ── Section 1: Department overview ──────────────────────────────── */}
        <View style={s.pageHdr}>
          <View>
            <Text style={s.pageTitle}>HR-Agent — Аналитический отчёт</Text>
            <Text style={s.pageSub}>Период: {periodStart} — {periodEnd}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.pageDate}>{today}</Text>
            <Text style={s.pageDateSub}>Дата формирования</Text>
          </View>
        </View>
        <View style={s.divider} />

        <Text style={s.sectionTitle}>Показатели отдела</Text>
        <View style={s.kpiRow} wrap={false}>
          <View style={s.kpiBox}>
            <Text style={s.kpiLbl}>Средний риск выгорания</Text>
            <Text style={[s.kpiVal, { color: rc }]}>{Math.round(department.avg_burnout_risk * 100)}%</Text>
            <Text style={[s.kpiSub, { color: rc }]}>
              {rc === C.rHigh ? "Высокий риск" : rc === C.rMid ? "Средний риск" : "Низкий риск"}
            </Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLbl}>В зоне риска</Text>
            <Text style={[s.kpiVal, { color: C.rMid }]}>{department.high_risk_count}</Text>
            <Text style={[s.kpiSub, { color: C.muted }]}>сотрудников требуют внимания</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.kpiLbl}>Рекомендованный найм</Text>
            <Text style={[s.kpiVal, { color: C.primary }]}>+{hiring_forecast.needed_hires_next_quarter}</Text>
            <Text style={[s.kpiSub, { color: C.muted }]}>позиций в след. квартале</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Общий диагноз отдела</Text>
        <View style={s.infoBox}>
          <Text style={s.infoText}>{rn(department.narrative)}</Text>
        </View>

        {department.key_observations.length > 0 && (
          <View>
            <Text style={s.sectionTitle}>Ключевые наблюдения</Text>
            {department.key_observations.map((obs, i) => (
              <View key={i} style={s.obsItem}>
                <Text style={s.obsBullet}>→</Text>
                <Text style={s.obsText}>{rn(obs)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[s.sectionTitle, { marginTop: 12 }]}>Прогноз найма</Text>
        <View style={s.forecastBox} wrap={false}>
          <Text style={s.forecastNum}>+{hiring_forecast.needed_hires_next_quarter}</Text>
          <Text style={s.forecastText}>{rn(hiring_forecast.justification)}</Text>
        </View>

        <Text style={s.sectionTitle}>Сводная таблица сотрудников</Text>
        <View style={s.tHead} wrap={false}>
          <Text style={[s.tHCell, { flex: 2.5 }]}>Сотрудник</Text>
          <Text style={[s.tHCell, { flex: 1, textAlign: "center" }]}>Риск</Text>
          <Text style={[s.tHCell, { flex: 1.2, textAlign: "center" }]}>Перегрузка</Text>
          <Text style={[s.tHCell, { flex: 1, textAlign: "center" }]}>Тренд</Text>
          <Text style={[s.tHCell, { flex: 2.5 }]}>Ключевые факторы</Text>
        </View>
        {sorted.map((emp, i) => {
          const name = nameMap.get(emp.employee_id) ?? emp.employee_id.slice(0, 12) + "…";
          return (
            <View key={emp.employee_id} style={i % 2 === 0 ? s.tRow : s.tRowA} wrap={false}>
              <Text style={{ flex: 2.5, fontSize: 8 }}>{name}</Text>
              <Text style={{ flex: 1, textAlign: "center", fontSize: 8, ...B, color: rvColor(emp.burnout_risk) }}>
                {Math.round(emp.burnout_risk * 100)}%
              </Text>
              <Text style={{ flex: 1.2, textAlign: "center", fontSize: 8, color: ovColor(emp.overload_category) }}>
                {emp.overload_category}
              </Text>
              <Text style={{ flex: 1, textAlign: "center", fontSize: 8, color: C.muted }}>
                {emp.trend_direction ?? "—"}
              </Text>
              <Text style={{ flex: 2.5, fontSize: 7.5, color: C.muted }}>
                {emp.key_drivers.slice(0, 2).join("; ")}
              </Text>
            </View>
          );
        })}

        {/* ── Section 2: Individual profiles ──────────────────────────────── */}
        <Text style={[s.sectionBreak, { marginTop: 36 }]} break>
          Детальные профили сотрудников
        </Text>

        {sorted.map((emp) => {
          const name = nameMap.get(emp.employee_id) ?? emp.employee_id.slice(0, 12) + "…";
          const feat = features.find((f) => f.employee_id === emp.employee_id);

          return (
            <View key={emp.employee_id}>
              <View style={s.empSep} />

              {/* Name */}
              <Text style={s.empName}>{name}</Text>

              {/* Badges */}
              <View style={s.badgeRow}>
                <View style={[s.badge, { backgroundColor: rvColor(emp.burnout_risk) + "22", borderColor: rvColor(emp.burnout_risk) }]}>
                  <Text style={{ color: rvColor(emp.burnout_risk), fontSize: 7.5, ...B }}>
                    Риск выгорания: {Math.round(emp.burnout_risk * 100)}%
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: ovColor(emp.overload_category) + "22", borderColor: ovColor(emp.overload_category) }]}>
                  <Text style={{ color: ovColor(emp.overload_category), fontSize: 7.5, ...B }}>
                    {emp.overload_category}
                  </Text>
                </View>
                {emp.trend_direction && (
                  <View style={[s.badge, { backgroundColor: C.bg, borderColor: C.border }]}>
                    <Text style={{ color: C.muted, fontSize: 7.5, ...B }}>{emp.trend_direction}</Text>
                  </View>
                )}
                {emp.hiring_signal && (
                  <View style={[s.badge, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                    <Text style={{ color: C.primary, fontSize: 7.5, ...B }}>сигнал найма</Text>
                  </View>
                )}
              </View>

              {/* Narrative */}
              <Text style={[s.infoText, { marginBottom: 10 }]}>{rn(emp.narrative)}</Text>

              {/* Charts */}
              {feat && (
                <View style={s.chartRow}>
                  <View style={s.chartCol}>
                    <Text style={s.chartLbl}>Объём тикетов по неделям</Text>
                    <BarChart data={feat.weekly_volume} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
                      {feat.weekly_volume.slice(-10).filter((_, i, a) => i === 0 || i === Math.floor(a.length / 2) || i === a.length - 1).map((d) => (
                        <Text key={d.week} style={{ fontSize: 6, color: C.muted }}>{d.week.slice(5)}</Text>
                      ))}
                    </View>
                  </View>
                  <View style={s.chartCol}>
                    <Text style={s.chartLbl}>Тренд времени решения (часы)</Text>
                    <LineChart data={feat.weekly_execution} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
                      {feat.weekly_execution.slice(-10).filter((_, i, a) => i === 0 || i === Math.floor(a.length / 2) || i === a.length - 1).map((d) => (
                        <Text key={d.week} style={{ fontSize: 6, color: C.muted }}>{d.week.slice(5)}</Text>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Metric bars */}
              {feat && (
                <View>
                  <Text style={[s.chartLbl, { marginBottom: 6 }]}>Профиль метрик (90 дней, нормализовано по отделу)</Text>
                  <MetricBars values={feat.window_90d} maxValues={maxValues} />
                </View>
              )}

              {/* Key drivers */}
              {emp.key_drivers.length > 0 && (
                <View style={s.driversRow}>
                  {emp.key_drivers.map((d) => (
                    <View key={d} style={s.driverChip}>
                      <Text style={{ fontSize: 7.5, color: C.muted }}>{d}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Forecast */}
              {emp.forecast_narrative && (
                <View style={s.forecastMini}>
                  <Text style={s.forecastMiniTxt}>{rn(emp.forecast_narrative)}</Text>
                </View>
              )}

              {/* HR notes */}
              {hrNotes.get(emp.employee_id) && (
                <View style={s.hrNotesBox}>
                  <Text style={s.hrNotesLbl}>Заметки HR</Text>
                  <Text style={s.hrNotesTxt}>{hrNotes.get(emp.employee_id)}</Text>
                </View>
              )}
            </View>
          );
        })}

      </Page>
    </Document>
  );
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function downloadPdfReport(
  analysis: ClaudeAnalysis,
  features: EmployeeFeatures[],
  nameMap: NameMap,
  periodStart: string,
  periodEnd: string,
  hrNotes: Map<string, string> = new Map(),
) {
  const blob = await pdf(
    <ReportDoc
      analysis={analysis}
      features={features}
      nameMap={nameMap}
      periodStart={periodStart}
      periodEnd={periodEnd}
      hrNotes={hrNotes}
    />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hr-agent-report-${new Date().toISOString().split("T")[0]}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
