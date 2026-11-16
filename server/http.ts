import type { IncomingMessage, ServerResponse } from "node:http";

/** Largest request body the API accepts. Donation and webhook payloads are a few hundred bytes. */
export const MAX_BODY_BYTES = 64 * 1024;

/** An error with an HTTP status. Thrown by handlers and turned into a JSON response by the router. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/** Reads the whole body as a Buffer. Rejects with 413 once it passes `limit`, and keeps draining the socket. */
export function readBody(req: IncomingMessage, limit = MAX_BODY_BYTES): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declared = Number(header(req, "content-length"));
    if (Number.isFinite(declared) && declared > limit) {
      req.resume();
      reject(new HttpError(413, "Request body is too large"));
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;

    req.on("data", (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > limit) {
        failed = true;
        reject(new HttpError(413, "Request body is too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!failed) resolve(Buffer.concat(chunks));
    });
    req.on("error", (err) => {
      if (!failed) {
        failed = true;
        reject(err);
      }
    });
  });
}

export function parseJson(body: Buffer): unknown {
  try {
    return JSON.parse(body.toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

export function requireJsonContentType(req: IncomingMessage): void {
  const type = header(req, "content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(body));
}
