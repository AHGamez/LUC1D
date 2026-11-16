import { authenticate, json, readJsonObject, readSupabaseEnv, UUID } from "./supabaseAuth";

/*
 * POST /api/site/announcement. Header: Authorization: Bearer <access token>.
 *   Publish:  { "content": "text" }        creates a site-wide announcement (1 to 500 characters)
 *   Remove:   { "remove": "<uuid>" }       removes one site-wide announcement
 *
 * Staff only. The caller's own session runs the discard_rank check (moderators and above), so the
 * database decides the rank. Writes use the service role after that check, so the browser never inserts
 * announcements directly.
 */

const MAX_CHARS = 500;

export async function handleSiteAnnouncement(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const env = readSupabaseEnv();
  if (!env) return json({ error: "Announcements are not configured" }, 503);

  const auth = await authenticate(request, env);
  if (!auth.ok) return auth.response;
  const { userId, admin, userClient } = auth;

  const { data: rank, error: rankError } = await userClient.rpc("discard_rank", { _u: userId });
  if (rankError || (rank ?? 0) < 1) return json({ error: "Moderators only" }, 403);

  const body = await readJsonObject(request);
  if (!body) return json({ error: "Expected a JSON object" }, 400);

  if (body["remove"] !== undefined) {
    const id = body["remove"];
    if (typeof id !== "string" || !UUID.test(id)) return json({ error: "Bad announcement" }, 400);
    const { error } = await admin.from("discard_announcements").delete().eq("id", id).eq("sitewide", true);
    if (error) return json({ error: "Could not remove the announcement" }, 500);
    return json({ ok: true }, 200);
  }

  const content = typeof body["content"] === "string" ? body["content"].trim() : "";
  if (content.length < 1 || content.length > MAX_CHARS) {
    return json({ error: `Write 1 to ${MAX_CHARS} characters` }, 400);
  }
  const { data, error } = await admin
    .from("discard_announcements")
    .insert({ user_id: userId, content, sitewide: true })
    .select("id, content, created_at")
    .single();
  if (error) return json({ error: "Could not publish the announcement" }, 500);
  return json({ ok: true, announcement: data }, 200);
}
