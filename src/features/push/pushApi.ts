import { supabase } from "@/lib/supabase";
import { EVERYONE_MAX_SENDER, EVERYONE_MAX_TEXT } from "./pushConfig";

/**
 * Sends an @everyone device alert to every subscribed account. Staff only; the server re-checks.
 * Throws an Error with a readable message when the server refuses (not staff, rate limit, offline).
 */
export async function sendEveryonePush(input: { text: string; sender: string }): Promise<{ sent: number }> {
  const text = input.text.trim().slice(0, EVERYONE_MAX_TEXT);
  const sender = input.sender.slice(0, EVERYONE_MAX_SENDER);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in first.");

  const res = await fetch("/api/push/everyone", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text, sender }),
  });
  const body = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Could not send the alert.");
  return { sent: body.sent ?? 0 };
}
