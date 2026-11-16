export type BlockKind = "platform" | "hazard" | "goal" | "car" | "lambo" | "ebike" | "sword" | "gun";
export type Block = {
  kind: BlockKind;
  x: number;
  y: number;
  z: number;
  color?: string;
  accent?: string;
  size?: [number, number, number];
  rotation?: [number, number, number];
};

type Range = readonly [number, number];
const KINDS: readonly string[] = ["platform", "hazard", "goal", "car", "lambo", "ebike", "sword", "gun"];
const POSITION_X: Range = [-40, 40];
const POSITION_Y: Range = [0, 30];
const SIZE: [Range, Range, Range] = [
  [0.05, 80],
  [0.05, 60],
  [0.05, 80],
];
const TURN: Range = [-Math.PI, Math.PI];
const HEX = /^#[0-9a-fA-F]{6}$/;

const inRange = (v: unknown, [lo, hi]: Range): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
function triple(v: unknown, ranges: readonly [Range, Range, Range]): [number, number, number] | null {
  if (!Array.isArray(v) || v.length !== 3) return null;
  const [a, b, c] = v as unknown[];
  return inRange(a, ranges[0]) && inRange(b, ranges[1]) && inRange(c, ranges[2]) ? [a, b, c] : null;
}
const hex = (v: unknown): string | null => (typeof v === "string" && HEX.test(v) ? v : null);

/** Validates one saved block. Unknown keys are dropped, as the original schema did. */
function parseBlock(raw: unknown): Block | null {
  if (typeof raw !== "object" || raw === null) return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.kind !== "string" || !KINDS.includes(b.kind)) return null;
  if (!inRange(b.x, POSITION_X) || !inRange(b.y, POSITION_Y) || !inRange(b.z, POSITION_X)) return null;
  const block: Block = { kind: b.kind as BlockKind, x: b.x, y: b.y, z: b.z };
  if (b.color !== undefined) {
    const color = hex(b.color);
    if (!color) return null;
    block.color = color;
  }
  if (b.accent !== undefined) {
    const accent = hex(b.accent);
    if (!accent) return null;
    block.accent = accent;
  }
  if (b.size !== undefined) {
    const size = triple(b.size, SIZE);
    if (!size) return null;
    block.size = size;
  }
  if (b.rotation !== undefined) {
    const rotation = triple(b.rotation, [TURN, TURN, TURN]);
    if (!rotation) return null;
    block.rotation = rotation;
  }
  return block;
}

export type WorldParse = { success: true; data: Block[] } | { success: false; error: Error };

/**
 * Validates a whole world: at most 200 blocks, each block inside the world limits.
 * Stands in for the original zod schema (no runtime dependency needed). The database
 * check constraint lublox_valid_world enforces the same rules on save.
 */
function safeParseWorld(raw: unknown): WorldParse {
  if (!Array.isArray(raw) || raw.length > 200) return { success: false, error: new Error("Keep worlds to 200 blocks or fewer.") };
  const data: Block[] = [];
  for (const item of raw) {
    const block = parseBlock(item);
    if (!block) return { success: false, error: new Error("Keep blocks inside the world limits.") };
    data.push(block);
  }
  return { success: true, data };
}

export const worldSchema = {
  safeParse: safeParseWorld,
  parse(raw: unknown): Block[] {
    const result = safeParseWorld(raw);
    if (!result.success) throw result.error;
    return result.data;
  },
};
export const STARTER: Block[] = [
  { kind: "platform", x: 0, y: 0, z: 0 },
  { kind: "platform", x: 0, y: 1, z: -5 },
  { kind: "platform", x: 4, y: 2, z: -9 },
  { kind: "platform", x: -1, y: 3, z: -13 },
  { kind: "platform", x: -5, y: 4, z: -17 },
  { kind: "goal", x: 0, y: 5, z: -21 },
];
export function movement(keys: Set<string>) {
  const x =
    Number(keys.has("KeyD") || keys.has("ArrowRight")) -
    Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  const z =
    Number(keys.has("KeyS") || keys.has("ArrowDown")) -
    Number(keys.has("KeyW") || keys.has("ArrowUp"));
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}
export function shouldMountLublox(id: string, activeId: string | null) {
  return (id !== "lublox" && id !== "lublox-studio") || id === activeId;
}
export function cameraRelative(move: { x: number; z: number }, yaw: number) {
  const c = Math.cos(yaw),
    s = Math.sin(yaw);
  return { x: move.x * c + move.z * s, z: -move.x * s + move.z * c };
}
export type LbxSlot = "hat" | "shirt" | "pants";
export type LbxItem = { id: string; name: string; price: number; slot: LbxSlot; color: string; gift?: boolean };
/** Prices mirror the database club_price function, which is the real source of truth. */
export const LBX_ITEMS: LbxItem[] = [
  { id: "lbxhat-cap", name: "Ball Cap", price: 200, slot: "hat", color: "#2f6fd6" },
  { id: "lbxhat-cone", name: "Party Cone", price: 300, slot: "hat", color: "#e85d9a" },
  { id: "lbxhat-tophat", name: "Top Hat", price: 500, slot: "hat", color: "#1b1b1f" },
  { id: "lbxhat-crown", name: "Gold Crown", price: 2000, slot: "hat", color: "#f2c230" },
  { id: "lbxhat-headphones", name: "Gamer Headphones", price: 600, slot: "hat", color: "#2b2d36" },
  { id: "lbxhat-wizard", name: "Wizard Hat", price: 800, slot: "hat", color: "#4b3bb3" },
  { id: "lbxhat-viking", name: "Viking Helmet", price: 900, slot: "hat", color: "#9aa3ad" },
  { id: "lbxhat-halo", name: "Glowing Halo", price: 1200, slot: "hat", color: "#ffe680" },
  { id: "lbxhat-horns", name: "Fire Horns", price: 1800, slot: "hat", color: "#e0452b" },
  { id: "lbxhat-dominus", name: "Dominus", price: 5000, slot: "hat", color: "#20232b" },
  { id: "lbxhat-santa", name: "Santa Hat", price: 0, slot: "hat", color: "#d62828", gift: true },
  { id: "lbxshirt-red", name: "Red Tee", price: 150, slot: "shirt", color: "#d63b3b" },
  { id: "lbxshirt-green", name: "Leaf Hoodie", price: 150, slot: "shirt", color: "#3a9a4a" },
  { id: "lbxshirt-black", name: "Night Jacket", price: 300, slot: "shirt", color: "#222228" },
  { id: "lbxshirt-gold", name: "Gold Suit", price: 1500, slot: "shirt", color: "#d9a520" },
  { id: "lbxshirt-hoodie", name: "Grey Hoodie", price: 400, slot: "shirt", color: "#8d929b" },
  { id: "lbxpants-baggy", name: "Baggy Jeans", price: 350, slot: "pants", color: "#3d5f8f" },
];
export type Avatar = { hat: string; shirt: string; pants: string; name: string };

export const VEHICLE_BLOCKS = ["car", "lambo", "ebike"] as const;
export const WEAPON_BLOCKS = ["sword", "gun"] as const;
export type WeaponKind = (typeof WEAPON_BLOCKS)[number];
export const isVehicleBlock = (k: Block["kind"]): k is (typeof VEHICLE_BLOCKS)[number] => (VEHICLE_BLOCKS as readonly string[]).includes(k);
export const isWeaponBlock = (k: Block["kind"]): k is WeaponKind => (WEAPON_BLOCKS as readonly string[]).includes(k);
/** Within this distance (world units) a player picks up a weapon. */
export const PICKUP_RANGE = 1.8;
export function canPickUp(p: { x: number; y: number; z: number }, w: { x: number; y: number; z: number }) {
  return Math.hypot(p.x - w.x, p.y - w.y, p.z - w.z) <= PICKUP_RANGE;
}
