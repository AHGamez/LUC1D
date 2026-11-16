import { worldSchema, type Block } from "../lublox";

/** Longest request the helper accepts from a builder. */
export const MAX_AI_PROMPT = 800;
/** A world never has more blocks than this. */
export const MAX_AI_BLOCKS = 200;
/** Longest reply text kept for the panel. */
export const MAX_AI_REPLY = 600;

export const AI_TOOL_NAME = "build_world";

/** Instructions for the model. Kept in step with the block rules in lublox.ts. */
export const AI_SYSTEM_PROMPT = `You are the Lublox Studio AI helper. You build and edit block-only 3D obby worlds.
A world is a JSON array (max 200) of blocks: {"kind":"platform"|"hazard"|"goal"|"car"|"lambo"|"ebike"|"sword"|"gun","color"?:"#rrggbb","accent"?:"#rrggbb","x":-40..40,"y":0..30,"z":-40..40,"size"?:[w 0.05..80,h 0.05..60,d 0.05..80],"rotation"?:[rx,ry,rz radians -3.14..3.14]}.
Default size is [3,0.5,3]. Players spawn near (0,2,0), jump about 2.5 high and 4 across. hazard = kills on touch (lava), goal = finish.
Vehicles: car (regular), lambo (2000s Lamborghini supercar), ebike (dirt e-bike) sit on the ground (y 0), players drive them; customize with "color" and face them with rotation[1]. Weapons: sword and gun are pickups players grab by walking into them; "color" = blade/body, "accent" = hilt/grip trim. Only these kinds exist; build anything else out of platforms.
Keep jumps possible and include exactly one goal. Always answer by calling the build_world tool with the reply and the full new world.`;

/** The model answers through this forced tool call, so the reply always has this shape. */
export const AI_TOOL = {
  name: AI_TOOL_NAME,
  description: "Return a short note of what changed and the full new world.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply", "blocks"],
    properties: {
      reply: { type: "string", description: "A short friendly note of what you changed." },
      blocks: { type: "array", maxItems: MAX_AI_BLOCKS, items: { type: "object" }, description: "The full new world." },
    },
  },
} as const;

/** The user turn sent to the model: the current world and the builder's request. */
export function aiUserMessage(prompt: string, blocks: readonly Block[]): string {
  return `Current world:\n${JSON.stringify(blocks)}\n\nRequest: ${prompt}`;
}

export type AiWorldReply = { reply: string; blocks: Block[] };

/**
 * Checks the model's tool input. Each block is validated on its own, so one bad block is dropped
 * instead of losing the whole world. Returns an empty `blocks` array when nothing was usable.
 * Throws a TypeError when the shape itself is wrong.
 */
export function parseAiWorld(raw: unknown): AiWorldReply {
  if (typeof raw !== "object" || raw === null) throw new TypeError("Reply is not an object");
  const o = raw as { reply?: unknown; blocks?: unknown };
  if (typeof o.reply !== "string" || !Array.isArray(o.blocks)) throw new TypeError("Reply has the wrong shape");
  const blocks: Block[] = [];
  for (const item of o.blocks) {
    const r = worldSchema.safeParse([item]);
    if (r.success && r.data.length === 1) blocks.push(r.data[0]);
    if (blocks.length >= MAX_AI_BLOCKS) break;
  }
  return { reply: o.reply.slice(0, MAX_AI_REPLY), blocks };
}
