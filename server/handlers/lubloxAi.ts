import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";
import {
  AI_SYSTEM_PROMPT,
  AI_TOOL,
  AI_TOOL_NAME,
  aiUserMessage,
  MAX_AI_BLOCKS,
  MAX_AI_PROMPT,
  parseAiWorld,
  type AiWorldReply,
} from "../../src/features/lublox/ai/aiWorld";
import { worldSchema, type Block } from "../../src/features/lublox/lublox";

/**
 * POST /api/lublox/ai. Builds or edits a Lublox world from a builder's request (the Studio AI helper).
 *
 * Body: { "prompt": string (1-800 characters), "blocks": Block[] (the current world) }.
 * Header: Authorization: Bearer <Supabase access token>.
 * Reply: { "reply": string, "blocks": Block[], "left": number } where `left` is the AI messages left today.
 *
 * The rules live in the database and are checked as the caller, never with the service role:
 *   - lublox_can_create: only Lublox builders may use the helper.
 *   - lublox_ai_take: the daily allowance (migration 0050, limit in lublox_ai_limit()). The count is
 *     taken before the model is called, so a request that is over the limit never reaches the model.
 * The world is validated against the Lublox block rules before it is returned. The client is not trusted.
 *
 * Environment (server only):
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (the public anon key; the VITE_ names are used as fallbacks),
 *   ANTHROPIC_API_KEY, LUBLOX_AI_MODEL (optional, default claude-haiku-5-5)
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 8192;
const TIMEOUT_MS = 90_000;
const FAILED = "The AI helper couldn't finish. Try again.";

type UserDb = SupabaseClient<Database>;

interface Env {
  url: string;
  key: string;
  anthropicKey: string;
  model: string;
}

/** An upstream failure. `status` is the model HTTP status, used to pick a friendly message. */
class ModelError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ModelError";
  }
}

/** The model answered, but not with a usable world. */
class GarbledReply extends Error {
  constructor() {
    super("garbled reply");
    this.name = "GarbledReply";
  }
}

function readEnv(): Env | null {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];
  if (!url || !key || !anthropicKey) return null;
  return { url, key, anthropicKey, model: process.env["LUBLOX_AI_MODEL"] || DEFAULT_MODEL };
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

/** Reads and validates the request body. Returns null when anything is wrong. */
async function readRequest(request: Request): Promise<{ prompt: string; blocks: Block[] } | null> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as { prompt?: unknown; blocks?: unknown };
  if (typeof o.prompt !== "string") return null;
  const prompt = o.prompt.trim();
  if (!prompt || prompt.length > MAX_AI_PROMPT) return null;
  const world = worldSchema.safeParse(o.blocks);
  if (!world.success) return null;
  return { prompt, blocks: world.data };
}

/** Calls the Messages API with the world tool forced, so the reply always has the tool's shape. */
async function askModel(env: Env, prompt: string, blocks: Block[]): Promise<AiWorldReply> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": env.anthropicKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.model,
      max_tokens: MAX_TOKENS,
      system: AI_SYSTEM_PROMPT,
      messages: [{ role: "user", content: aiUserMessage(prompt, blocks) }],
      tools: [AI_TOOL],
      tool_choice: { type: "tool", name: AI_TOOL_NAME },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new ModelError(`Model request failed with HTTP ${res.status}`, res.status);

  const payload = (await res.json()) as { content?: unknown };
  const content = Array.isArray(payload.content) ? (payload.content as { type?: unknown; name?: unknown; input?: unknown }[]) : [];
  for (const block of content) {
    if (block.type === "tool_use" && block.name === AI_TOOL_NAME) {
      try {
        return parseAiWorld(block.input);
      } catch {
        throw new GarbledReply();
      }
    }
  }
  throw new GarbledReply();
}

function modelFailure(e: unknown): Response {
  if (e instanceof GarbledReply || e instanceof SyntaxError) return json({ error: "The helper's answer was garbled. Try again." }, 502);
  if (e instanceof ModelError) {
    if (e.status === 402) return json({ error: "AI credits ran out. Add credits to keep using the helper." }, 503);
    if (e.status === 429 || e.status === 529) return json({ error: "The AI helper is busy. Try again in a minute." }, 503);
  }
  console.error("lublox ai failed", e instanceof Error ? e.name : "unknown error");
  return json({ error: FAILED }, 502);
}

export async function handleLubloxAi(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const env = readEnv();
  if (!env) return json({ error: "AI is not configured" }, 500);

  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return json({ error: "Sign in first." }, 401);

  // A client that carries the caller's token, so auth.uid() inside the RPCs is the caller.
  const db: UserDb = createClient<Database>(env.url, env.key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Verify the token with Supabase itself. Never trust a client-sent user id.
  const { data: userData, error: userErr } = await db.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "Sign in first." }, 401);

  const input = await readRequest(request);
  if (!input) return json({ error: "Send a request of 1 to 800 characters with a valid world." }, 400);

  const { data: canCreate, error: canErr } = await db.rpc("lublox_can_create");
  if (canErr) return json({ error: "Couldn't check your Lublox access. Try again." }, 500);
  if (!canCreate) return json({ error: "Only Lublox builders can use the AI helper." }, 403);

  // Takes one message from today's allowance. Returns -1 when the day's limit is used up.
  const { data: taken, error: limitErr } = await db.rpc("lublox_ai_take");
  if (limitErr) return json({ error: "Couldn't check your AI helper limit. Try again." }, 500);
  if ((taken ?? -1) < 0) return json({ error: "You've used all your AI helper messages for today. They reset at midnight UTC." }, 429);
  const left = taken ?? 0;

  try {
    const world = await askModel(env, input.prompt, input.blocks);
    if (!world.blocks.length) return json({ error: "The helper didn't make any usable blocks. Try rewording." }, 422);
    return json({ reply: world.reply, blocks: world.blocks.slice(0, MAX_AI_BLOCKS), left }, 200);
  } catch (e) {
    return modelFailure(e);
  }
}
