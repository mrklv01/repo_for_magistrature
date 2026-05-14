import type { PreTicket } from "@/types/index";

export type RawRow = Record<string, string>;

type Priority = "P1" | "P2" | "P3" | "P4";

const PRIORITY_MAP: Record<string, Priority> = {
  критичный: "P1", critical: "P1", "1": "P1",
  высокий: "P2", high: "P2", "2": "P2",
  средний: "P3", normal: "P3", medium: "P3", "3": "P3",
  низкий: "P4", low: "P4", "4": "P4",
};

export function normalizePriority(val: string): Priority {
  return PRIORITY_MAP[val.toLowerCase().trim()] ?? "P3";
}

export function parseDate(val: string): Date {
  if (!val) throw new Error("Empty date");
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  // DD.MM.YYYY [HH:mm[:ss]]
  const m = val.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return new Date(
      `${m[3]}-${m[2]}-${m[1]}T${m[4] ?? "00"}:${m[5] ?? "00"}:${m[6] ?? "00"}`
    );
  }
  throw new Error(`Cannot parse date: "${val}"`);
}

// ── Field definitions ────────────────────────────────────────────────────────

export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

export const FIELD_DEFS: FieldDef[] = [
  { key: "created_at",  label: "Дата создания",          required: true,  hint: "Когда тикет был создан" },
  { key: "accepted_at", label: "Дата принятия в работу", required: true,  hint: "Когда исполнитель взял тикет" },
  { key: "assigned_to", label: "Исполнитель",            required: true,  hint: "ФИО сотрудника — будет псевдонимизировано" },
  { key: "resolved_at", label: "Дата решения",           required: false, hint: "Пусто = тикет открыт" },
  { key: "priority",    label: "Приоритет",              required: false, hint: "P1/P2/P3/P4 или Критичный/Высокий…" },
  { key: "stage",       label: "Статус / Этап",          required: false, hint: "Закрыт, В работе…" },
  { key: "category",    label: "Категория",              required: false },
  { key: "type",        label: "Тип обращения",          required: false },
  { key: "description", label: "Описание",               required: false },
  { key: "ticket_id",   label: "Номер тикета",           required: false },
  { key: "initiator",   label: "Инициатор / Заявитель",  required: false },
  { key: "approver",    label: "Согласующий",            required: false },
];

/** Column mapping: fieldKey → columnName in the source file */
export type ColumnMapping = Partial<Record<string, string>>;

// ── Auto-detection ────────────────────────────────────────────────────────────

const FIELD_KEYWORDS: Record<string, string[]> = {
  created_at:  ["created_at", "createdat", "датасоздания", "дата_создания", "создано", "создан", "датаоткрытия", "дата_открытия", "открыто", "opened", "open_date"],
  accepted_at: ["accepted_at", "acceptedat", "датапринятия", "дата_принятия", "принято", "принят", "началоработы", "начало_работы", "start_date", "startdate", "взято", "взят"],
  assigned_to: ["assigned_to", "assignedto", "исполнитель", "назначено", "назначен", "выполнил", "executor", "worker", "responsible", "assigned", "assignee"],
  resolved_at: ["resolved_at", "resolvedat", "датарешения", "дата_решения", "решено", "решён", "закрыто", "закрыт", "датазакрытия", "дата_закрытия", "close_date", "closedate", "resolved", "closed_at"],
  priority:    ["priority", "приоритет", "важность", "urgency", "severity"],
  stage:       ["stage", "статус", "этап", "status", "состояние", "state"],
  category:    ["category", "категория", "тип_обращения", "типобращения", "service"],
  type:        ["type", "тип", "вид", "kind"],
  description: ["description", "описание", "комментарий", "содержание", "тема", "subject", "summary", "title"],
  ticket_id:   ["ticket_id", "ticketid", "номер", "number", "id", "№", "num", "ticket"],
  initiator:   ["initiator", "инициатор", "заявитель", "автор", "requester", "reporter", "creator"],
  approver:    ["approver", "согласующий", "согласовал", "approver", "approval"],
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[\s_\-\.]/g, "");
}

/**
 * Guess column mapping from detected column names.
 * Uses substring matching after stripping separators.
 */
export function autoDetectMapping(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    const found = columns.find((col) =>
      keywords.some((kw) => normalize(col).includes(normalize(kw)))
    );
    if (found) mapping[field] = found;
  }
  return mapping;
}

// ── Normalization with explicit mapping ───────────────────────────────────────

/**
 * Normalize rows using an explicit column mapping provided by the user.
 *
 * @example
 * const mapping = { created_at: "ДатаСоздания", assigned_to: "Исполнитель", ... };
 * const tickets = normalizeWithMapping(rows, mapping);
 */
export function normalizeWithMapping(rows: RawRow[], mapping: ColumnMapping): PreTicket[] {
  function get(row: RawRow, field: string): string {
    const colName = mapping[field];
    if (!colName) return "";
    return String(row[colName] ?? "").trim();
  }

  const result: PreTicket[] = [];

  for (const row of rows) {
    try {
      const createdStr = get(row, "created_at");
      const acceptedStr = get(row, "accepted_at");
      if (!createdStr || !acceptedStr) continue;

      const created_at = parseDate(createdStr);
      const accepted_at = parseDate(acceptedStr);

      const resolvedStr = get(row, "resolved_at");
      let resolved_at: Date | null = null;
      if (resolvedStr) {
        try { resolved_at = parseDate(resolvedStr); } catch { /* open ticket */ }
      }

      result.push({
        ticket_id: get(row, "ticket_id") || `TKT-${result.length + 1}`,
        created_at,
        accepted_at,
        resolved_at,
        category: get(row, "category"),
        type: get(row, "type"),
        description: get(row, "description"),
        priority: normalizePriority(get(row, "priority")),
        assigned_to: get(row, "assigned_to"),
        initiator: get(row, "initiator"),
        approver: get(row, "approver"),
        stage: get(row, "stage"),
      });
    } catch {
      // skip malformed rows silently
    }
  }

  return result;
}

/** Returns true if the ticket is closed/resolved. */
export function isClosed(ticket: { stage: string; resolved_at: Date | null }): boolean {
  const s = ticket.stage.toLowerCase();
  return (
    s.includes("закрыт") ||
    s.includes("решён") ||
    s.includes("resolved") ||
    s.includes("closed")
  );
}
