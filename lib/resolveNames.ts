import type { NameMap } from "@/types/index";

const HASH_RE = /\b[0-9a-f]{16}\b/g;

/** Replace 16-char hex hashes in text with real names from nameMap. */
export function resolveNames(text: string, nameMap: NameMap): string {
  return text.replace(HASH_RE, (hash) => nameMap.get(hash) ?? hash);
}
