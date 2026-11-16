import { authenticate, json, readJsonObject, readSupabaseEnv, UUID } from "./supabaseAuth";

/**
 * POST /api/account/delete. Body: { "target": "<user uuid>" }. Header: Authorization: Bearer <access token>.
 *
 * Owner and co-owners can delete accounts ranked strictly below them. The ranks are read with the
 * caller's own session (discard_rank RPC) so the database decides, and the caller cannot delete
 * their own account here. Fails closed: any error reading ranks is a refusal.
 */
export async function handleDeleteAccount(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const env = readSupabaseEnv();
  if (!env) return json({ error: "Account admin is not configured" }, 503);

  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;
  const { userId: me, admin, userClient } = auth;

  const body = await readJsonObject(request);
  const target = body?.["target"];
  if (typeof target !== "string" || !UUID.test(target)) return json({ error: "Bad account" }, 400);
  if (target === me) return json({ error: "You can't delete your own account here" }, 400);

  const [mineRes, theirsRes] = await Promise.all([
    userClient.rpc("discard_rank", { _u: me }),
    userClient.rpc("discard_rank", { _u: target }),
  ]);
  if (mineRes.error || theirsRes.error) return json({ error: "Could not check permissions" }, 500);
  const mine = mineRes.data ?? 0;
  const theirs = theirsRes.data ?? 0;
  if (mine < 2) return json({ error: "Only the owner and co-owners can delete accounts" }, 403);
  if (theirs >= mine) return json({ error: "You can only delete accounts ranked below you" }, 403);

  await admin.from("discard_moderators").delete().eq("user_id", target);
  await admin.from("discard_profiles").delete().eq("user_id", target);
  const { error } = await admin.auth.admin.deleteUser(target);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true }, 200);
}
