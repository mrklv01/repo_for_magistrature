"use client";

import { useMemo } from "react";
import { CheckCircle, Users, Calendar, Loader2, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Ticket, NameMap } from "@/types/index";

interface Props {
  tickets: Ticket[];
  nameMap: NameMap;
  onReset: () => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ParsePreview({ tickets, nameMap, onReset, onAnalyze, isAnalyzing }: Props) {
  const stats = useMemo(() => {
    const employeeIds = [...new Set(tickets.map((t) => t.assigned_to_hash))];
    const dates = tickets.map((t) => t.created_at.getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const byEmployee = employeeIds
      .map((hash) => {
        const emp = tickets.filter((t) => t.assigned_to_hash === hash);
        const open = emp.filter((t) => t.resolved_at === null).length;
        return { hash, name: nameMap.get(hash) ?? hash.slice(0, 8) + "…", count: emp.length, open };
      })
      .sort((a, b) => b.count - a.count);

    const periodDays = Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    return { byEmployee, employeeCount: employeeIds.length, minDate, maxDate, total: tickets.length, periodDays };
  }, [tickets, nameMap]);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">тикетов загружено</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.employeeCount}</p>
                <p className="text-sm text-muted-foreground">сотрудников</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">
                  {fmtDate(stats.minDate)} —<br />{fmtDate(stats.maxDate)}
                </p>
                <p className="text-sm text-muted-foreground">период данных</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Short period warning */}
      {stats.periodDays < 30 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 !text-amber-500" />
          <AlertDescription>
            <strong>Период данных — {stats.periodDays} {stats.periodDays === 1 ? "день" : stats.periodDays < 5 ? "дня" : "дней"}.</strong>{" "}
            Для достоверного анализа рекомендуется загружать данные за 60–90 дней. При коротком периоде точность оценок снижается, и ИИ понизит уровень уверенности в результатах.
          </AlertDescription>
        </Alert>
      )}

      {/* Employee table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Данные успешно загружены</CardTitle>
          </div>
          <CardDescription>
            ФИО сотрудников псевдонимизированы локально и не покидают ваш браузер.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead className="text-right">Тикетов</TableHead>
                <TableHead className="text-right">Открытых</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.byEmployee.map(({ hash, name, count, open }) => (
                <TableRow key={hash}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell className="text-right tabular-nums">{count}</TableCell>
                  <TableCell className="text-right">
                    {open > 0 ? (
                      <Badge variant="destructive" className="tabular-nums">{open}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {onAnalyze && (
          <Button onClick={onAnalyze} disabled={isAnalyzing} className="flex-1 gap-2">
            {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAnalyzing ? "Анализируем…" : "Запустить анализ рисков"}
          </Button>
        )}
        <Button variant="outline" onClick={onReset} disabled={isAnalyzing}>
          Загрузить другой файл
        </Button>
      </div>
    </div>
  );
}
