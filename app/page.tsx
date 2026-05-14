"use client";

import { useState } from "react";
import { Download, History, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { FileUploader } from "@/components/upload/FileUploader";
import { ParsePreview } from "@/components/upload/ParsePreview";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { CompareView } from "@/components/CompareView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HistoryPanel } from "@/components/HistoryPanel";
import { downloadPdfReport } from "@/components/PdfReport";
import { engineerFeatures } from "@/lib/features/engineer";
import { computeDepartmentInsights } from "@/lib/features/department";
import { Button } from "@/components/ui/button";
import type { Ticket, NameMap, EmployeeFeatures, DepartmentStats, HistoryRecord } from "@/types/index";
import type { ClaudeAnalysis } from "@/lib/schemas";
import type { DepartmentInsights } from "@/lib/features/department";

type Phase =
  | { name: "upload" }
  | { name: "preview"; tickets: Ticket[]; nameMap: NameMap; features: EmployeeFeatures[]; insights: DepartmentInsights }
  | { name: "analyzing"; tickets: Ticket[]; nameMap: NameMap; features: EmployeeFeatures[]; insights: DepartmentInsights }
  | { name: "dashboard"; nameMap: NameMap; features: EmployeeFeatures[]; analysis: ClaudeAnalysis; insights: DepartmentInsights }
  | { name: "compare"; older: HistoryRecord; newer: HistoryRecord; olderLabel: string; newerLabel: string };


export default function Home() {
  const [phase, setPhase] = useState<Phase>({ name: "upload" });
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleExportPdf() {
    if (phase.name !== "dashboard") return;
    setPdfLoading(true);
    try {
      const dates = phase.features.flatMap((f) =>
        f.weekly_volume.map((w) => w.week)
      ).sort();
      const start = dates[0] ?? "—";
      const end = dates[dates.length - 1] ?? "—";
      await downloadPdfReport(phase.analysis, phase.features, phase.nameMap, start, end);
    } finally {
      setPdfLoading(false);
    }
  }
  function handleParsed(tickets: Ticket[], nameMap: NameMap) {
    const features = engineerFeatures(tickets);
    const insights = computeDepartmentInsights(tickets, nameMap);
    setPhase({ name: "preview", tickets, nameMap, features, insights });
    setAnalyzeError(null);
  }

  async function handleAnalyze() {
    if (phase.name !== "preview") return;
    const { tickets, nameMap, features, insights } = phase;
    setPhase({ name: "analyzing", tickets, nameMap, features, insights });
    setAnalyzeError(null);

    const dates = tickets.map((t) => t.created_at.getTime());
    const stats: DepartmentStats = {
      total_tickets: tickets.length,
      period_start: new Date(Math.min(...dates)).toISOString().split("T")[0],
      period_end: new Date(Math.max(...dates)).toISOString().split("T")[0],
      employee_count: features.length,
    };

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees: features, department_stats: stats }),
      });
      const json = (await res.json()) as ClaudeAnalysis | { error: string };
      if (!res.ok || "error" in json) {
        throw new Error("error" in json ? json.error : "Ошибка анализа");
      }
      const analysis = json as ClaudeAnalysis;
      setPhase({ name: "dashboard", nameMap, features, analysis, insights });

      // Auto-save to history
      setSaveStatus("saving");
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: stats,
          analysis,
          features,
          nameMap: [...nameMap.entries()],
          insights,
        }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 3000);
        })
        .catch((e) => {
          console.error("[history save]", e);
          setSaveStatus("error");
          setTimeout(() => setSaveStatus("idle"), 5000);
        });
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Ошибка при обращении к ИИ");
      setPhase({ name: "preview", tickets, nameMap, features, insights });
    }
  }

  async function handleLoadHistory(id: string) {
    const res = await fetch(`/api/history/${id}`);
    if (!res.ok) throw new Error("Не удалось загрузить анализ");
    const record = await res.json() as {
      analysis: ClaudeAnalysis;
      features: EmployeeFeatures[];
      nameMap: [string, string][];
      insights: DepartmentInsights;
    };
    const nameMap: NameMap = new Map(record.nameMap);
    setPhase({
      name: "dashboard",
      nameMap,
      features: record.features,
      analysis: record.analysis,
      insights: record.insights,
    });
    setAnalyzeError(null);
  }

  function handleReset() {
    setPhase({ name: "upload" });
    setAnalyzeError(null);
  }

  function handleCompare(older: HistoryRecord, newer: HistoryRecord, olderLabel: string, newerLabel: string) {
    setPhase({ name: "compare", older, newer, olderLabel, newerLabel });
    setHistoryOpen(false);
  }

  const isDashboard = phase.name === "dashboard";

  return (
    <main className="min-h-screen bg-background">
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoad={handleLoadHistory}
        onCompare={handleCompare}
      />

      {/* ── Persistent header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur no-print">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHistoryOpen(true)}
              title="История анализов"
              className="text-muted-foreground hover:text-foreground"
            >
              <History className="h-5 w-5" />
            </Button>
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Сохранение…
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Сохранено
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> Ошибка сохранения
              </span>
            )}
            <button type="button" onClick={handleReset} className="flex items-center gap-2 group cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm group-hover:opacity-80 transition-opacity">
                HR
              </div>
              <div className="text-left">
                <p className="font-bold leading-none text-foreground group-hover:opacity-70 transition-opacity">
                  HR-Agent 📊
                </p>
                <p className="text-xs text-muted-foreground">People Analytics</p>
              </div>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isDashboard && (
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={pdfLoading} className="gap-1.5 text-xs">
                {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {pdfLoading ? "Генерация…" : "Скачать PDF"}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1200px] px-4 py-8">
        {phase.name === "upload" && (
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-black shadow-lg">
              HR
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              HR-Agent
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              🤖 Предиктивный анализ выгорания и перегрузки на основе данных ITSM
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Загрузите выгрузку → ИИ проанализирует риски каждого сотрудника
            </p>
          </div>
        )}

        {phase.name === "upload" && <FileUploader onParsed={handleParsed} />}

        {(phase.name === "preview" || phase.name === "analyzing") && (
          <div className="flex flex-col gap-4">
            {analyzeError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                ⚠️ {analyzeError}
              </div>
            )}
            <ParsePreview
              tickets={phase.tickets}
              nameMap={phase.nameMap}
              onReset={handleReset}
              onAnalyze={handleAnalyze}
              isAnalyzing={phase.name === "analyzing"}
            />
          </div>
        )}

        {phase.name === "dashboard" && (
          <div id="dashboard-root">
            <Dashboard
              analysis={phase.analysis}
              features={phase.features}
              nameMap={phase.nameMap}
              insights={phase.insights}
              onReset={handleReset}
            />
          </div>
        )}

        {phase.name === "compare" && (
          <CompareView
            older={phase.older}
            newer={phase.newer}
            olderLabel={phase.olderLabel}
            newerLabel={phase.newerLabel}
            onBack={handleReset}
          />
        )}
      </div>
    </main>
  );
}
