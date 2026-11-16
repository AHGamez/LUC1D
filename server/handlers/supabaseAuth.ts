import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";

/**
 * Shared helpers for the account and push handlers. The caller's access token is verified with
 * Supabase itself. Never trust a decoded or client-sent user id.
 *
 * Environment (server only):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY (falls back to VITE_SUPABASE_PUBLISHABLE_KEY)
 */

export type TypedClient = SupabaseClient<Database>;

export interface SupabaseEnv {
  supabaseUrl: string;
  serviceKey: string;
  publishableKey: string;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function readSupabaseEnv(): SupabaseEnv | null {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!supabaseUrl || !serviceKey || !publishableKey) return null;
  return { supabaseUrl, serviceKey, publishableKey };
}

function bearerToken(header: string | null): string | null {
  const m = header?.match(/^Bearer\s+(\S+)$/i);
  return m?.[1] ?? null;
}

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } as const;

export type AuthResult =
  | { ok: true; userId: string; admin: TypedClient; userClient: TypedClient }
  | { ok: false; response: Response };

/**
 * Verifies the bearer token and returns:
 * - `admin`: service-role client, for writes the caller must not be able to make directly.
 * - `userClient`: client that runs as the caller, so database rank and mod checks see the real user.
 */
export async function authenticate(request: Request, env: SupabaseEnv): Promise<AuthResult> {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return { ok: false, response: json({ error: "Sign in first" }, 401) };

  const admin: TypedClient = createClient<Database>(env.supabaseUrl, env.serviceKey, { auth: NO_SESSION });
  const { data, error } = await admin.auth.getUser(token);
  const userId = data?.user?.id;
  if (error || !userId) return { ok: false, response: json({ error: "Sign in first" }, 401) };

  const userClient: TypedClient = createClient<Database>(env.supabaseUrl, env.publishableKey, {
    auth: NO_SESSION,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { ok: true, userId, admin, userClient };
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
