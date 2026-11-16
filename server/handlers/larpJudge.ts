import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";

/**
 * POST /api/larp/judge. Judges a Larp Flex battle and writes the verdict.
 *
 * Body: { "id": "<battle uuid>" }. Header: Authorization: Bearer <Supabase access token>.
 * Only the two players of a battle in status `ready` can start judging. The verdict is written
 * with the service-role client, so clients can never set winners or scores.
 *
 * Environment (server only, never VITE_-prefixed):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, LARP_JUDGE_MODEL (optional, default claude-haiku-5-5)
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-5-5";
const PICTURE_BUCKET = "larp-flex";
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;
const JUDGE_FAILED = "The judge couldn't decide. Try again.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOOL_NAME = "record_verdict";

const INSTRUCTIONS =
  "You are the hype judge of LARP FLEX, a playful 1v1 flex battle. Two players flex their belongings, money, grades, skills or anything. Judge on impressiveness, believability (call out obvious larping/fakes in pictures), creativity and drip. Score each 0-100 (no ties), pick a winner, and write a funny 2-3 sentence verdict with roasts that stay friendly. Never reveal private info visible in pictures. Always answer by calling the record_verdict tool.";

/** The verdict is forced through a tool call, so the reply always has this shape. */
const VERDICT_TOOL = {
  name: TOOL_NAME,
  description: "Record the verdict of the battle.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["winner", "challengerScore", "opponentScore", "verdict"],
    properties: {
      winner: { type: "string", enum: ["challenger", "opponent"] },
      challengerScore: { type: "number" },
      opponentScore: { type: "number" },
      verdict: { type: "string" },
    },
  },
} as const;

type AdminClient = SupabaseClient<Database>;
type Side = { flex: string; image: { data: string; mediaType: string } | null };
export type Verdict = { winner: "challenger" | "opponent"; challengerScore: number; opponentScore: number; verdict: string };

/** An error from the judge step. `status` is the upstream HTTP status, used to pick a friendly message. */
class JudgeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "JudgeError";
  }
}

interface Env {
  supabaseUrl: string;
  serviceKey: string;
  anthropicKey: string;
  model: string;
}

function readEnv(): Env | null {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];
  if (!supabaseUrl || !serviceKey || !anthropicKey) return null;
  return { supabaseUrl, serviceKey, anthropicKey, model: process.env["LARP_JUDGE_MODEL"] || DEFAULT_MODEL };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function bearerToken(header: string | null): string | null {
  const m = header?.match(/^Bearer\s+(\S+)$/i);
  return m?.[1] ?? null;
}

/** Downloads a battle picture for the model. A missing or oversized picture is judged without the image. */
async function loadPicture(admin: AdminClient, path: string | null): Promise<Side["image"]> {
  if (!path || path.includes("..") || path.startsWith("/")) return null;
  const { data, error } = await admin.storage.from(PICTURE_BUCKET).download(path);
  if (error || !data) {
    console.error("larp judge: picture download failed");
    return null;
  }
  if (data.size > MAX_PICTURE_BYTES) return null;
  const mediaType = data.type === "image/png" || data.type === "image/webp" ? data.type : "image/jpeg";
  const bytes = Buffer.from(await data.arrayBuffer());
  return { data: bytes.toString("base64"), mediaType };
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

function sideBlocks(label: string, s: Side): ContentBlock[] {
  const blocks: ContentBlock[] = [{ type: "text", text: `${label} flex: ${s.flex || "(no text, picture only)"}` }];
  if (s.image) blocks.push({ type: "image", source: { type: "base64", media_type: s.image.mediaType, data: s.image.data } });
  return blocks;
}

/** Checks the model output against the schema and applies the same clamps as before. */
function normaliseVerdict(raw: unknown): Verdict {
  const o = raw as Partial<Record<keyof Verdict, unknown>>;
  if (o.winner !== "challenger" && o.winner !== "opponent") throw new JudgeError("Bad winner from model", 502);
  if (typeof o.challengerScore !== "number" || typeof o.opponentScore !== "number" || typeof o.verdict !== "string") {
    throw new JudgeError("Bad verdict shape from model", 502);
  }
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));
  return {
    winner: o.winner,
    challengerScore: clamp(o.challengerScore),
    opponentScore: clamp(o.opponentScore),
    verdict: o.verdict.slice(0, 600),
  };
}

/** Pulls the forced tool input out of a Messages API reply. Throws when the model did not call the tool. */
function extractVerdictInput(payload: unknown): unknown {
  const content = (payload as { content?: unknown }).content;
  if (!Array.isArray(content)) throw new JudgeError("Model returned no content", 502);
  for (const block of content as { type?: unknown; name?: unknown; input?: unknown }[]) {
    if (block.type === "tool_use" && block.name === TOOL_NAME && block.input && typeof block.input === "object") {
      return block.input;
    }
  }
  throw new JudgeError("Model returned no verdict", 502);
}

async function askModel(apiKey: string, model: string, topic: string, a: Side, b: Side): Promise<Verdict> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: INSTRUCTIONS,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `Battle topic: ${topic}` }, ...sideBlocks("Challenger", a), ...sideBlocks("Opponent", b)],
        },
      ],
      tools: [VERDICT_TOOL],
      tool_choice: { type: "tool", name: TOOL_NAME },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new JudgeError(`Model request failed with HTTP ${res.status}`, res.status);
  return normaliseVerdict(extractVerdictInput(await res.json()));
}

export async function handleLarpJudge(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const env = readEnv();
  if (!env) return json({ error: "AI is not configured" }, 500);

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return json({ error: "Sign in first" }, 401);

  const admin: AdminClient = createClient<Database>(env.supabaseUrl, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Verify the access token with Supabase itself. Never trust a decoded or client-sent user id.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userErr || !userId) return json({ error: "Sign in first" }, 401);

  let id: unknown;
  try {
    id = ((await request.json()) as { id?: unknown }).id;
  } catch {
    return json({ error: "Bad battle" }, 400);
  }
  if (typeof id !== "string" || !UUID.test(id)) return json({ error: "Bad battle" }, 400);

  const { data: battle, error: readErr } = await admin.from("larp_battles").select("*").eq("id", id).maybeSingle();
  if (readErr) return json({ error: JUDGE_FAILED }, 500);
  if (!battle) return json({ error: "Battle not found" }, 404);
  if (battle.challenger_id !== userId && battle.opponent_id !== userId) {
    return json({ error: "Only the two players can start judging" }, 403);
  }
  if (battle.status !== "ready") {
    return json({ error: battle.status === "done" ? "Already judged" : "Judging already in progress" }, 409);
  }

  // Claim the battle first, so two requests cannot judge it twice.
  const { data: claimed, error: claimErr } = await admin
    .from("larp_battles")
    .update({ status: "judging", updated_at: new Date().toISOString() })
    .eq("id", battle.id)
    .eq("status", "ready")
    .select("id");
  if (claimErr || !claimed?.length) return json({ error: "Judging already in progress" }, 409);

  try {
    const [challengerImage, opponentImage] = await Promise.all([
      loadPicture(admin, battle.challenger_image),
      loadPicture(admin, battle.opponent_image),
    ]);
    const verdict = await askModel(
      env.anthropicKey,
      env.model,
      battle.topic,
      { flex: battle.challenger_flex, image: challengerImage },
      { flex: battle.opponent_flex ?? "", image: opponentImage },
    );

    const { error: writeErr } = await admin
      .from("larp_battles")
      .update({
        status: "done",
        verdict: verdict.verdict,
        challenger_score: verdict.challengerScore,
        opponent_score: verdict.opponentScore,
        winner_id: verdict.winner === "challenger" ? battle.challenger_id : battle.opponent_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", battle.id)
      .eq("status", "judging");
    if (writeErr) throw writeErr;

    return json({ ok: true }, 200);
  } catch (e) {
    // Put the battle back so the players can ask again.
    await admin
      .from("larp_battles")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", battle.id)
      .eq("status", "judging");
    const status = e instanceof JudgeError ? e.status : undefined;
    console.error("larp judge failed", e instanceof Error ? e.message : "unknown error");
    const message =
      status === 402
        ? "The AI judge is out of credits right now."
        : status === 429 || status === 529
          ? "The judge is busy — try again in a minute."
          : JUDGE_FAILED;
    return json({ error: message }, 502);
  }
}
