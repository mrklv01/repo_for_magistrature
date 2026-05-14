"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { FIELD_DEFS, type ColumnMapping } from "@/lib/parsers/normalize";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  columns: string[];          // column names detected in the file
  filename: string;
  rowCount: number;
  initial: ColumnMapping;     // auto-detected suggestion
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

const NONE = "__none__";

export function ColumnMapper({ columns, filename, rowCount, initial, onConfirm, onCancel }: Props) {
  const [mapping, setMapping] = useState<ColumnMapping>(initial);

  const requiredFields = FIELD_DEFS.filter((f) => f.required);
  const optionalFields = FIELD_DEFS.filter((f) => !f.required);

  const missingRequired = requiredFields.filter((f) => !mapping[f.key]);
  const canProceed = missingRequired.length === 0;

  function set(field: string, value: string) {
    setMapping((prev) => ({
      ...prev,
      [field]: value === NONE ? undefined : value,
    }));
  }

  function SelectField({ fieldKey }: { fieldKey: string }) {
    const val = mapping[fieldKey] ?? NONE;
    return (
      <select
        value={val}
        onChange={(e) => set(fieldKey, e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value={NONE}>— не указано —</option>
        {columns.map((col) => (
          <option key={col} value={col}>
            {col}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Сопоставление колонок</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Файл <span className="font-medium text-foreground">{filename}</span> — {rowCount} строк,{" "}
            {columns.length} колонок. Укажите, какая колонка файла соответствует каждому полю.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          ← Назад
        </Button>
      </div>

      {/* Required fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Обязательные поля</CardTitle>
          <CardDescription>Без них анализ невозможен</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {requiredFields.map((f) => {
            const mapped = !!mapping[f.key];
            return (
              <div key={f.key} className="grid grid-cols-[1fr_2fr] items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {mapped ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="text-sm font-medium">{f.label}</span>
                  </div>
                  {f.hint && (
                    <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{f.hint}</p>
                  )}
                </div>
                <SelectField fieldKey={f.key} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Optional fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Дополнительные поля</CardTitle>
          <CardDescription>Влияют на точность анализа, но не обязательны</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {optionalFields.map((f) => (
            <div key={f.key} className="grid grid-cols-[1fr_2fr] items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{f.label}</span>
                  {mapping[f.key] && (
                    <Badge variant="secondary" className="text-xs">выбрано</Badge>
                  )}
                </div>
                {f.hint && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{f.hint}</p>
                )}
              </div>
              <SelectField fieldKey={f.key} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary / action */}
      {!canProceed && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Не указано: {missingRequired.map((f) => f.label).join(", ")}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => onConfirm(mapping)} disabled={!canProceed} className="flex-1">
          Подтвердить и продолжить
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
