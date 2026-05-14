import type { Ticket, PreTicket, NameMap } from "@/types/index";

// cyrb53 — fast 53-bit hash, works in all browser contexts (no secure context needed)
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function generateSalt(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/** Returns first 16 hex characters — synchronous, works on HTTP and HTTPS. */
export function hashName(fullName: string, localSalt: string): string {
  const input = fullName + localSalt;
  const a = cyrb53(input, 0).toString(16).padStart(13, "0");
  const b = cyrb53(input, 1).toString(16).padStart(13, "0");
  return (a + b).slice(0, 16);
}

export async function anonymizeTickets(
  preTickets: PreTicket[],
  salt: string
): Promise<{ tickets: Ticket[]; nameMap: NameMap }> {
  const allNames = new Set<string>();
  for (const pt of preTickets) {
    if (pt.assigned_to) allNames.add(pt.assigned_to);
    if (pt.initiator)   allNames.add(pt.initiator);
    if (pt.approver)    allNames.add(pt.approver);
  }

  const nameToHash = new Map<string, string>();
  const nameMap: NameMap = new Map<string, string>();

  for (const name of allNames) {
    const hash = hashName(name, salt);
    nameToHash.set(name, hash);
    nameMap.set(hash, name);
  }

  const tickets: Ticket[] = preTickets.map((pt) => ({
    ticket_id:        pt.ticket_id,
    created_at:       pt.created_at,
    accepted_at:      pt.accepted_at,
    resolved_at:      pt.resolved_at,
    category:         pt.category,
    type:             pt.type,
    description:      pt.description,
    priority:         pt.priority,
    assigned_to_hash: pt.assigned_to ? (nameToHash.get(pt.assigned_to) ?? "") : "",
    initiator_hash:   pt.initiator   ? (nameToHash.get(pt.initiator)   ?? "") : "",
    approver_hash:    pt.approver    ? (nameToHash.get(pt.approver)    ?? null) : null,
    stage:            pt.stage,
  }));

  return { tickets, nameMap };
}
