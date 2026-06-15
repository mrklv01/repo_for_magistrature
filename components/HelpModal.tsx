"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const METRICS = [
  { label: "Нагрузка",              desc: "Тикетов в неделю — сколько задач назначается на сотрудника." },
  { label: "Время реакции",         desc: "Среднее время от создания тикета до принятия в работу." },
  { label: "Время выполнения",      desc: "Среднее время от принятия тикета до его закрытия." },
  { label: "Тренд скорости",        desc: "Динамика времени выполнения по неделям. Плюс = замедляется — ранний сигнал выгорания." },
  { label: "P1–P2",                 desc: "Доля срочных заявок. P1 — критичный сбой, P2 — высокий приоритет. Высокая доля = постоянный стресс." },
  { label: "Вне рабочих часов",     desc: "Доля тикетов, принятых до 9:00, после 18:00 или в выходные. Выше 15% — сигнал переработок." },
  { label: "Разнообразие задач",    desc: "Широта категорий задач. Узкий профиль = специализация, широкий = универсал." },
  { label: "Разрывы активности",    desc: "Периоды с 3+ днями подряд без тикетов. Много разрывов — возможное дистанцирование или частые больничные." },
  { label: "Контакты",              desc: "Число уникальных коллег в тикетах (инициаторы и согласующие). Показывает вовлечённость в команду." },
  { label: "Открытые тикеты",       desc: "Незакрытые задачи на конец периода — накопленный долг. Много открытых при высокой нагрузке = риск перегруза." },
  { label: "Сложность описаний",    desc: "Средняя длина описания тикета. Косвенный показатель сложности задач." },
];

const RISK_LEVELS = [
  { label: "0–39%",  color: "bg-green-500",  text: "Норма — показатели в пределах нормы отдела." },
  { label: "40–69%", color: "bg-amber-400",  text: "Внимание — появляются признаки, рекомендуется мониторить." },
  { label: "70%+",   color: "bg-red-500",    text: "Риск — критический сигнал, рекомендуется оценить необходимость действий." },
];

export function HelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Справка"
          className="text-muted-foreground hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>HR-Agent — справка</DialogTitle>
          <DialogDescription>
            Инструмент предиктивного анализа рисков выгорания и перегрузки на основе данных ITSM-системы.
          </DialogDescription>
        </DialogHeader>

        {/* Как пользоваться */}
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Как пользоваться</h3>
          <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground list-none">
            {[
              "Выгрузите CSV или XLSX из вашей ITSM-системы (Jira, ServiceNow, 1С и др.).",
              "Загрузите файл — система распознает тикеты и покажет сводку.",
              "Нажмите «Анализировать» — AI рассчитает метрики и напишет пояснения.",
              "Изучите дашборд: риски по отделу, профили сотрудников, тренды.",
              "При необходимости добавьте заметки HR в карточку сотрудника — они войдут в PDF.",
              "Скачайте PDF-отчёт для презентации или архива.",
            ].map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Уровни риска */}
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Уровни риска выгорания</h3>
          <div className="flex flex-col gap-1.5">
            {RISK_LEVELS.map((r) => (
              <div key={r.label} className="flex items-start gap-2.5 text-sm">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${r.color}`} />
                <span>
                  <span className="font-medium text-foreground">{r.label}</span>
                  <span className="text-muted-foreground"> — {r.text}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Метрики */}
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Что означают метрики</h3>
          <div className="flex flex-col divide-y divide-border">
            {METRICS.map((m) => (
              <div key={m.label} className="py-2 text-sm">
                <span className="font-medium text-foreground">{m.label}</span>
                <span className="text-muted-foreground"> — {m.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Конфиденциальность */}
        <section className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          🔒 <span className="font-medium text-foreground">Конфиденциальность:</span> ФИО сотрудников
          хешируются в браузере до отправки. На сервер и в AI уходят только анонимные идентификаторы.
          Данные не хранятся между сессиями.
        </section>
      </DialogContent>
    </Dialog>
  );
}
