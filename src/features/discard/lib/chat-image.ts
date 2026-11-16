export const CHAT_IMAGE_LIMIT = 5 * 1024 * 1024;

/** File extension for an allowed chat picture MIME type, or undefined when the type is not allowed. */
export function chatImageExtension(type: string) {
  const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
  return extensions[type];
}
