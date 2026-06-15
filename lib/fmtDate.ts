/**
 * Единый форматтер дат для всего проекта — ДД.ММ.ГГГГ.
 */

/** Date или ISO строка → "27.05.2026" */
export function fmtDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Date или ISO строка → "27.05.2026 14:30" */
export function fmtDateTime(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${fmtDate(d)} ${time}`;
}

/**
 * Быстрое преобразование ISO-даты "YYYY-MM-DD" → "DD.MM.YYYY"
 * без создания объекта Date (нет проблем с таймзоной).
 */
export function fmtIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}
