/** Arcade vehicle physics for Lublox (no React / three). Drifting = holding the handbrake lowers side grip. */
export type VehicleKind = "car" | "lambo" | "ebike" | "sleigh";

export type VehicleState = { x: number; z: number; yaw: number; vx: number; vz: number; y?: number };
export type VehicleInput = { throttle: number; steer: number; handbrake: boolean };
export const VEHICLE_SPECS: Record<VehicleKind, { accel: number; max: number; turn: number; grip: number; driftGrip: number; drag: number; label: string }> = {
  car: { accel: 22, max: 26, turn: 2.4, grip: 9, driftGrip: 0.9, drag: 0.6, label: "Car" },
  lambo: { accel: 30, max: 38, turn: 2.2, grip: 8, driftGrip: 0.8, drag: 0.5, label: "Lamborghini" },
  ebike: { accel: 16, max: 17, turn: 3.2, grip: 12, driftGrip: 2.5, drag: 0.8, label: "E-bike" },
  sleigh: { accel: 20, max: 30, turn: 2.0, grip: 5, driftGrip: 5, drag: 0.6, label: "Santa Sleigh" },
};
export const MAP_LIMIT = 140;
export function stepVehicle(s: VehicleState, input: VehicleInput, kind: VehicleKind, dtRaw: number): VehicleState {
  const spec = VEHICLE_SPECS[kind];
  const dt = Math.min(dtRaw, 0.05);
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  let vx = s.vx + fx * spec.accel * input.throttle * dt;
  let vz = s.vz + fz * spec.accel * input.throttle * dt;
  let fwd = vx * fx + vz * fz;
  let lat = vx * fz - vz * fx;
  fwd *= Math.exp(-(input.handbrake ? spec.drag * 2 : spec.drag) * dt);
  fwd = Math.max(-spec.max * 0.4, Math.min(spec.max, fwd));
  lat *= Math.exp(-(input.handbrake ? spec.driftGrip : spec.grip) * dt);
  const speedFactor = Math.max(-1, Math.min(1, fwd / 8));
  const yaw = s.yaw + input.steer * spec.turn * speedFactor * dt * (input.handbrake ? 1.35 : 1);
  vx = fx * fwd + fz * lat;
  vz = fz * fwd - fx * lat;
  const clamp = (v: number) => Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, v));
  return { x: clamp(s.x + vx * dt), z: clamp(s.z + vz * dt), yaw, vx, vz };
}
/** Sideways speed, used for tire-screech and drift smoke. */
export function slipSpeed(s: VehicleState) {
  return Math.abs(s.vx * Math.cos(s.yaw) - s.vz * Math.sin(s.yaw));
}
/** E-bike wheelie: holding raises the front, past LOOP_ANGLE the rider loops out and falls off. */
export const WHEELIE_RISE = 0.85, WHEELIE_DROP = 2.4, LOOP_ANGLE = 1.25;
export type BikeTrick = "none" | "knee" | "seat" | "one" | "nohand";
export const TRICK_KEYS: Record<string, BikeTrick> = { Digit1: "knee", Digit2: "seat", Digit3: "one", Digit4: "nohand" };
export function stepWheelie(angle: number, holding: boolean, speed: number, dtRaw: number) {
  const dt = Math.min(dtRaw, 0.05);
  const next = holding && speed > 2 ? angle + WHEELIE_RISE * dt : Math.max(0, angle - WHEELIE_DROP * dt);
  return next > LOOP_ANGLE ? { angle: 0, looped: true } : { angle: next, looped: false };
}

/** Santa sleigh flight: Space climbs, C descends, it hovers at its altitude otherwise. */
export const SLEIGH_CLIMB = 9, SLEIGH_CEILING = 70;
export function stepSleigh(s: VehicleState, input: { throttle: number; steer: number; climb: number }, dtRaw: number): VehicleState {
  const dt = Math.min(dtRaw, 0.05);
  const flat = stepVehicle(s, { throttle: input.throttle, steer: input.steer, handbrake: false }, "sleigh", dtRaw);
  const y = Math.max(0, Math.min(SLEIGH_CEILING, (s.y ?? 0) + input.climb * SLEIGH_CLIMB * dt));
  return { ...flat, y };
}
