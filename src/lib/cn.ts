/** Joins class names, skipping falsy values. Tiny stand-in for clsx + tailwind-merge. */
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
