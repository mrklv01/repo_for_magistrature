"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

import { parseCsv } from "@/lib/parsers/csv";
import { parseXlsx } from "@/lib/parsers/xlsx";
import {
  autoDetectMapping,
  normalizeWithMapping,
  type ColumnMapping,
  type RawRow,
  FIELD_DEFS,
} from "@/lib/parsers/normalize";
import { anonymizeTickets, generateSalt } from "@/lib/anonymize";
import { ColumnMapper } from "@/components/upload/ColumnMapper";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Ticket, NameMap } from "@/types/index";

interface Props {
  onParsed: (tickets: Ticket[], nameMap: NameMap) => void;
}

type Step =
  | { type: "idle" }
  | { type: "mapping"; rawRows: RawRow[]; columns: string[]; filename: string; missing: string[] }
  | { type: "processing" };

const REQUIRED_FIELDS = FIELD_DEFS.filter((f) => f.required).map((f) => f.key);

export function FileUploader({ onParsed }: Props) {
  const [step, setStep] = useState<Step>({ type: "idle" });
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const finalize = useCallback(
    async (rawRows: RawRow[], mapping: ColumnMapping) => {
      setStep({ type: "processing" });
      setError(null);
      try {
        const preTickets = normalizeWithMapping(rawRows, mapping);
        if (preTickets.length === 0) {
          throw new Error(
            "Ни одна строка не прошла нормализацию. Проверьте, что в выбранных колонках есть корректные даты."
          );
        }
        const salt = generateSalt();
        const { tickets, nameMap } = await anonymizeTickets(preTickets, salt);
        onParsed(tickets, nameMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка нормализации данных");
        setStep({ type: "idle" });
      }
    },
    [onParsed]
  );

  const parseFile = useCallback(
    async (file: File, skipMapper = false) => {
      setError(null);
      setStep({ type: "processing" });
      try {
        let rawRows: RawRow[];
        const name = file.name.toLowerCase();

        if (name.endsWith(".csv")) {
          rawRows = await parseCsv(file);
        } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
          rawRows = await parseXlsx(file);
        } else if (name.endsWith(".pdf")) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/parse-pdf", { method: "POST", body: fd });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? "PDF parsing failed");
          }
          rawRows = ((await res.json()) as { rows: RawRow[] }).rows;
        } else {
          throw new Error("Неподдерживаемый формат. Используйте CSV, XLSX или PDF.");
        }

        if (rawRows.length === 0) throw new Error("Файл пустой или не содержит строк данных.");

        const columns = Object.keys(rawRows[0]);
        const mapping = autoDetectMapping(columns);

        // Find required fields that couldn't be auto-detected
        const missing = REQUIRED_FIELDS.filter((k) => !mapping[k]);

        if (missing.length === 0 || skipMapper) {
          // All required fields found — proceed without showing the mapper
          await finalize(rawRows, mapping);
        } else {
          // Show mapper only for files with unresolved required fields
          setStep({ type: "mapping", rawRows, columns, filename: file.name, missing });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка обработки файла");
        setStep({ type: "idle" });
      }
    },
    [finalize]
  );

  const loadDemo = useCallback(async () => {
    setError(null);
    setStep({ type: "processing" });
    try {
      const res = await fetch("/sample-tickets.csv");
      if (!res.ok) throw new Error("Не удалось загрузить демо-датасет");
      const text = await res.text();
      const file = new File([text], "sample-tickets.csv", { type: "text/csv" });
      await parseFile(file, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки демо");
      setStep({ type: "idle" });
    }
  }, [parseFile]);

  // ── Render: mapping step (only if auto-detect missed required fields) ───────
  if (step.type === "mapping") {
    const { rawRows, columns, filename, missing } = step;
    const suggested = autoDetectMapping(columns);
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Автоматически не удалось определить: <strong>{missing.join(", ")}</strong>.
          Укажите соответствующие колонки вручную.
        </div>
        <ColumnMapper
          columns={columns}
          filename={filename}
          rowCount={rawRows.length}
          initial={suggested}
          onConfirm={(m) => finalize(rawRows, m)}
          onCancel={() => { setStep({ type: "idle" }); setError(null); }}
        />
      </div>
    );
  }

  // ── Render: idle / processing ───────────────────────────────────────────────
  const isLoading = step.type === "processing";

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && !isLoading) parseFile(file);
        }}
        onClick={() => { if (!isLoading) inputRef.current?.click(); }}
        className={[
          "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 transition-colors",
          isLoading
            ? "cursor-wait border-primary/40 bg-primary/5"
            : "cursor-pointer border-border hover:border-primary/50 hover:bg-muted/30",
        ].join(" ")}
      >
        {isLoading ? (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        ) : (
          <Upload className="h-10 w-10 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-base font-medium text-foreground">
            {isLoading ? "Читаем файл…" : "Перетащите файл сюда или нажмите для выбора"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "Определяем структуру данных автоматически"
              : "CSV, XLSX или PDF — выгрузка из ITSM-системы"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) parseFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">или</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" onClick={loadDemo} disabled={isLoading} className="gap-2">
        <FileText className="h-4 w-4" />
        Загрузить демо-датасет (492 тикета, 7 сотрудников)
      </Button>
    </div>
  );
}
