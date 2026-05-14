import type { Ticket, PreTicket, NameMap } from "@/types/index";

/** Generate a random salt using Web Crypto API. */
export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SHA-256 of (name + salt), returns first 16 hex characters.
 * Uses Web Crypto API — browser only.
 *
 * @example
 * const hash = await hashName("Иванов Алексей", salt);
 */
export async function hashName(fullName: string, localSalt: string): Promise<string> {
  const data = new TextEncoder().encode(fullName + localSalt);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

/**
 * Convert PreTicket[] to Ticket[] by hashing all name fields.
 * Returns tickets with hashed IDs and a nameMap for display restoration.
 *
 * Name → hash map and salt never leave browser memory.
 */
export async function anonymizeTickets(
  preTickets: PreTicket[],
  salt: string
): Promise<{ tickets: Ticket[]; nameMap: NameMap }> {
  // Collect all unique names
  const allNames = new Set<string>();
  for (const pt of preTickets) {
    if (pt.assigned_to) allNames.add(pt.assigned_to);
    if (pt.initiator) allNames.add(pt.initiator);
    if (pt.approver) allNames.add(pt.approver);
  }

  // Hash them all
  const nameToHash = new Map<string, string>();
  const nameMap: NameMap = new Map<string, string>();

  await Promise.all(
    Array.from(allNames).map(async (name) => {
      const hash = await hashName(name, salt);
      nameToHash.set(name, hash);
      nameMap.set(hash, name);
    })
  );

  const tickets: Ticket[] = preTickets.map((pt) => ({
    ticket_id: pt.ticket_id,
    created_at: pt.created_at,
    accepted_at: pt.accepted_at,
    resolved_at: pt.resolved_at,
    category: pt.category,
    type: pt.type,
    description: pt.description,
    priority: pt.priority,
    assigned_to_hash: pt.assigned_to ? (nameToHash.get(pt.assigned_to) ?? "") : "",
    initiator_hash: pt.initiator ? (nameToHash.get(pt.initiator) ?? "") : "",
    approver_hash: pt.approver ? (nameToHash.get(pt.approver) ?? null) : null,
    stage: pt.stage,
  }));

  return { tickets, nameMap };
}
