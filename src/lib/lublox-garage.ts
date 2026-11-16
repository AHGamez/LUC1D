import type { VehicleKind } from "./lublox-vehicle";
/** Red pad in the plains corner teleports to the garage island; the garage's pad sends you back. */
export const PLAINS_PAD = { x: 108, z: 108 };
export const GARAGE = { x: 0, z: -420 };
export const GARAGE_PAD = { x: GARAGE.x, z: GARAGE.z + 14 };
export const PAD_RADIUS = 2.2;
export const onPad = (p: { x: number; z: number }, pad: { x: number; z: number }) => Math.hypot(p.x - pad.x, p.z - pad.z) <= PAD_RADIUS;
export const inGarage = (p: { z: number }) => p.z < -300;
/** Prices mirror the database club_price function, which is the real source of truth. */
export const GARAGE_CARS: { id: string; kind: VehicleKind; price: number }[] = [
  { id: "lbxcar-ebike", kind: "ebike", price: 1500 },
  { id: "lbxcar-car", kind: "car", price: 3000 },
  { id: "lbxcar-lambo", kind: "lambo", price: 10000 },
];
