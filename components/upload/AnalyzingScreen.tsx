"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Читаю данные о тикетах…",
  "Рассчитываю 11 метрик по каждому сотруднику…",
  "Определяю тренды и аномалии…",
  "Отправляю агрегаты на анализ…",
  "ИИ оценивает риски выгорания…",
  "Формирую персональные рекомендации…",
  "Строю прогноз найма…",
];

interface Props {
  employeeCount: number;
}

export function AnalyzingScreen({ employeeCount }: Props) {
  const [visibleCount, setVisibleCount] = useState(1);
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setVisibleCount((n) => Math.min(n + 1, STEPS.length));
    }, 2200);
    return () => clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    const dotsTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(dotsTimer);
  }, []);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 py-20 text-center">
      {/* Pulsing logo */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-20" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-black shadow-lg">
          HR
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">
          Анализируем {employeeCount} сотрудников{dots}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">обычно занимает 20–40 секунд</p>
      </div>

      {/* Streaming steps */}
      <div className="w-full rounded-xl border bg-card px-6 py-5 text-left shadow-sm">
        <ul className="flex flex-col gap-3">
          {STEPS.slice(0, visibleCount).map((step, i) => {
            const isLast = i === visibleCount - 1;
            return (
              <li
                key={i}
                className="flex items-start gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                <span className="mt-0.5 flex-shrink-0">
                  {isLast ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <span className="text-emerald-500">✓</span>
                  )}
                </span>
                <span className={isLast ? "text-foreground" : "text-muted-foreground"}>
                  {step}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
