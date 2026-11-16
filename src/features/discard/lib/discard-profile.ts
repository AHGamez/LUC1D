/**
 * Label for the verified chat role. Roles come from discard_chat_tags (owner, modmgmt) and discard_moderators
 * (coowner, mod). Clients cannot write either table; the database is the source of truth.
 */
export function chatTag(verifiedTag?: string) {
  if (verifiedTag === "owner") return "Owner";
  if (verifiedTag === "modmgmt") return "Mod Management";
  if (verifiedTag === "coowner") return "Co-Owner";
  if (verifiedTag === "mod") return "Mod";
  return "Member";
}

/** File extension for an allowed avatar or banner MIME type, or undefined when the type is not allowed. */
export function avatarExtension(type: string) {
  const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
  return extensions[type];
}

/**
 * "Joined" line for a profile card, from the database created_at (copied from the auth account by a trigger).
 * Returns null when the date is missing or unreadable, so the card simply omits the line.
 */
export function joinedLabel(createdAt?: string | null): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return `Joined ${d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`;
}
