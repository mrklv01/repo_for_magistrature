"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Trash2, Clock, Loader2, ChevronRight, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DepartmentStats, HistoryRecord } from "@/types/index";
import { fmtDateTime, fmtIsoDate } from "@/lib/fmtDate";

export interface HistoryItem {
  id: string;
  label: string;
  createdAt: string;
  metadata: DepartmentStats;
  avgBurnoutRisk: number;
  highRiskCount: number;
}

function formatDate(iso: string): string {
  return fmtDateTime(iso);
}

function riskBadge(r: number) {
  if (r >= 0.7) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (r >= 0.4) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
}

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (id: string) => Promise<void>;
  onCompare: (older: HistoryRecord, newer: HistoryRecord, olderLabel: string, newerLabel: string) => void;
}

export function HistoryPanel({ open, onClose, onLoad, onCompare }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open, fetchHistory]);

  useEffect(() => {
    if (!open) { setCompareMode(false); setSelected([]); }
  }, [open]);

  async function handleLoad(id: string) {
    setLoadingId(id);
    try { await onLoad(id); onClose(); }
    finally { setLoadingId(null); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally { setDeletingId(null); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  }

  async function handleCompare() {
    if (selected.length !== 2) return;
    setComparing(true);
    try {
      const [r1, r2] = await Promise.all(
        selected.map((id) => fetch(`/api/history/${id}`).then((r) => r.json() as Promise<HistoryRecord>))
      );
      const item1 = items.find((i) => i.id === selected[0])!;
      const item2 = items.find((i) => i.id === selected[1])!;
      const [older, newer] = item1.createdAt < item2.createdAt ? [r1, r2] : [r2, r1];
      const [olderItem, newerItem] = item1.createdAt < item2.createdAt ? [item1, item2] : [item2, item1];
      onClose();
      onCompare(older, newer, olderItem.label, newerItem.label);
    } finally {
      setComparing(false);
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={onClose} />}

      <aside className={[
        "fixed left-0 top-0 z-40 h-full w-80 bg-card shadow-2xl border-r border-border",
        "flex flex-col transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}>

        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">История анализов</span>
          </div>
          <div className="flex items-center gap-1">
            {items.length >= 2 && (
              <Button variant={compareMode ? "secondary" : "ghost"} size="icon"
                onClick={() => { setCompareMode((v) => !v); setSelected([]); }}
                title="Сравнить два анализа">
                <GitCompare className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                История пуста.<br />Запустите анализ — он сохранится автоматически.
              </div>
            )}
            {compareMode && items.length >= 2 && (
              <p className="px-4 pb-2 text-xs text-muted-foreground">Выберите два анализа для сравнения</p>
            )}
            {!loading && items.map((item) => (
              <div key={item.id}
                className="group mx-2 mb-1 rounded-lg border border-transparent px-3 py-3 hover:border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-1">
                  {compareMode ? (
                    <button type="button" className="flex flex-1 items-start gap-2.5 text-left"
                      onClick={() => toggleSelect(item.id)}>
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs
                        ${selected.includes(item.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground"}`}>
                        {selected.includes(item.id) ? "✓" : ""}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-foreground leading-tight">{item.label}</span>
                        <span className="mt-1 text-xs text-muted-foreground">{fmtIsoDate(item.metadata.period_start)} — {fmtIsoDate(item.metadata.period_end)}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                        <span className={`mt-1.5 inline-block w-fit rounded px-1.5 py-0.5 text-xs font-semibold ${riskBadge(item.avgBurnoutRisk)}`}>
                          🔥 {Math.round(item.avgBurnoutRisk * 100)}%
                        </span>
                      </span>
                    </button>
                  ) : (
                    <button className="flex-1 text-left" onClick={() => handleLoad(item.id)} disabled={loadingId === item.id}>
                      <p className="text-sm font-medium text-foreground leading-tight">{item.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">{fmtIsoDate(item.metadata.period_start)} — {fmtIsoDate(item.metadata.period_end)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{item.metadata.employee_count} сотр. · {item.metadata.total_tickets} тик.</span>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${riskBadge(item.avgBurnoutRisk)}`}>
                          🔥 {Math.round(item.avgBurnoutRisk * 100)}%
                        </span>
                        {item.highRiskCount > 0 && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            ⚠️ {item.highRiskCount} в зоне риска
                          </span>
                        )}
                      </div>
                    </button>
                  )}

                  {!compareMode && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {loadingId === item.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        disabled={deletingId === item.id}
                        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Удалить">
                        {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        {/* Footer */}
        <div className="border-t px-4 py-3">
          {compareMode ? (
            <Button className="w-full gap-2" size="sm"
              disabled={selected.length !== 2 || comparing}
              onClick={handleCompare}>
              {comparing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {comparing ? "Сравниваю…" : `Сравнить ${selected.length}/2`}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Анализы сохраняются автоматически</p>
          )}
        </div>
      </aside>
    </>
  );
}
