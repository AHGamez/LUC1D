import { supabase } from "../../lib/supabase";

/** Accepts only an https Stripe page before the browser leaves the site. */
export function isStripeCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith("stripe.com");
  } catch {
    return false;
  }
}

/**
 * Calls one of the site's own /api routes with the signed-in user's access token. The server checks
 * the token itself; the browser never sends a user id it is trusted with.
 */
export async function apiCall<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) headers["authorization"] = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: unknown } & T;
    if (!response.ok) {
      return { ok: false, error: typeof json.error === "string" ? json.error : "Something went wrong. Please try again." };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }
}

/** Removes return-link query keys from the address bar without a reload. */
export function clearReturnParams(keys: string[]) {
  const url = new URL(window.location.href);
  keys.forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}
