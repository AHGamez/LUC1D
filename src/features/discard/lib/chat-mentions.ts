import { CLUB_ITEMS } from "./club-items";

/** What the person is typing right now: a tag list (@t…) or a member list (@…). */
export type MentionMode = "tags" | "members";
export type MentionState = { mode: MentionMode; query: string; memberQuery: string; start: number };
export type MentionOption = { id: string; name: string; swatch?: string | undefined; kind: MentionMode };

/**
 * Reads the "@…" token the caret is sitting in.
 * "@t" and "@t…" open the tag list, a plain "@" opens the member list.
 */
export function mentionState(text: string, caret: number): MentionState | null {
  const end = Math.max(0, Math.min(caret, text.length));
  const before = text.slice(0, end);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  const token = before.slice(at);
  // A space ends the mention: "@everyone there" is not a picker request.
  if (/\s/.test(token)) return null;
  const memberQuery = token.slice(1).toLowerCase();
  if (token.toLowerCase().startsWith("@t")) {
    return { mode: "tags", query: token.slice(2).toLowerCase(), memberQuery, start: at };
  }
  return { mode: "members", query: memberQuery, memberQuery, start: at };
}

/** Case-insensitive "starts with, then contains" filter, shortest names first. */
export function filterOptions(
  items: { id: string; name: string; swatch?: string | undefined }[],
  query: string,
  kind: MentionMode,
  limit = 6,
): MentionOption[] {
  const q = query.toLowerCase();
  const scored = items
    .map((i) => {
      const name = i.name.toLowerCase();
      const rank = !q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : -1;
      return { item: i, rank, length: i.name.length };
    })
    .filter((s) => s.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.length - b.length)
    .slice(0, limit);
  return scored.map((s) => ({ id: s.item.id, name: s.item.name, swatch: s.item.swatch, kind }));
}

/** Only the chat tags this person already owns — bought, traded or handed to them. */
export const ownedTags = (ownedIds: string[]) =>
  CLUB_ITEMS.filter((i) => i.kind === "tag" && ownedIds.includes(i.id));

/** Splits a message into plain text and @member mentions so mentions can be highlighted. */
export function splitMentions(content: string, names: string[]): { text: string; mention: boolean }[] {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!clean.length) return [{ text: content, mention: false }];
  const re = new RegExp(`@(${clean.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w])`, "gi");
  const out: { text: string; mention: boolean }[] = [];
  let last = 0;
  for (const m of content.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: content.slice(last, i), mention: false });
    out.push({ text: m[0], mention: true });
    last = i + m[0].length;
  }
  if (last < content.length) out.push({ text: content.slice(last), mention: false });
  return out.length ? out : [{ text: content, mention: false }];
}
