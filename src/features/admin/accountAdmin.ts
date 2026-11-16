import { supabase } from "@/lib/supabase";

/**
 * Permanently deletes another account. Owner and co-owners only, and only for accounts ranked below
 * them. The server checks ranks in the database; this helper only sends the request.
 * Throws an Error with the server's message when the delete is refused.
 */
export async function deleteAccount(target: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in first.");

  const res = await fetch("/api/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not delete the account.");
  }
}
