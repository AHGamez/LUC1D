/** Short random suffix so each realtime subscription gets its own channel name. */
export const uniqueSuffix = () => Math.random().toString(36).slice(2);

/** Discard keeps chat for two hours; pinned messages stay. Returns the ISO cutoff for "still live". */
export const expiryCutoff = (expiryMs: number) => new Date(Date.now() - expiryMs).toISOString();

/** Keeps rows sorted by time and unique by id; the later copy of a row wins. */
export function mergeById<T extends { id: string; created_at: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  [...a, ...b].forEach((m) => map.set(m.id, { ...map.get(m.id), ...m }));
  return [...map.values()].sort((x, y) => x.created_at.localeCompare(y.created_at));
}

/** Two fetches can land out of order when servers switch fast; keep the list unique by id. */
export function uniqById<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((r) => [r.id, r])).values()];
}

export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
