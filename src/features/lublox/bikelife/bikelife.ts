/** Bikelife Mayhem rules: plain TS, no React/three. */
export type BikeId = "surron" | "talaria" | "hybike" | "villain" | "yozma";
export type Trick = "none" | "knee" | "seat" | "one" | "nohand";
export const BIKES: Record<BikeId, { name: string; color: string; accent: string; max: number; accel: number; turn: number; travel: number }> = {
  surron: { name: "Sur-Ron Light Bee X", color: "#2b2d31", accent: "#9aa0a6", max: 22, accel: 11, turn: 2.6, travel: 0.2 },
  talaria: { name: "Talaria Sting R", color: "#1d4fd1", accent: "#d4a52a", max: 24, accel: 12, turn: 2.5, travel: 0.22 },
  hybike: { name: "HyBike Hyper", color: "#e0262b", accent: "#f2f2f2", max: 21, accel: 13, turn: 2.8, travel: 0.18 },
  villain: { name: "Villain", color: "#5b2a86", accent: "#16f08f", max: 26, accel: 12.5, turn: 2.4, travel: 0.24 },
  yozma: { name: "Yozma IN10", color: "#f0f0f0", accent: "#ff7a00", max: 25, accel: 12, turn: 2.5, travel: 0.23 },
};
/** Wheelie up to 100 degrees is allowed; past that you loop out. */
export const MAX_WHEELIE = (100 * Math.PI) / 180;
export const WHEELIE_RISE = 1.1, WHEELIE_DROP = 2.2, GRAVITY = 22, DRAG = 0.6;
export const TRICK_KEYS: Record<string, Trick> = { Digit1: "knee", Digit2: "seat", Digit3: "one", Digit4: "nohand" };
export const TRICK_MULT: Record<Trick, number> = { none: 1, knee: 1.5, seat: 2, one: 2.5, nohand: 3.5 };
export const TRICK_NAME: Record<Trick, string> = { none: "Wheelie", knee: "Knee knocker", seat: "Seat stand", one: "One hander", nohand: "No hander" };
/** Cents per second of wheelie at full angle, before trick multiplier. */
export const CENTS_PER_SEC = 6, AIR_CENTS_PER_SEC = 10;
/** Most a single cash-out can pay (cents), and the most a player can earn per day (cents). Mirrors bikelife_cash. */
export const PAYOUT_MAX = 200, DAILY_MAX_CENTS = 2500;

export type Ramp = { x: number; z: number; w: number; len: number; h: number };
export const RAMPS: Ramp[] = [
  { x: 0, z: 40, w: 6, len: 10, h: 2.4 }, { x: -30, z: -20, w: 6, len: 12, h: 3.2 },
  { x: 35, z: -45, w: 8, len: 14, h: 4 }, { x: -50, z: 55, w: 6, len: 9, h: 2 }, { x: 60, z: 30, w: 7, len: 12, h: 3 },
];
export const ARENA = 95;
/** Ramps rise along +z; the drop off the back is a cliff so riders launch. */
export function groundHeight(x: number, z: number) {
  for (const r of RAMPS) {
    if (Math.abs(x - r.x) <= r.w / 2 && z >= r.z - r.len / 2 && z <= r.z + r.len / 2) return ((z - (r.z - r.len / 2)) / r.len) * r.h;
  }
  return 0;
}
export type BikeState = { x: number; z: number; y: number; vy: number; yaw: number; speed: number; pitch: number; air: boolean; fork: number; forkV: number };
export type BikeInput = { throttle: number; steer: number; wheelie: boolean };
export function newBike(): BikeState { return { x: 0, z: 0, y: 0, vy: 0, yaw: 0, speed: 0, pitch: 0, air: false, fork: 0, forkV: 0 }; }

export type StepResult = { s: BikeState; looped: boolean; landed: number };
export function stepBike(p: BikeState, input: BikeInput, bike: BikeId, dtRaw: number): StepResult {
  const dt = Math.min(dtRaw, 0.05), spec = BIKES[bike];
  const s = { ...p };
  if (!s.air) {
    s.speed += input.throttle * spec.accel * dt * (input.throttle < 0 && s.speed > 0 ? 1.6 : 1);
    s.speed = Math.max(-6, Math.min(spec.max, s.speed)) * Math.exp(-DRAG * dt * (input.throttle === 0 ? 1.5 : 0.3));
    s.yaw -= input.steer * spec.turn * dt * Math.min(1, Math.abs(s.speed) / 6) * Math.sign(s.speed || 1);
  }
  s.x = Math.max(-ARENA, Math.min(ARENA, s.x + Math.sin(s.yaw) * s.speed * dt));
  s.z = Math.max(-ARENA, Math.min(ARENA, s.z + Math.cos(s.yaw) * s.speed * dt));
  const g = groundHeight(s.x, s.z);
  let landed = 0, looped = false;
  if (s.air) {
    s.vy -= GRAVITY * dt; s.y += s.vy * dt;
    if (s.y <= g) { landed = -s.vy; s.y = g; s.vy = 0; s.air = false; s.forkV -= Math.min(landed, 14) * 0.6; }
  } else {
    const vy = (g - p.y) / Math.max(dt, 1e-4);
    if (g < p.y - 0.05) { s.air = true; s.vy = Math.max(p.vy, 0); s.y = p.y; } else { s.y = g; s.vy = vy; }
  }
  // Wheelie: rises while held with speed, past MAX_WHEELIE you loop out.
  const holding = input.wheelie && (s.speed > 2 || s.air);
  s.pitch = holding ? s.pitch + WHEELIE_RISE * dt * (s.pitch > 1 ? 0.6 : 1) : Math.max(0, s.pitch - WHEELIE_DROP * dt);
  if (s.pitch > MAX_WHEELIE) { looped = true; s.pitch = 0; s.speed = 0; }
  // Suspension spring-damper; braking dives the fork.
  if (input.throttle < 0 && s.speed > 1 && !s.air) s.forkV -= 3 * dt;
  s.forkV += (-90 * s.fork - 10 * s.forkV) * dt;
  s.fork = Math.max(-spec.travel, Math.min(spec.travel * 0.4, s.fork + s.forkV * dt));
  return { s, looped, landed };
}
/** Cents earned this frame for wheelie/air stunts. */
export function trickCents(s: BikeState, trick: Trick, dt: number) {
  const w = s.pitch > 0.25 ? (s.pitch / MAX_WHEELIE) * CENTS_PER_SEC : 0;
  const a = s.air ? AIR_CENTS_PER_SEC : 0;
  return (w + a) * TRICK_MULT[trick] * Math.min(dt, 0.05);
}
/** Whole cents to send to bikelife_cash this tick: the bank, capped at one payout. */
export function payoutRequest(bankCents: number): number {
  return Math.floor(Math.min(bankCents, PAYOUT_MAX));
}
