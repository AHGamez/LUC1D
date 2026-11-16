import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, RoundedBox, Sky } from "@react-three/drei";
import { CapsuleCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { Button } from "../../components/ui/Button";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Car, Lock, LogOut, Maximize, Minimize, Menu, RotateCcw, Users } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { slipSpeed, stepSleigh, stepVehicle, stepWheelie, TRICK_KEYS, type BikeTrick, VEHICLE_SPECS, type VehicleKind, type VehicleState } from "../../lib/lublox-vehicle";
import type { Group } from "three";
import { lbxSound } from "./lublox-sound";
import { allFound, nearPresent, PRESENTS, snowActive, TREES } from "../../lib/lublox-xmas";
import { BufferAttribute, CanvasTexture, RepeatWrapping, SRGBColorSpace, Vector3, type Points } from "three";
import { useLubloxXmas } from "./xmas-gate";
import { Bullets, fire, HeldWeapon, WeaponPickup, type Held } from "./weapons";
import { usePlainsRoom, type Remote, type Spawned, type Vec } from "./multiplayer";
type Drive = { id: string; kind: VehicleKind } | null;
type VMap = Map<string, VehicleState>;
type Role = "it" | "king" | "peasant" | undefined;
import { ShirtDetail, isBaggy, sleeveLength } from "./clothes";
import { Hat } from "./hat";

import { HOUSES, nearestPlot, PLOT_PRICE, PLOT_SIZE, PLOTS } from "../../lib/lublox-plots";
import { GARAGE, GARAGE_CARS, GARAGE_PAD, inGarage, onPad, PAD_RADIUS, PLAINS_PAD } from "../../lib/lublox-garage";
import { cameraRelative, LBX_ITEMS, movement, type Avatar, type Block , canPickUp, isVehicleBlock, isWeaponBlock } from "./lublox";
const itemColor = (id: string) => LBX_ITEMS.find((i) => i.id === id)?.color;
type Look = { yaw: number; pitch: number; lock: boolean; dist: number };
const STEP_DIST = 1.8;
// Where the in-game chat dock keeps its size between visits.
const SPEED = 7,
  JUMP = 9;
// Shared stud texture so every part looks like a classic studded brick.
let studCanvas: HTMLCanvasElement | null = null;
function studTexture(w: number, d: number) {
  if (!studCanvas) {
    studCanvas = document.createElement("canvas");
    studCanvas.width = studCanvas.height = 64;
    const c = studCanvas.getContext("2d");
    if (c) {
      c.fillStyle = "#ffffff";
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = "#d9d9d9";
      c.beginPath();
      c.arc(32, 32, 14, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#f2f2f2";
      c.beginPath();
      c.arc(30, 30, 10, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#cfcfcf";
      c.strokeRect(0, 0, 64, 64);
    }
  }
  const t = new CanvasTexture(studCanvas);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(Math.max(1, Math.round(w * 1.2)), Math.max(1, Math.round(d * 1.2)));
  t.colorSpace = SRGBColorSpace;
  return t;
}
function Brick({ size, color }: { size: [number, number, number]; color: string }) {
  const tex = useMemo(() => studTexture(size[0], size[2]), [size[0], size[2]]);
  useEffect(() => () => tex.dispose(), [tex]);
  return <meshStandardMaterial color={color} map={tex} roughness={0.55} />;
}
type Palette = Record<"sky" | "ground" | "grid" | "platform" | "hazard" | "goal" | "body", string>;
function World({
  blocks,
  palette,
  onSelect,
  plains = false,
  plotRows = [],
}: {
  blocks: Block[];
  palette: Palette;
  onSelect?: ((i: number) => void) | undefined;
  plains?: boolean;
  plotRows?: PlotRow[];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = plains ? "#5fae45" : palette.ground;
      ctx.fillRect(0, 0, 128, 128);
      if (plains) {
        for (let i = 0; i < 260; i++) {
          ctx.fillStyle = ["#4f9a3a", "#6dbd52", "#7cc95e", "#458a33"][i % 4]!;
          ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 5);
        }
      } else {
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 128, 128);
      for (let x = 16; x < 128; x += 32)
        for (let y = 16; y < 128; y += 32) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    const tex = new CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(plains ? 72 : 24, plains ? 72 : 24);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [palette, plains]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -1, 0]} receiveShadow>
          <boxGeometry args={plains ? [290, 1, 290] : [96, 1, 96]} />
          <meshStandardMaterial map={texture} roughness={0.9} />
        </mesh>
      </RigidBody>
      {blocks.map((b, i) =>
        isVehicleBlock(b.kind) || isWeaponBlock(b.kind) ? (
          onSelect ? (
            <group
              key={`${i}-${JSON.stringify(b)}`}
              position={[b.x, isVehicleBlock(b.kind) ? b.y - 0.5 : b.y, b.z]}
              rotation={b.rotation ?? [0, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(i);
              }}
            >
              {b.kind === "car" ? <CarModel color={b.color ?? "#d23a2f"} /> : b.kind === "lambo" ? <LamboModel color={b.color ?? "#f2b705"} /> : b.kind === "ebike" ? <EbikeModel color={b.color ?? "#2f6fd6"} /> : <WeaponPickup kind={b.kind as "sword" | "gun"} color={b.color ?? "#c9ccd1"} accent={b.accent ?? "#d4a52a"} position={[0, 0, 0]} />}
            </group>
          ) : null
        ) : (
        <RigidBody
          key={`${i}-${JSON.stringify(b)}`}
          type="fixed"
          colliders="cuboid"
          position={[b.x, b.y, b.z]}
          rotation={b.rotation ?? [0, 0, 0]}
          userData={{ kind: b.kind }}
        >
          <mesh
            castShadow
            receiveShadow
            onClick={(e) => {
              if (!onSelect) return;
              e.stopPropagation();
              onSelect(i);
            }}
          >
            <boxGeometry args={b.size ?? [3.5, 0.65, 3.5]} />
            <Brick size={(b.size ?? [3.5, 0.65, 3.5]) as [number, number, number]} color={palette[b.kind]} />
          </mesh>
          {b.kind === "goal" && (
            <mesh position={[0, (b.size?.[1] ?? 0.65) / 2 + 1.2, 0]}>
              <torusGeometry args={[0.75, 0.13, 8, 24]} />
              <meshStandardMaterial color={palette.goal} />
            </mesh>
          )}
        </RigidBody>
        ),
      )}
      {plains && <Plains />}
      {plains && <Garage />}
      {plains && <Plots rows={plotRows} />}
    </>
  );
}
function House({ position, rot = 0, wall = "#e8d6b0", roof = "#a8432f" }: { position: [number, number, number]; rot?: number; wall?: string; roof?: string }) {
  return (
    <>
      {/* House: walls with a door gap, pitched roof, chimney */}
      <group position={position} rotation={[0, rot, 0]}>
        {([
          [0, 1.5, -3, 8, 3, 0.4],
          [-4, 1.5, 0, 0.4, 3, 6],
          [4, 1.5, 0, 0.4, 3, 6],
          [-2.6, 1.5, 3, 2.8, 3, 0.4],
          [2.6, 1.5, 3, 2.8, 3, 0.4],
          [0, 2.6, 3, 2.4, 0.8, 0.4],
        ] as const).map(([x, y, z, w, h, d], i) => (
          <RigidBody key={i} type="fixed" colliders="cuboid" position={[x, y - 0.5, z]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={wall} roughness={0.85} />
            </mesh>
          </RigidBody>
        ))}
        <mesh position={[0, 2.55, 3.05]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color={wall} />
        </mesh>
        {[-1, 1].map((s) => (
          <RigidBody key={s} type="fixed" colliders="cuboid" position={[s * 2.3, 3.8, 0]} rotation={[0, 0, -s * 0.6]}>
            <mesh castShadow>
              <boxGeometry args={[5.6, 0.3, 7]} />
              <meshStandardMaterial color={roof} roughness={0.7} />
            </mesh>
          </RigidBody>
        ))}
        <mesh position={[2.4, 4.6, -1.5]} castShadow>
          <boxGeometry args={[0.7, 1.6, 0.7]} />
          <meshStandardMaterial color="#7a6a5c" />
        </mesh>
        <mesh position={[0, 0.9, 3.2]}>
          <boxGeometry args={[1.8, 0.05, 0.05]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
        {[-2.6, 2.6].map((x) => (
          <mesh key={x} position={[x, 1.6, 3.22]}>
            <boxGeometry args={[1, 0.9, 0.05]} />
            <meshStandardMaterial color="#9fd3f0" roughness={0.1} metalness={0.2} />
          </mesh>
        ))}
        <mesh position={[0, -0.47, 0]} receiveShadow>
          <boxGeometry args={[7.6, 0.06, 5.6]} />
          <meshStandardMaterial color="#8a5a32" roughness={0.8} />
        </mesh>
      </group>
    </>
  );
}
const rand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};
function Tree({ x, z, s }: { x: number; z: number; s: number }) {
  // Christmas tree: stacked cones, a star and a few baubles (kept low-poly for Chromebooks).
  return (
    <RigidBody type="fixed" colliders="cuboid" position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 1.4, 6]} />
        <meshStandardMaterial color="#6b4423" roughness={0.95} />
      </mesh>
      {[[1.9, 1.2, 1.4], [1.5, 2.3, 2.6], [1.05, 3.3, 3.7]].map(([r0, h, y], i) => (
        <mesh key={i} position={[0, y! - 0.6, 0]} castShadow={i === 0}>
          <coneGeometry args={[r0!, h!, 8]} />
          <meshStandardMaterial color={i === 1 ? "#24703a" : "#1f6432"} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 4.35, 0]}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#ffd54a" emissive="#ffc400" emissiveIntensity={0.8} />
      </mesh>
      {[[1.2, 0.4, 0, "#d62828"], [-0.9, 1.2, 0.6, "#f2c230"], [0.2, 2.2, -0.85, "#2f6fd6"], [-0.5, 0.5, -1.2, "#f5f5f5"]].map(([bx, by, bz, c], i) => (
        <mesh key={`b${i}`} position={[bx as number, by as number, bz as number]}>
          <sphereGeometry args={[0.16, 6, 6]} />
          <meshStandardMaterial color={c as string} metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
    </RigidBody>
  );
}
function GreenTree({ x, z, s }: { x: number; z: number; s: number }) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.38, 2.2, 8]} />
        <meshStandardMaterial color="#6b4423" roughness={0.95} />
      </mesh>
      <RoundedBox args={[2.8, 1.6, 2.8]} radius={0.35} position={[0, 2.3, 0]} castShadow>
        <meshStandardMaterial color="#2f7d32" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[1.9, 1.2, 1.9]} radius={0.3} position={[0, 3.4, 0]} castShadow>
        <meshStandardMaterial color="#3d9a40" roughness={0.85} />
      </RoundedBox>
    </RigidBody>
  );
}
function PresentModel({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.9, 0.9, 0.9]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.95, 0.92, 0.2]} /><meshStandardMaterial color="#ffd54a" /></mesh>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.2, 0.92, 0.95]} /><meshStandardMaterial color="#ffd54a" /></mesh>
      <mesh position={[0, 1, 0]}><torusGeometry args={[0.18, 0.06, 6, 10]} /><meshStandardMaterial color="#ffd54a" /></mesh>
    </group>
  );
}
function Presents({ self, found, onFind }: { self: Vec; found: Set<number>; onFind: (id: number) => void }) {
  const spin = useRef<Group>(null);
  useFrame((state) => {
    if (spin.current) spin.current.children.forEach((c) => (c.rotation.y = state.clock.elapsedTime));
    const p = nearPresent(self.x, self.z, found);
    if (p && self.y < 6) onFind(p.id);
  });
  return (
    <group ref={spin}>
      {PRESENTS.filter((p) => !found.has(p.id)).map((p) => (
        <group key={p.id} position={[p.x, -0.5, p.z]}><PresentModel color={p.color} /></group>
      ))}
    </group>
  );
}
/** Light snowfall: one Points draw call that follows the camera; positions wrap instead of reallocating. */
const SNOW_COUNT = 450, SNOW_BOX = 50;
function Snow() {
  const ref = useRef<Points>(null);
  const data = useMemo(() => {
    const a = new Float32Array(SNOW_COUNT * 3);
    for (let i = 0; i < SNOW_COUNT; i++) {
      a[i * 3] = (Math.random() - 0.5) * SNOW_BOX;
      a[i * 3 + 1] = Math.random() * 30;
      a[i * 3 + 2] = (Math.random() - 0.5) * SNOW_BOX;
    }
    return a;
  }, []);
  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const dt = Math.min(delta, 0.05), t = state.clock.elapsedTime;
    for (let i = 0; i < SNOW_COUNT; i++) {
      let y = data[i * 3 + 1]! - (2.2 + (i % 5) * 0.3) * dt;
      if (y < -1) y += 30;
      data[i * 3 + 1] = y;
      data[i * 3] = data[i * 3]! + Math.sin(t + i) * 0.3 * dt;
    }
    (pts.geometry.attributes['position'] as BufferAttribute).needsUpdate = true;
    const c = state.camera.position;
    pts.position.set(Math.round(c.x / 10) * 10, 0, Math.round(c.z / 10) * 10);
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.22} sizeAttenuation transparent opacity={0.9} depthWrite={false} fog />
    </points>
  );
}
function SleighModel({ color }: { color: string }) {
  return (
    <group>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.15, 0]}><boxGeometry args={[0.12, 0.12, 3.4]} /><meshStandardMaterial color="#d4a52a" metalness={0.7} roughness={0.3} /></mesh>
      ))}
      <RoundedBox args={[1.8, 0.9, 2.6]} radius={0.2} position={[0, 0.85, -0.2]} castShadow><meshStandardMaterial color={color} /></RoundedBox>
      <RoundedBox args={[1.8, 1.2, 0.4]} radius={0.15} position={[0, 1.3, -1.3]}><meshStandardMaterial color={color} /></RoundedBox>
      <mesh position={[0, 1.32, 1.05]}><boxGeometry args={[1.85, 0.1, 0.2]} /><meshStandardMaterial color="#ffd54a" /></mesh>
      {[0, 1].map((i) => (
        <group key={i} position={[i ? 0.5 : -0.5, 0.9, 3.4 + (i ? 0 : 0.5)]}>
          <mesh><boxGeometry args={[0.5, 0.55, 1.2]} /><meshStandardMaterial color="#8a5a32" /></mesh>
          <mesh position={[0, 0.45, 0.6]}><boxGeometry args={[0.35, 0.4, 0.45]} /><meshStandardMaterial color="#8a5a32" /></mesh>
          <mesh position={[0, 0.45, 0.85]}><sphereGeometry args={[0.09, 6, 6]} /><meshStandardMaterial color={i ? "#3b2a1a" : "#ff2a2a"} emissive={i ? "#000000" : "#ff0000"} emissiveIntensity={0.8} /></mesh>
          {[-0.15, 0.15].map((x) => <mesh key={x} position={[x, 0.8, 0.5]}><boxGeometry args={[0.06, 0.35, 0.06]} /><meshStandardMaterial color="#d9c7a0" /></mesh>)}
          {[-0.18, 0.18].flatMap((x) => [-0.4, 0.4].map((z) => <mesh key={`${x}${z}`} position={[x, -0.5, z]}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color="#5a3a1e" /></mesh>))}
        </group>
      ))}
    </group>
  );
}
type PlotRow = { plot: number; user_id: string; house: string; name?: string | undefined };
const HOUSE_LOOK: Record<string, { s: number; wall: string; roof: string }> = {
  "house-cottage": { s: 1, wall: "#f1e3c2", roof: "#8a4b2a" },
  "house-villa": { s: 1.3, wall: "#f4f1ea", roof: "#c0563a" },
  "house-mansion": { s: 1.7, wall: "#e9e4f5", roof: "#2f3a5c" },
};
function Plots({ rows }: { rows: PlotRow[] }) {
  return (
    <>
      {PLOTS.map((q) => {
        const row = rows.find((r) => r.plot === q.plot), look = row ? HOUSE_LOOK[row.house] : undefined;
        return (
          <group key={q.plot} position={[q.x, 0, q.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.46, 0]} receiveShadow>
              <planeGeometry args={[PLOT_SIZE, PLOT_SIZE]} />
              <meshStandardMaterial color={row ? "#6f9a4f" : "#b59a6a"} roughness={1} />
            </mesh>
            {[[0, PLOT_SIZE / 2], [0, -PLOT_SIZE / 2], [PLOT_SIZE / 2, 0], [-PLOT_SIZE / 2, 0]].map(([x, z], i) => (
              <mesh key={i} position={[x!, -0.2, z!]}>
                <boxGeometry args={i < 2 ? [PLOT_SIZE, 0.4, 0.2] : [0.2, 0.4, PLOT_SIZE]} />
                <meshStandardMaterial color="#f5f0e1" />
              </mesh>
            ))}
            {look && (
              <group scale={look.s}>
                <House position={[0, 0, 0]} rot={q.rot} wall={look.wall} roof={look.roof} />
              </group>
            )}
            <Html position={[0, row ? 4 + (look?.s ?? 1) * 4 : 2, 0]} center distanceFactor={18}>
              <div className="lublox-board whitespace-nowrap rounded px-2 py-1 text-xs font-bold">
                {row ? `🏠 ${row.name ?? "Someone"}'s plot` : `Plot ${q.plot} · For sale`}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
function Pad({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <mesh position={[x, -0.4, z]}>
      <cylinderGeometry args={[PAD_RADIUS, PAD_RADIUS, 0.2, 32]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
    </mesh>
  );
}
function Garage() {
  const { x, z } = GARAGE;
  return (
    <>
      <Pad x={PLAINS_PAD.x} z={PLAINS_PAD.z} color="#e02424" />
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[x, -1, z]} receiveShadow><boxGeometry args={[40, 1, 36]} /><meshStandardMaterial color="#8a8f96" roughness={0.6} /></mesh>
        <mesh position={[x, 4, z - 18]}><boxGeometry args={[40, 10, 1]} /><meshStandardMaterial color="#2c3036" /></mesh>
        <mesh position={[x - 20, 4, z]}><boxGeometry args={[1, 10, 36]} /><meshStandardMaterial color="#2c3036" /></mesh>
        <mesh position={[x + 20, 4, z]}><boxGeometry args={[1, 10, 36]} /><meshStandardMaterial color="#2c3036" /></mesh>
        <mesh position={[x, 4, z + 18]}><boxGeometry args={[40, 10, 1]} /><meshStandardMaterial color="#2c3036" /></mesh>
      </RigidBody>
      <mesh position={[x, 9.2, z]}><boxGeometry args={[40, 0.4, 36]} /><meshStandardMaterial color="#1d2024" /></mesh>
      {[-12, 0, 12].map((ox) => <pointLight key={ox} position={[x + ox, 7, z - 6]} intensity={30} distance={18} color="#fff3d6" />)}
      {GARAGE_CARS.map((c, i) => {
        const cx = x - 12 + i * 12, cz = z - 8;
        return (
          <group key={c.id} position={[cx, -0.5, cz]}>
            <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[3.4, 3.6, 0.2, 40]} /><meshStandardMaterial color="#d4a52a" metalness={0.7} roughness={0.3} /></mesh>
            <group position={[0, 0.2, 0]} rotation={[0, 0.6, 0]}>
              {c.kind === "lambo" ? <LamboModel color="#f2b705" /> : c.kind === "ebike" ? <EbikeModel color="#1b1b1f" /> : <CarModel color="#d63b3b" />}
            </group>
            <Html position={[0, 3.2, 0]} center distanceFactor={14}>
              <div className="lublox-board whitespace-nowrap rounded px-2 py-1 text-sm font-bold">{VEHICLE_SPECS[c.kind].label} · ${(c.price / 100).toFixed(2)}</div>
            </Html>
          </group>
        );
      })}
      <Pad x={GARAGE_PAD.x} z={GARAGE_PAD.z} color="#e02424" />
      <Html position={[GARAGE_PAD.x, 1.5, GARAGE_PAD.z]} center distanceFactor={14}>
        <div className="lublox-board whitespace-nowrap rounded px-2 py-1 text-xs font-bold">Back to Grassy Plains</div>
      </Html>
    </>
  );
}
function Plains() {
  const xmas = useLubloxXmas();
  const T = xmas ? Tree : GreenTree;
  return (
    <>
      <House position={[8, 0, -12]} />
      <House position={[-40, 0, 30]} rot={Math.PI / 2} wall="#cfe0ef" roof="#3b5f8a" />
      <House position={[45, 0, 38]} rot={-Math.PI / 3} wall="#f0d9d2" roof="#5b3a2a" />
      {/* Ring road for driving */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]} receiveShadow>
        <ringGeometry args={[56, 64, 96]} />
        <meshStandardMaterial color="#4a4d52" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.47, 0]}>
        <ringGeometry args={[59.85, 60.15, 96]} />
        <meshStandardMaterial color="#f2d64b" />
      </mesh>
      {/* Pond */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-25, -0.47, -35]}>
        <circleGeometry args={[9, 40]} />
        <meshStandardMaterial color="#3d8fd1" roughness={0.1} metalness={0.3} />
      </mesh>
      {TREES.map(([x, z, sc]) => (
        <T key={`${x.toFixed(2)},${z.toFixed(2)}`} x={x} z={z} s={sc} />
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={`f${i}`} position={[(rand(i + 300) - 0.5) * 100, -0.4, (rand(i + 500) - 0.5) * 100]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color={["#f5e14a", "#f07ab0", "#ffffff", "#9b7bf0"][i % 4]!} />
        </mesh>
      ))}
    </>
  );
}
function Player({
  keys,
  palette,
  onWin,
  onReady,
  look,
  avatar,
  self,
  isIt,
  drive,
  vstates,
  held = null,
  plains = false,
  onZone,
}: {
  held?: Held;
  plains?: boolean;
  onZone?: (garage: boolean) => void;
  drive: { current: Drive };
  vstates: VMap;
  self: Vec;
  isIt?: Role;
  look: Look;
  avatar?: Avatar | undefined;
  keys: Set<string>;
  palette: Palette;
  onWin: () => void;
  onReady: () => void;
}) {
  const body = useRef<RapierRigidBody>(null),
    grounded = useRef(false),
    jumping = useRef(false),
    ready = useRef(false),
    cameraTarget = useRef(new Vector3()),
    model = useRef<Group>(null),
    stepAcc = useRef(0),
    wasGrounded = useRef(false),
    contacts = useRef(0),
    wasDriving = useRef<string | null>(null),
    lastTp = useRef(0),
    zone = useRef(false);
  useFrame((state, delta) => {
    const rigid = body.current;
    if (!rigid) return;
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
    const p = rigid.translation();
    if (p.y < -8) {
      rigid.setTranslation({ x: 0, y: 2, z: 0 }, true);
      rigid.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }
    const d = drive.current, car = d ? vstates.get(d.id) : undefined;
    if (d && car) {
      wasDriving.current = d.id;
      const cy = car.y ?? 0;
      rigid.setTranslation({ x: car.x, y: cy + (d.kind === "ebike" ? 1.25 : d.kind === "sleigh" ? 1.6 : 1), z: car.z }, true);
      rigid.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (model.current) {
        model.current.visible = false;
        model.current.rotation.y = car.yaw;
      }
      Object.assign(self, { x: car.x, y: cy + 1, z: car.z, ry: car.yaw, v: d.id, vk: d.kind, w: wheelieOut.current, t: trickOut.current });
      // Camera follows in the vehicle's own frame (after it steps) so it never lags a frame behind and shakes.
      chaseCam.current = (cx: number, cz: number, yaw: number, dtRaw: number, hy = 0) => {
        const dt = Math.min(dtRaw, 0.05);
        const target = yaw + Math.PI;
        const diff = ((target - look.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        if (!look.lock) look.yaw += diff * (1 - Math.exp(-3 * dt));
        const dist = Math.max(look.dist, 9);
        state.camera.position.set(cx + Math.sin(look.yaw) * Math.cos(look.pitch) * dist, hy + 1.5 + Math.sin(look.pitch) * dist, cz + Math.cos(look.yaw) * Math.cos(look.pitch) * dist);
        state.camera.lookAt(cx, hy + 1.5, cz);
      };
      return;
    }
    if (wasDriving.current) {
      const last = vstates.get(wasDriving.current);
      wasDriving.current = null;
      chaseCam.current = null;
      if (model.current) model.current.visible = true;
      self.v = undefined;
      self.vk = undefined;
      self.w = undefined;
      self.t = undefined;
      if (last) rigid.setTranslation({ x: last.x + Math.cos(last.yaw) * 2.5, y: 2, z: last.z - Math.sin(last.yaw) * 2.5 }, true);
    }
    if (plains) {
      const pad = Date.now() - lastTp.current > 1500;
      if (pad && onPad(p, PLAINS_PAD)) {
        lastTp.current = Date.now();
        rigid.setTranslation({ x: GARAGE.x, y: 1.5, z: GARAGE.z + 8 }, true);
        rigid.setLinvel({ x: 0, y: 0, z: 0 }, true);
        lbxSound.win();
      } else if (pad && onPad(p, GARAGE_PAD)) {
        lastTp.current = Date.now();
        rigid.setTranslation({ x: PLAINS_PAD.x - 6, y: 1.5, z: PLAINS_PAD.z - 6 }, true);
        rigid.setLinvel({ x: 0, y: 0, z: 0 }, true);
        lbxSound.win();
      }
      const g = inGarage(rigid.translation());
      if (g !== zone.current) {
        zone.current = g;
        onZone?.(g);
      }
    }
    // Grounded = touching something and not moving vertically much (robust to wall contacts).
    grounded.current = contacts.current > 0 && Math.abs(rigid.linvel().y) < 1.5;
    const move = cameraRelative(document.hidden ? { x: 0, z: 0 } : movement(keys), look.yaw),
      jump = keys.has("Space");
    if (jump && !jumping.current && grounded.current) lbxSound.jump();
    if (grounded.current && !wasGrounded.current) lbxSound.land();
    wasGrounded.current = grounded.current;
    const moving = Math.hypot(move.x, move.z) > 0.01;
    if (grounded.current && moving) {
      stepAcc.current += SPEED * Math.min(delta, 0.05);
      if (stepAcc.current > STEP_DIST) {
        stepAcc.current = 0;
        lbxSound.step();
      }
    }
    if (model.current) {
      if (look.lock) model.current.rotation.y = look.yaw + Math.PI;
      else if (moving) model.current.rotation.y = Math.atan2(move.x, move.z);
    }
    self.x = p.x;
    self.y = p.y;
    self.z = p.z;
    self.ry = model.current?.rotation.y ?? 0;
    rigid.setLinvel(
      {
        x: move.x * SPEED,
        y: jump && !jumping.current && grounded.current ? JUMP : rigid.linvel().y,
        z: move.z * SPEED,
      },
      true,
    );
    jumping.current = jump;
    const dt = Math.min(delta, 0.05);
    // Shift lock: closer camera offset over the right shoulder.
    const dist = look.lock ? Math.min(look.dist, 10) : look.dist,
      sx = look.lock ? Math.cos(look.yaw) * 1.6 : 0,
      sz = look.lock ? -Math.sin(look.yaw) * 1.6 : 0;
    state.camera.position.lerp(
      cameraTarget.current.set(
        p.x + sx + Math.sin(look.yaw) * Math.cos(look.pitch) * dist,
        p.y + 1 + Math.sin(look.pitch) * dist,
        p.z + sz + Math.cos(look.yaw) * Math.cos(look.pitch) * dist,
      ),
      1 - Math.exp(-(look.lock ? 20 : 8) * dt),
    );
    state.camera.lookAt(p.x + sx, p.y + 1, p.z + sz);
  });
  return (
    <RigidBody
      ref={body}
      position={[0, 2, 0]}
      enabledRotations={[false, false, false]}
      colliders={false}
      friction={0.8}
      onCollisionEnter={(e) => {
        contacts.current += 1;
        const kind = e.other.rigidBodyObject?.userData["kind"];
        if (kind === "goal") onWin();
        if (kind === "hazard") {
          lbxSound.oof();
          body.current?.setTranslation({ x: 0, y: 2, z: 0 }, true);
          body.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      }}
      onCollisionExit={() => {
        contacts.current = Math.max(0, contacts.current - 1);
      }}
    >
      <CapsuleCollider args={[0.45, 0.35]} />
      <group ref={model}>
        <AvatarModel palette={palette} hat={avatar?.hat} shirt={avatar?.shirt} pants={avatar?.pants} name={avatar?.name} isIt={isIt} />
        <HeldWeapon held={held} />
      </group>
    </RigidBody>
  );
}
// Classic blocky avatar: yellow head/arms, blue torso, green legs, swinging limbs.
const SKIN = "#f5cd30", PANTS = "#4b974b", TORSO = "#0d69ac";
function AvatarModel({
  palette: _palette,
  hat,
  shirt,
  pants,
  name,
  isIt,
}: {
  palette: Palette;
  hat?: string | undefined;
  shirt?: string | undefined;
  pants?: string | undefined;
  name?: string | undefined;
  isIt?: Role;
}) {
  const top = itemColor(shirt ?? ""), legC = itemColor(pants ?? "") ?? PANTS, sl = sleeveLength(shirt), baggy = isBaggy(pants);
  const glow = isIt === "king" ? "#ffc83d" : isIt === "peasant" ? "#7a4a22" : undefined;
  const mat = (color: string) =>
    glow ? <meshStandardMaterial color={color} roughness={0.6} emissive={glow} emissiveIntensity={isIt === "king" ? 0.9 : 0.55} /> : <meshStandardMaterial color={color} roughness={0.6} />;
  const root = useRef<Group>(null),
    armL = useRef<Group>(null),
    armR = useRef<Group>(null),
    legL = useRef<Group>(null),
    legR = useRef<Group>(null),
    anim = useRef({ last: new Vector3(), has: false, speed: 0, vy: 0, phase: 0 }).current,
    tmp = useRef(new Vector3()).current;
  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.max(1e-3, Math.min(delta, 0.05));
    g.getWorldPosition(tmp);
    if (anim.has) {
      const h = Math.hypot(tmp.x - anim.last.x, tmp.z - anim.last.z) / dt;
      anim.speed += (h - anim.speed) * (1 - Math.exp(-10 * dt));
      anim.vy += ((tmp.y - anim.last.y) / dt - anim.vy) * (1 - Math.exp(-10 * dt));
    }
    anim.last.copy(tmp);
    anim.has = true;
    const walk = Math.min(1, anim.speed / 5);
    anim.phase += dt * (4 + anim.speed * 1.4);
    const swing = Math.sin(anim.phase) * 0.9 * walk;
    const air = Math.abs(anim.vy) > 2.5;
    if (armL.current) armL.current.rotation.x = air ? -Math.PI * 0.9 : swing;
    if (armR.current) armR.current.rotation.x = air ? -Math.PI * 0.9 : -swing;
    if (legL.current) legL.current.rotation.x = air ? 0.25 : -swing;
    if (legR.current) legR.current.rotation.x = air ? -0.25 : swing;
  });
  return (
    <group ref={root}>
      {/* torso */}
      <RoundedBox args={[0.8, 0.8, 0.4]} radius={0.06} smoothness={3} position={[0, 0.05, 0]} castShadow>
        {mat(top ?? TORSO)}
      </RoundedBox>
      <ShirtDetail id={shirt} />
      {/* belt */}
      <mesh position={[0, -0.33, 0]}>
        <boxGeometry args={[0.82, 0.06, 0.42]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.5} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.42, 20]} />
        {mat(SKIN)}
      </mesh>
      <mesh position={[0, 0.94, 0]}>
        <cylinderGeometry args={[0.17, 0.24, 0.06, 20]} />
        {mat(SKIN)}
      </mesh>
      {/* smiley face */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.08, 0.76, 0.236]} scale={[1, 1.6, 0.4]}>
          <sphereGeometry args={[0.028, 10, 8]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      ))}
      <mesh position={[0, 0.66, 0.235]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.08, 0.015, 6, 12, Math.PI]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {/* arms pivot at the shoulders */}
      {([[-1, armL], [1, armR]] as const).map(([s, ref]) => (
        <group key={s} ref={ref} position={[s * 0.6, 0.42, 0]}>
          <RoundedBox args={[0.38, 0.8, 0.38]} radius={0.07} smoothness={3} position={[0, -0.38, 0]} castShadow>
            {mat(SKIN)}
          </RoundedBox>
          {sl > 0 && top && (
            <RoundedBox args={[0.41, sl, 0.41]} radius={0.07} position={[0, 0.02 - sl / 2, 0]} castShadow>{mat(top)}</RoundedBox>
          )}
        </group>
      ))}
      {/* legs pivot at the hips */}
      {([[-1, legL], [1, legR]] as const).map(([s, ref]) => (
        <group key={s} ref={ref} position={[s * 0.2, -0.35, 0]}>
          <RoundedBox args={baggy ? [0.44, 0.46, 0.46] : [0.38, 0.42, 0.38]} radius={0.06} smoothness={3} position={[0, baggy ? -0.22 : -0.2, 0]} castShadow>
            {mat(legC)}
          </RoundedBox>
          {baggy && <mesh position={[0, -0.42, 0]}><boxGeometry args={[0.47, 0.06, 0.49]} /><meshStandardMaterial color="#5d80b0" roughness={0.9} /></mesh>}
          <RoundedBox args={[0.4, 0.1, 0.46]} radius={0.04} position={[0, -0.44, 0.03]} castShadow>
            <meshStandardMaterial color="#222" roughness={0.7} />
          </RoundedBox>
        </group>
      ))}
      {hat && <Hat id={hat} />}
      {name && (
        <Html position={[0, 1.6, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
          <div className="lublox-tag">{isIt === "it" ? `🏃 IT · ${name}` : isIt === "king" ? `👑 ${name}` : isIt === "peasant" ? `🟤 ${name}` : name}</div>
        </Html>
      )}
      {isIt === "king" && (
        <mesh position={[0, 1.12, 0]}>
          <cylinderGeometry args={[0.3, 0.26, 0.25, 6, 1, true]} />
          <meshStandardMaterial color="#ffc83d" emissive="#ffb000" emissiveIntensity={1} metalness={0.8} side={2} />
        </mesh>
      )}
      {isIt === "it" && (
        <mesh position={[0, 1.35, 0]}>
          <octahedronGeometry args={[0.18]} />
          <meshStandardMaterial color="#e5484d" emissive="#e5484d" emissiveIntensity={0.6} />
        </mesh>
      )}
    </group>
  );
}
/** Early-2000s Lamborghini (Murciélago-style) wedge supercar, front = +z. */
function LamboModel({ color }: { color: string }) {
  const paint = <meshStandardMaterial color={color === "#eeeeee" || color === "#1b1b1f" ? "#f2b705" : color} metalness={0.6} roughness={0.25} />,
    glass = <meshStandardMaterial color="#10161c" metalness={0.9} roughness={0.1} />,
    black = <meshStandardMaterial color="#111" roughness={0.7} />;
  return (
    <group>
      <RoundedBox args={[2.0, 0.42, 4.4]} radius={0.12} position={[0, 0.55, 0]} castShadow>{paint}</RoundedBox>
      {/* Sloped nose wedge */}
      <mesh position={[0, 0.72, 1.55]} rotation={[0.22, 0, 0]} castShadow><boxGeometry args={[1.9, 0.12, 1.4]} />{paint}</mesh>
      {/* Low cabin with steep windshield */}
      <mesh position={[0, 0.98, 0.35]} rotation={[0.55, 0, 0]}><boxGeometry args={[1.5, 0.06, 1.1]} />{glass}</mesh>
      <RoundedBox args={[1.5, 0.38, 1.1]} radius={0.08} position={[0, 1.0, -0.45]} castShadow>{paint}</RoundedBox>
      {[-0.76, 0.76].map((x) => (
        <mesh key={x} position={[x, 1.0, -0.2]}><boxGeometry args={[0.02, 0.26, 0.8]} />{glass}</mesh>
      ))}
      {/* Engine cover + side air scoops */}
      <mesh position={[0, 0.9, -1.45]} rotation={[-0.08, 0, 0]}><boxGeometry args={[1.5, 0.08, 1.1]} />{black}</mesh>
      {[-1.01, 1.01].map((x) => (
        <mesh key={x} position={[x, 0.75, -0.6]}><boxGeometry args={[0.04, 0.22, 0.7]} />{black}</mesh>
      ))}
      {/* Rear wing */}
      <mesh position={[0, 1.08, -2.05]}><boxGeometry args={[1.8, 0.05, 0.35]} />{paint}</mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.95, -2.0]}><boxGeometry args={[0.06, 0.22, 0.08]} />{black}</mesh>
      ))}
      {/* Lights */}
      {[-0.7, 0.7].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.68, 2.2]}><boxGeometry args={[0.45, 0.07, 0.04]} /><meshStandardMaterial color="#fff" emissive="#fff7d6" emissiveIntensity={1.2} /></mesh>
          <mesh position={[x, 0.66, -2.21]}><boxGeometry args={[0.5, 0.1, 0.04]} /><meshStandardMaterial color="#d22" emissive="#d22" emissiveIntensity={0.9} /></mesh>
        </group>
      ))}
      {[[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.4], [0.95, -1.4]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x!, 0.36, z!]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow><cylinderGeometry args={[0.38, 0.38, 0.32, 18]} /><meshStandardMaterial color="#141414" roughness={0.9} /></mesh>
          <mesh><cylinderGeometry args={[0.26, 0.26, 0.34, 10]} /><meshStandardMaterial color="#bfc3c8" metalness={0.9} roughness={0.2} /></mesh>
        </group>
      ))}
    </group>
  );
}
function CarModel({ color }: { color: string }) {
  return (
    <group>
      <RoundedBox args={[2, 0.7, 4]} radius={0.22} smoothness={3} position={[0, 0.55, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.5} />
      </RoundedBox>
      <RoundedBox args={[1.7, 0.6, 2]} radius={0.2} smoothness={3} position={[0, 1.15, -0.2]} castShadow>
        <meshStandardMaterial color="#1c2733" roughness={0.05} metalness={0.8} />
      </RoundedBox>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.6, 2.01]}>
          <boxGeometry args={[0.4, 0.15, 0.02]} />
          <meshStandardMaterial color="#fff6c8" emissive="#fff3b0" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {[-0.6, 0.6].map((x) => (
        <mesh key={`r${x}`} position={[x, 0.6, -2.01]}>
          <boxGeometry args={[0.4, 0.12, 0.02]} />
          <meshStandardMaterial color="#d22" emissive="#d22" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {[[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 0.35, z!]} rotation={[0, 0, Math.PI / 2]} castShadow userData={{ wheel: true }}>
          <cylinderGeometry args={[0.38, 0.38, 0.3, 16]} />
          <meshStandardMaterial color="#181818" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
function Knobby({ z, r }: { z: number; r: number }) {
  return (
    <group position={[0, r, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[r, r, 0.2, 20]} />
        <meshStandardMaterial color="#141414" roughness={1} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.55, r * 0.55, 0.22, 16]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.8} roughness={0.3} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <mesh key={i} position={[0, Math.cos(a) * r, Math.sin(a) * r]} rotation={[a, 0, 0]}>
            <boxGeometry args={[0.24, 0.05, 0.08]} />
            <meshStandardMaterial color="#0d0d0d" />
          </mesh>
        );
      })}
    </group>
  );
}
/** Talaria X3-style electric dirt bike, front = +z, rear axle at z=-0.78. */
function EbikeModel({ color }: { color: string }) {
  const metal = <meshStandardMaterial color="#c9ccd1" metalness={0.85} roughness={0.25} />;
  return (
    <group>
      <Knobby z={0.82} r={0.4} />
      <Knobby z={-0.78} r={0.38} />
      {/* Front fork (gold upside-down forks) */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.85, 0.7]} rotation={[-0.42, 0, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 1.05, 8]} />
          <meshStandardMaterial color="#d4a52a" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 1.3, 0.5]}><boxGeometry args={[0.3, 0.08, 0.12]} />{metal}</mesh>
      <mesh position={[0, 1.42, 0.47]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.85, 8]} /><meshStandardMaterial color="#222" metalness={0.6} /></mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 1.42, 0.47]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 0.12, 8]} /><meshStandardMaterial color="#111" /></mesh>
      ))}
      {/* Number plate + headlight */}
      <RoundedBox args={[0.34, 0.36, 0.06]} radius={0.04} position={[0, 1.12, 0.66]} rotation={[-0.42, 0, 0]}>
        <meshStandardMaterial color="#111" />
      </RoundedBox>
      <mesh position={[0, 1.12, 0.7]} rotation={[-0.42 + Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.03, 12]} /><meshStandardMaterial color="#fff" emissive="#cfe8ff" emissiveIntensity={1.2} /></mesh>
      {/* Front fender */}
      <mesh position={[0, 1.0, 0.95]} rotation={[0.25, 0, 0]}><boxGeometry args={[0.18, 0.03, 0.55]} /><meshStandardMaterial color="#111" /></mesh>
      {/* Frame + battery box */}
      <mesh position={[0, 1.02, 0.18]} rotation={[0.55, 0, 0]} castShadow><boxGeometry args={[0.1, 0.1, 0.75]} />{metal}</mesh>
      <RoundedBox args={[0.3, 0.42, 0.62]} radius={0.06} position={[0, 0.72, 0.02]} castShadow>
        <meshStandardMaterial color="#1c1c1f" roughness={0.6} />
      </RoundedBox>
      {/* Side panels with accent */}
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.82, 0.05]}><boxGeometry args={[0.01, 0.24, 0.5]} /><meshStandardMaterial color={color} metalness={0.3} roughness={0.4} /></mesh>
      ))}
      {/* Motor */}
      <mesh position={[0, 0.5, -0.32]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 0.24, 14]} /><meshStandardMaterial color="#2a2a2a" metalness={0.6} /></mesh>
      {/* Swingarm + shock */}
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.45, -0.55]} rotation={[-0.08, 0, 0]}><boxGeometry args={[0.04, 0.07, 0.5]} />{metal}</mesh>
      ))}
      <mesh position={[0, 0.8, -0.38]} rotation={[0.5, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.4, 8]} /><meshStandardMaterial color="#d23a2f" metalness={0.5} /></mesh>
      {/* Long flat seat + rear fender */}
      <RoundedBox args={[0.26, 0.09, 0.9]} radius={0.04} position={[0, 1.02, -0.32]} castShadow>
        <meshStandardMaterial color="#0e0e0e" roughness={0.9} />
      </RoundedBox>
      <mesh position={[0, 1.0, -0.95]} rotation={[-0.25, 0, 0]}><boxGeometry args={[0.2, 0.04, 0.45]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.95, -1.15]}><boxGeometry args={[0.08, 0.04, 0.02]} /><meshStandardMaterial color="#d22" emissive="#d22" emissiveIntensity={0.8} /></mesh>
      {/* Footpegs */}
      <mesh position={[0, 0.42, -0.05]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.6, 6]} />{metal}</mesh>
    </group>
  );
}
/** Blocky rider on the bike, posed for the current trick. */
function BikeRider({ trick }: { trick: BikeTrick }) {
  const skin = <meshStandardMaterial color="#f5cd30" />,
    shirt = <meshStandardMaterial color="#0d69ac" />,
    pants = <meshStandardMaterial color="#4b974b" />;
  const seat = trick === "seat",
    up = seat ? 0.75 : 0;
  return (
    <group position={[0, up, seat ? -0.15 : 0]}>
      <RoundedBox args={[0.5, 0.6, 0.3]} radius={0.06} position={[0, 1.45, -0.25]} rotation={[seat ? 0.05 : 0.35, 0, 0]} castShadow>{shirt}</RoundedBox>
      <RoundedBox args={[0.36, 0.36, 0.36]} radius={0.08} position={[0, 1.95, seat ? -0.2 : -0.08]} castShadow>{skin}</RoundedBox>
      {[-0.32, 0.32].map((x) => {
        const raised = trick === "nohand" || (trick === "one" && x > 0);
        const knee = trick === "knee";
        return (
          <group key={x}>
            {raised ? (
              <RoundedBox args={[0.18, 0.62, 0.18]} radius={0.05} position={[x * 1.15, 1.95, -0.25]} rotation={[0, 0, x > 0 ? -0.35 : 0.35]}>{skin}</RoundedBox>
            ) : seat ? (
              <RoundedBox args={[0.18, 0.18, 0.9]} radius={0.05} position={[x, 1.1, 0.25]} rotation={[0.75, 0, 0]}>{skin}</RoundedBox>
            ) : (
              <RoundedBox args={[0.18, 0.18, 0.62]} radius={0.05} position={[x, 1.52, 0.12]} rotation={[0.35, 0, 0]}>{skin}</RoundedBox>
            )}
            {seat ? (
              <RoundedBox args={[0.2, 0.75, 0.2]} radius={0.05} position={[x * 0.5, 0.75, -0.3]}>{pants}</RoundedBox>
            ) : knee ? (
              // Knee knocker: both knees swung up and over the front of the bike.
              <RoundedBox args={[0.2, 0.2, 0.7]} radius={0.05} position={[x * 0.9, 1.25, 0.25]} rotation={[-0.5, x > 0 ? 0.5 : -0.5, 0]}>{pants}</RoundedBox>
            ) : (
              <>
                <RoundedBox args={[0.2, 0.2, 0.5]} radius={0.05} position={[x * 0.62, 1.1, -0.1]} rotation={[-0.2, 0, 0]}>{pants}</RoundedBox>
                <RoundedBox args={[0.2, 0.55, 0.2]} radius={0.05} position={[x * 0.62, 0.7, 0.02]} rotation={[0.25, 0, 0]}>{pants}</RoundedBox>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
function WeaponLayer({ blocks, self, taken, onPick }: { blocks: Block[]; self: Vec; taken: Set<number>; onPick: (i: number) => void }) {
  useFrame(() => {
    if (self.v) return;
    blocks.forEach((b, i) => {
      if (isWeaponBlock(b.kind) && !taken.has(i) && canPickUp(self, b)) onPick(i);
    });
  });
  return (
    <>
      {blocks.map((b, i) =>
        isWeaponBlock(b.kind) && !taken.has(i) ? (
          <WeaponPickup key={i} kind={b.kind} color={b.color ?? "#c9ccd1"} accent={b.accent ?? "#d4a52a"} position={[b.x, b.y, b.z]} />
        ) : null,
      )}
    </>
  );
}
/** Local rider wheelie flag, shared to others via position updates. */
const wheelieOut = { current: false };
const trickOut: { current: BikeTrick } = { current: "none" };
const chaseCam: { current: null | ((x: number, z: number, yaw: number, dt: number, y?: number) => void) } = { current: null };
const CAR_COLORS = ["#d23a2f", "#2f6fd6", "#f2c230", "#2fa95a", "#eeeeee", "#1b1b1f"];
function Vehicle({
  v,
  drive,
  states,
  keys,
  positions,
  onCrash,
}: {
  onCrash: () => void;
  v: Spawned;
  drive: { current: Drive };
  states: VMap;
  keys: Set<string>;
  positions: Map<string, Vec>;
}) {
  const g = useRef<Group>(null),
    body = useRef<Group>(null),
    pitch = useRef<Group>(null),
    rider = useRef<Group>(null),
    wheelie = useRef(0),
    [trick, setTrick] = useState<BikeTrick>("none"),
    trickRef = useRef<BikeTrick>("none"),
    lean = useRef(0);
  if (!states.has(v.id)) states.set(v.id, { x: v.x, z: v.z, yaw: v.yaw, vx: 0, vz: 0 });
  const color = v.color ?? CAR_COLORS[Math.abs([...v.id].reduce((a, c) => a + c.charCodeAt(0), 0)) % CAR_COLORS.length]!;
  useFrame((_, delta) => {
    let st = states.get(v.id)!;
    let steer = 0,
      occupied = false,
      wantWheelie = false,
      nextTrick: BikeTrick = "none";
    if (drive.current?.id === v.id) {
      occupied = true;
      const throttle = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
      steer = Number(keys.has("KeyA") || keys.has("ArrowLeft")) - Number(keys.has("KeyD") || keys.has("ArrowRight"));
      const handbrake = keys.has("Space");
      st = v.kind === "sleigh" ? stepSleigh(st, { throttle, steer, climb: Number(keys.has("Space")) - Number(keys.has("KeyC")) }, delta) : stepVehicle(st, { throttle, steer, handbrake }, v.kind, delta);
      wantWheelie = v.kind === "ebike" && keys.has("KeyQ");
      if (v.kind === "ebike") for (const [code, t] of Object.entries(TRICK_KEYS)) if (keys.has(code)) nextTrick = t;
      if (v.kind !== "ebike" && v.kind !== "sleigh" && handbrake && slipSpeed(st) > 6 && Math.random() < 0.08) lbxSound.step();
    } else {
      // Someone else is driving it: follow their shared position.
      for (const p of positions.values())
        if (p.v === v.id) {
          occupied = true;
          wantWheelie = !!p.w;
          nextTrick = (p.t as BikeTrick | undefined) ?? "none";
          const k = 1 - Math.exp(-12 * Math.min(delta, 0.05));
          st = { ...st, x: st.x + (p.x - st.x) * k, z: st.z + (p.z - st.z) * k, y: (st.y ?? 0) + (Math.max(0, p.y - 1) - (st.y ?? 0)) * k, yaw: p.ry, vx: 0, vz: 0 };
        }
    }
    states.set(v.id, st);
    if (g.current) {
      g.current.position.set(st.x, -0.5 + (st.y ?? 0), st.z);
      g.current.rotation.y = st.yaw;
      if (v.kind === "sleigh") g.current.rotation.x = -Math.max(-0.25, Math.min(0.25, (st.y ?? 0) > 0.2 ? Math.hypot(st.vx, st.vz) * 0.006 : 0));
    }
    if (drive.current?.id === v.id) chaseCam.current?.(st.x, st.z, st.yaw, delta, st.y ?? 0);
    if (body.current && v.kind === "ebike") {
      lean.current += (-steer * 0.35 - lean.current) * (1 - Math.exp(-6 * Math.min(delta, 0.05)));
      body.current.rotation.z = lean.current;
      const dt = Math.min(delta, 0.05);
      if (drive.current?.id === v.id) {
        const w = stepWheelie(wheelie.current, wantWheelie, Math.hypot(st.vx, st.vz), delta);
        wheelie.current = w.angle;
        wheelieOut.current = w.angle > 0.05;
        trickOut.current = nextTrick;
        if (w.looped) {
          // Looped out: bike falls back down and the rider is thrown off.
          states.set(v.id, { ...st, vx: 0, vz: 0 });
          wheelieOut.current = false;
          trickOut.current = "none";
          nextTrick = "none";
          onCrash();
        }
      } else wheelie.current += ((wantWheelie ? 0.62 : 0) - wheelie.current) * (1 - Math.exp(-6 * dt));
      if (pitch.current) pitch.current.rotation.x = -wheelie.current;
      if (nextTrick !== trickRef.current) {
        trickRef.current = nextTrick;
        setTrick(nextTrick);
      }
    }
    if (rider.current) rider.current.visible = occupied && v.kind === "ebike";
  });
  return (
    <group ref={g} position={[v.x, -0.5, v.z]}>
      <group ref={body}>
        {v.kind === "lambo" ? (
          <LamboModel color={color} />
        ) : v.kind === "car" ? (
          <CarModel color={color} />
        ) : v.kind === "sleigh" ? (
          <SleighModel color={v.color ?? "#c8102e"} />
        ) : (
          <group ref={pitch} position={[0, 0.38, -0.78]}>
            <group position={[0, -0.38, 0.78]}>
              <EbikeModel color={color} />
              <group ref={rider} visible={false}><BikeRider trick={trick} /></group>
            </group>
          </group>
        )}
      </group>
    </group>
  );
}
function RemotePlayer({
  remote,
  positions,
  palette,
  isIt,
}: {
  remote: Remote;
  positions: Map<string, Vec>;
  palette: Palette;
  isIt: Role;
}) {
  const g = useRef<Group>(null);
  useFrame((_, delta) => {
    const t = positions.get(remote.id),
      o = g.current;
    if (!t || !o) return;
    const k = 1 - Math.exp(-12 * Math.min(delta, 0.05));
    o.visible = !t.vk;
    o.position.x += (t.x - o.position.x) * k;
    o.position.y += (t.y - o.position.y) * k;
    o.position.z += (t.z - o.position.z) * k;
    o.rotation.y = t.ry;
  });
  return (
    <group ref={g} visible={false} position={[0, -50, 0]}>
      <AvatarModel palette={palette} hat={remote.hat} shirt={remote.shirt} pants={remote.pants} name={remote.name} isIt={isIt} />
    </group>
  );
}
export function LubloxScene({
  blocks,
  editing = false,
  onSelect,
  avatar,
  plains = false,
  onLeave,
}: {
  onLeave?: () => void;
  avatar?: Avatar | undefined;
  plains?: boolean;
  blocks: Block[];
  editing?: boolean;
  onSelect?: (i: number) => void;
}) {
  const palette = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      ["sky", "ground", "grid", "platform", "hazard", "goal", "body"].map((k) => [
        k,
        css.getPropertyValue(`--lublox-${k}`).trim(),
      ]),
    ) as Palette;
  }, []);
  const keys = useRef(new Set<string>()),
    [won, setWon] = useState(false),
    [round, setRound] = useState(0),
    [ready, setReady] = useState(false),
    look = useRef<Look>({ yaw: 0, pitch: 0.45, lock: false, dist: 12 }).current,
    [menu, setMenu] = useState(false),
    [board, setBoard] = useState(true),
    drag = useRef<{ id: number; x: number; y: number } | null>(null),
    rootRef = useRef<HTMLDivElement>(null),
    [shiftLock, setShiftLock] = useState(false),
    [full, setFull] = useState(false),
    self = useRef<Vec>({ x: 0, y: 2, z: 0, ry: 0 }).current,
    room = usePlainsRoom(plains && !editing, avatar, self),
    drive = useRef<Drive>(null),
    vstates = useRef<VMap>(new Map()).current,
    [driving, setDriving] = useState<Drive>(null),
    [spawnOpen, setSpawnOpen] = useState(false),
    [staff, setStaff] = useState(false),
    [inGarageZone, setInGarageZone] = useState(false),
    [garage, setGarage] = useState<{ balance: number; owned: Set<string> }>({ balance: 0, owned: new Set() }),
    [garageOpen, setGarageOpen] = useState(false);
  const loadGarage = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const [w, o] = await Promise.all([
      supabase.from("club_wallets").select("earned_cents, spent_cents").eq("user_id", data.user.id).maybeSingle(),
      supabase.from("club_owned").select("item_id").eq("user_id", data.user.id).like("item_id", "lbxcar-%"),
    ]);
    setGarage({ balance: (w.data?.earned_cents ?? 0) - (w.data?.spent_cents ?? 0), owned: new Set((o.data ?? []).map((r) => r.item_id)) });
  };
  useEffect(() => {
    if (plains && !editing) void loadGarage();
  }, [plains, editing]);
  const buyCar = async (id: string) => {
    const { error } = await supabase.rpc("club_buy", { _item: id });
    if (error) lbxSound.land();
    else lbxSound.win();
    setGarageMsg(error ? error.message : "Bought! Go back to Grassy Plains to drive it.");
    void loadGarage();
  };
  const [garageMsg, setGarageMsg] = useState("");
  const [plotRows, setPlotRows] = useState<PlotRow[]>([]),
    [houses, setHouses] = useState<string[]>([]),
    [myId, setMyId] = useState<string | null>(null),
    [atPlot, setAtPlot] = useState<number | null>(null),
    [plotHouse, setPlotHouse] = useState(""),
    [plotMsg, setPlotMsg] = useState("");
  const loadPlots = async () => {
    const { data: u } = await supabase.auth.getUser();
    setMyId(u.user?.id ?? null);
    const { data } = await supabase.from("lublox_plots").select("plot, user_id, house");
    const rows = (data ?? []) as PlotRow[];
    const ids = rows.map((r) => r.user_id);
    const [names, own] = await Promise.all([
      ids.length ? supabase.from("discard_profiles").select("user_id, display_name").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; display_name: string }[] }),
      u.user ? supabase.from("club_owned").select("item_id").eq("user_id", u.user.id).like("item_id", "house-%") : Promise.resolve({ data: [] as { item_id: string }[] }),
    ]);
    const nm = new Map((names.data ?? []).map((n) => [n.user_id, n.display_name]));
    setPlotRows(rows.map((r) => ({ ...r, name: nm.get(r.user_id) })));
    const hs = (own.data ?? []).map((o) => o.item_id);
    setHouses(hs);
    setPlotHouse((h) => h || hs[0] || "");
  };
  useEffect(() => {
    if (!plains || editing) return;
    void loadPlots();
    const t = setInterval(() => setAtPlot(nearestPlot(self)?.plot ?? null), 300);
    return () => clearInterval(t);
  }, [plains, editing]);
  const plotAction = async (plot: number, mine: boolean) => {
    const { error } = mine
      ? await supabase.rpc("lublox_set_plot_house", { _house: plotHouse })
      : await supabase.rpc("lublox_buy_plot", { _plot: plot, _house: plotHouse });
    setPlotMsg(error ? error.message : mine ? "House swapped!" : "Plot bought! Your house is built.");
    if (!error) lbxSound.win();
    void loadPlots();
    void loadGarage();
  };
  useEffect(() => {
    if (editing) return;
    let live = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: rank } = await supabase.rpc("discard_rank", { _u: data.user.id });
      if (live) setStaff((rank ?? 0) >= 1);
    });
    return () => {
      live = false;
    };
  }, [editing]);
  const vehiclesRef = useRef<Spawned[]>([]);
  const worldVehicles = useMemo<Spawned[]>(
    () =>
      blocks.flatMap((b, i) =>
        isVehicleBlock(b.kind) ? [{ id: `w-${i}`, kind: b.kind, x: b.x, z: b.z, yaw: b.rotation?.[1] ?? 0, ...(b.color ? { color: b.color } : {}) }] : [],
      ),
    [blocks],
  );
  const allVehicles = useMemo(() => [...worldVehicles, ...room.vehicles], [worldVehicles, room.vehicles]);
  vehiclesRef.current = allVehicles;
  const [held, setHeld] = useState<Held>(null),
    [taken, setTaken] = useState<Set<number>>(() => new Set()),
    heldRef = useRef<Held>(null);
  heldRef.current = held;
  const pick = (i: number) => {
    const b = blocks[i];
    if (!b || !isWeaponBlock(b.kind)) return;
    setTaken((t) => new Set(t).add(i));
    setHeld({ kind: b.kind, color: b.color ?? "#c9ccd1", accent: b.accent ?? "#d4a52a" });
    lbxSound.step();
  };
  const attackNow = () => {
    if (drive.current) return;
    if (fire(heldRef.current, self)) lbxSound.step();
  };
  useEffect(() => {
    setHeld(null);
    setTaken(new Set());
  }, [blocks, round]);
  const [crashed, setCrashed] = useState(false);
  const xmas = useLubloxXmas();
  // Christmas: hourly snow (browser-local off switch) and 10 hidden presents saved per browser.
  const [snowing, setSnowing] = useState(false), [snowOff, setSnowOff] = useState(false);
  const [presents, setPresents] = useState<Set<number>>(() => new Set());
  const [presentMsg, setPresentMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!plains) return;
    setSnowOff(localStorage.getItem("lublox-snow-off") === "1");
    try {
      setPresents(new Set(JSON.parse(localStorage.getItem("lublox-presents") ?? "[]") as number[]));
    } catch { /* ignore bad saved data */ }
    const tick = () => setSnowing(snowActive(new Date()));
    tick();
    const t = window.setInterval(tick, 20000);
    return () => window.clearInterval(t);
  }, [plains]);
  const toggleSnow = () => setSnowOff((o) => {
    localStorage.setItem("lublox-snow-off", o ? "0" : "1");
    return !o;
  });
  const findPresent = (id: number) => {
    setPresents((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      localStorage.setItem("lublox-presents", JSON.stringify([...next]));
      lbxSound.win();
      setPresentMsg(allFound(next) ? "🎉 All 10 presents! You unlocked the flying Santa Sleigh!" : `🎁 Present found! ${next.size}/10`);
      window.setTimeout(() => setPresentMsg(null), 3000);
      return next;
    });
  };
  const crash = () => {
    drive.current = null;
    setDriving(null);
    setCrashed(true);
    lbxSound.step();
    window.setTimeout(() => setCrashed(false), 2000);
  };
  const toggleDrive = () => {
    if (drive.current) {
      drive.current = null;
      setDriving(null);
      return;
    }
    let best: Spawned | null = null, bd = 6;
    for (const v of vehiclesRef.current) {
      const st = vstates.get(v.id);
      if (!st) continue;
      const dd = Math.hypot(st.x - self.x, st.z - self.z);
      const taken = [...room.positions.values()].some((p) => p.v === v.id);
      if (dd < bd && !taken) [best, bd] = [v, dd];
    }
    if (best) {
      drive.current = { id: best.id, kind: best.kind };
      setDriving(drive.current);
      lbxSound.lock();
    }
  };
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  function toggleFull() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => {});
  }
  const spawn = (kind: VehicleKind) => {
    const yaw = look.yaw + Math.PI;
    room.spawnVehicle({ id: crypto.randomUUID(), kind, x: self.x + Math.sin(yaw) * 3.5, z: self.z + Math.cos(yaw) * 3.5, yaw });
    setSpawnOpen(false);
  };
  const roleOf = (id: string | null): Role => {
    if (!id || !room.it || room.active < 2) return undefined;
    if (room.mode === "crown") return room.it === id ? "king" : "peasant";
    return room.it === id ? "it" : undefined;
  };
  const toggleLock = (on = !look.lock) => {
    look.lock = on;
    setShiftLock(on);
    lbxSound.lock();
    const el = rootRef.current;
    if (on && el && window.matchMedia("(pointer: fine)").matches) void el.requestPointerLock?.()?.catch?.(() => {});
    if (!on && document.pointerLockElement) document.exitPointerLock();
  };
  useEffect(() => {
    if (editing) return;
    const mm = (e: MouseEvent) => {
      if (!look.lock || document.pointerLockElement !== rootRef.current) return;
      look.yaw -= e.movementX * 0.004;
      look.pitch = Math.min(1.3, Math.max(0.05, look.pitch + e.movementY * 0.003));
    };
    const plc = () => {
      if (!document.pointerLockElement && look.lock && window.matchMedia("(pointer: fine)").matches) {
        look.lock = false;
        setShiftLock(false);
      }
    };
    // Mouse wheel / trackpad zooms the camera in and out.
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      look.dist = Math.min(30, Math.max(4, look.dist * Math.exp(e.deltaY * 0.0015)));
    };
    const el = rootRef.current;
    el?.addEventListener("wheel", wheel, { passive: false });
    document.addEventListener("mousemove", mm);
    document.addEventListener("pointerlockchange", plc);
    return () => {
      el?.removeEventListener("wheel", wheel);
      document.removeEventListener("mousemove", mm);
      document.removeEventListener("pointerlockchange", plc);
      if (document.pointerLockElement) document.exitPointerLock();
      look.lock = false;
    };
  }, [editing, look]);
  useEffect(() => {
    if (editing) return;
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.code === "Escape") {
        setMenu((m) => !m);
        return;
      }
      if (e.code === "KeyR" && !e.repeat) {
        attackNow();
        return;
      }
      if (e.code === "KeyF" && !e.repeat) {
        toggleFull();
        return;
      }
      if (e.code === "KeyE" && !e.repeat) {
        toggleDrive();
        return;
      }
      if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && !e.repeat) {
        toggleLock();
        return;
      }
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "Space",
          "KeyQ",
          "KeyC",
          "Digit1",
          "Digit2",
          "Digit3",
          "Digit4",
          "KeyI",
          "KeyO",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      ) {
        e.preventDefault();
        if (e.code === "KeyI") look.dist = Math.max(4, look.dist - 2);
        else if (e.code === "KeyO") look.dist = Math.min(30, look.dist + 2);
        else keys.current.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      clear();
    };
  }, [editing]);
  const restart = () => {
    keys.current.clear();
    drive.current = null;
    setDriving(null);
    setWon(false);
    setRound((n) => n + 1);
  };
  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-64 overflow-hidden"
      data-scene-ready={ready ? "1" : undefined}
      onPointerDown={(e) => {
        if (editing || (e.target as HTMLElement).closest("button")) return;
        if (look.lock && document.pointerLockElement) return;
        drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        look.yaw -= (e.clientX - d.x) * 0.006;
        look.pitch = Math.min(1.3, Math.max(0.05, look.pitch + (e.clientY - d.y) * 0.004));
        d.x = e.clientX;
        d.y = e.clientY;
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      style={{ cursor: editing ? undefined : shiftLock ? "crosshair" : "grab", touchAction: editing ? undefined : "none" }}
    >
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [12, 14, 20], fov: 55 }}
        frameloop={editing ? "demand" : "always"}
        fallback={<div className="p-6">3D graphics are unavailable in this browser.</div>}
      >
        <color attach="background" args={[plains ? "#9fd4f5" : palette.sky]} />
        <Sky distance={450} sunPosition={[12, 20, 8]} turbidity={plains ? 4 : 8} rayleigh={plains ? 1.2 : 2} />
        <fog attach="fog" args={xmas && plains && snowing && !snowOff ? ["#e4edf3", 4, 38] : [plains ? "#cfe8f7" : palette.sky, plains ? 70 : 45, plains ? 230 : 120]} />
        <hemisphereLight intensity={1.7} />
        <directionalLight
          position={[12, 20, 8]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />
        <Environment resolution={64}>
          <Lightformer intensity={1} position={[0, 15, 0]} scale={[30, 30, 1]} />
        </Environment>
        {xmas && plains && !editing && snowing && !snowOff && <Snow />}
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]} paused={editing || won}>
            <World blocks={blocks} palette={palette} onSelect={onSelect} plains={plains} plotRows={plotRows} />
            {!editing && (
              <Player
                key={round}
                keys={keys.current}
                palette={palette}
                onWin={() => {
                  lbxSound.win();
                  setWon(true);
                }}
                onReady={() => setReady(true)}
                look={look}
                avatar={avatar}
                self={self}
                isIt={roleOf(room.me)}
                drive={drive}
                vstates={vstates}
                held={held}
                plains={plains}
                onZone={setInGarageZone}
              />
            )}
            {!editing && <WeaponLayer blocks={blocks} self={self} taken={taken} onPick={pick} />}
            {!editing && <Bullets />}
            {!editing && plains && xmas && <Presents self={self} found={presents} onFind={findPresent} />}
            {!editing &&
              allVehicles.map((v) => (
                <Vehicle key={v.id} v={v} drive={drive} states={vstates} keys={keys.current} positions={room.positions} onCrash={crash} />
              ))}
            {room.players.map((r) => (
              <RemotePlayer key={r.id} remote={r} positions={room.positions} palette={palette} isIt={roleOf(r.id)} />
            ))}
          </Physics>
        </Suspense>
        {editing && (
          <OrbitControls makeDefault target={[0, 2, -8]} onChange={() => setReady(true)} />
        )}
      </Canvas>
      {!editing && (
        <>
          <Button
            aria-label={full ? "Exit full screen" : "Full screen"}
            title="Full screen (F)"
            size="icon"
            variant="secondary"
            onClick={toggleFull}
            className="absolute right-[7.25rem] top-3"
          >
            {full ? <Minimize /> : <Maximize />}
          </Button>
          <Button
            aria-label={shiftLock ? "Turn off shift lock" : "Turn on shift lock"}
            aria-pressed={shiftLock}
            title="Shift lock (Shift)"
            size="icon"
            variant={shiftLock ? "default" : "secondary"}
            onClick={() => toggleLock()}
            className="absolute right-16 top-3"
          >
            <Lock />
          </Button>
          {plains && (
            <div role="status" className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded bg-background/80 px-3 py-1.5 text-sm font-semibold">
              {room.active < 2
                ? `${room.mode === "crown" ? "Crown" : "Tag"} mode: waiting for players (${room.active}/2)`
                : room.mode === "crown"
                  ? room.it === room.me
                    ? "👑 You have the crown! Run from the peasants!"
                    : `Crown · ${room.players.find((p) => p.id === room.it)?.name ?? "Someone"} is king — run into them to steal it!`
                  : room.it === room.me
                    ? "You're IT! Tag someone!"
                    : `Tag mode · ${room.players.find((p) => p.id === room.it)?.name ?? "Someone"} is IT — run!`}
            </div>
          )}
          {plains && (
            <div role="group" aria-label="Vote for game mode" className="absolute left-1/2 top-12 flex -translate-x-1/2 items-center gap-1 rounded bg-background/80 px-2 py-1 text-xs">
              <span className="font-semibold">Vote:</span>
              {(["tag", "crown"] as const).map((m) => (
                <Button key={m} size="sm" variant={room.vote === m ? "default" : "secondary"} aria-pressed={room.vote === m} onClick={() => room.castVote(m)} className="h-7 px-2">
                  {m === "tag" ? "🏃 Tag" : "👑 Crown"} ({room.votes[m]})
                </Button>
              ))}
            </div>
          )}
          <Button
            aria-label="Restart game"
            title="Restart game"
            size="icon"
            variant="secondary"
            onClick={restart}
            className="absolute right-3 top-3"
          >
            <RotateCcw />
          </Button>
          <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-1" aria-label="Movement">
            <span />
            <TouchKey code="KeyW" label="Forward" keys={keys.current}>
              <ArrowUp />
            </TouchKey>
            <span />
            <TouchKey code="KeyA" label="Left" keys={keys.current}>
              <ArrowLeft />
            </TouchKey>
            <TouchKey code="KeyS" label="Back" keys={keys.current}>
              <ArrowDown />
            </TouchKey>
            <TouchKey code="KeyD" label="Right" keys={keys.current}>
              <ArrowRight />
            </TouchKey>
          </div>
          <TouchKey
            code="Space"
            label="Jump"
            keys={keys.current}
            className="absolute bottom-3 right-3"
          >
            ↑
          </TouchKey>
          {plains && !driving && atPlot && (() => {
            const row = plotRows.find((r) => r.plot === atPlot), mine = !!row && row.user_id === myId, hasPlot = plotRows.some((r) => r.user_id === myId);
            return (
              <div role="dialog" aria-label={`Plot ${atPlot}`} className="lublox-board absolute bottom-24 left-1/2 z-10 flex w-72 -translate-x-1/2 flex-col gap-2 rounded-md p-3 text-sm">
                <p className="font-bold">🏡 Plot {atPlot}{row && !mine ? ` · owned by ${row.name ?? "someone"}` : mine ? " · yours" : ` · $${(PLOT_PRICE / 100).toFixed(2)}`}</p>
                {row && !mine ? (
                  <p className="text-xs">This plot is taken.</p>
                ) : !mine && hasPlot ? (
                  <p className="text-xs">You already own a plot. Each person can have one.</p>
                ) : houses.length === 0 ? (
                  <p className="text-xs">Buy a house in Club Bird first, then come back to build it here.</p>
                ) : (
                  <>
                    <label className="text-xs">
                      House
                      <select value={plotHouse} onChange={(e) => setPlotHouse(e.target.value)} className="mt-1 w-full rounded border border-input bg-background px-2 py-1">
                        {houses.map((h) => <option key={h} value={h}>{HOUSES.find((x) => x.id === h)?.name ?? h}</option>)}
                      </select>
                    </label>
                    <Button size="sm" onClick={() => void plotAction(atPlot, mine)} disabled={mine && row?.house === plotHouse}>
                      {mine ? "Swap house" : `Buy plot · $${(PLOT_PRICE / 100).toFixed(2)}`}
                    </Button>
                  </>
                )}
                {plotMsg && <p className="text-xs">{plotMsg}</p>}
              </div>
            );
          })()}
          {plains && inGarageZone && (
            <div role="dialog" aria-label="Car garage" className="lublox-board absolute right-3 top-16 z-10 flex w-60 flex-col gap-2 rounded-md p-3 text-sm">
              <p className="font-bold">🏁 Car Garage</p>
              <p className="text-xs">Balance: ${(garage.balance / 100).toFixed(2)}</p>
              {GARAGE_CARS.map((c) => (
                <Button key={c.id} size="sm" disabled={garage.owned.has(c.id)} onClick={() => void buyCar(c.id)}>
                  {garage.owned.has(c.id) ? `✓ Own ${VEHICLE_SPECS[c.kind].label}` : `Buy ${VEHICLE_SPECS[c.kind].label} · $${(c.price / 100).toFixed(2)}`}
                </Button>
              ))}
              {garageMsg && <p className="text-xs">{garageMsg}</p>}
              <p className="text-xs opacity-80">Step on the red pad to go back.</p>
            </div>
          )}
          {plains && !inGarageZone && garage.owned.size > 0 && (
            <Button size="sm" variant={garageOpen ? "default" : "secondary"} aria-expanded={garageOpen} onClick={() => setGarageOpen((o) => !o)} className="absolute bottom-48 right-3">
              🚗 My cars
            </Button>
          )}
          {plains && !inGarageZone && garageOpen && (
            <div role="dialog" aria-label="My cars" className="lublox-board absolute bottom-60 right-3 z-10 flex w-52 flex-col gap-2 rounded-md p-3 text-sm">
              {GARAGE_CARS.filter((c) => garage.owned.has(c.id)).map((c) => (
                <Button key={c.id} size="sm" onClick={() => { spawn(c.kind); setGarageOpen(false); }}>
                  Spawn my {VEHICLE_SPECS[c.kind].label}
                </Button>
              ))}
            </div>
          )}
          {staff && (
            <Button size="icon" variant={spawnOpen ? "default" : "secondary"} aria-label="Spawn menu" aria-expanded={spawnOpen} title="Spawn vehicles (staff)" onClick={() => setSpawnOpen((o) => !o)} className="lublox-topbtn absolute left-28 top-3">
              <Car />
            </Button>
          )}
          {staff && spawnOpen && (
            <div role="dialog" aria-label="Spawn vehicles" className="lublox-board absolute left-3 top-16 z-10 flex w-52 flex-col gap-2 rounded-md p-3 text-sm">
              <p className="font-bold">Spawn menu</p>
              {(["car", "lambo", "ebike"] as const).map((k) => (
                <Button key={k} size="sm" onClick={() => spawn(k)}>
                  {k === "ebike" ? "🚲" : k === "lambo" ? "🏎️" : "🚗"} Spawn {VEHICLE_SPECS[k].label}
                </Button>
              ))}
              <p className="pt-1 font-bold">Spawn gun</p>
              {(["gun", "sword"] as const).map((k) => (
                <Button key={k} size="sm" variant="secondary" onClick={() => { setHeld({ kind: k, color: k === "gun" ? "#2b2d36" : "#c9ccd1", accent: "#d4a52a" }); lbxSound.step(); setSpawnOpen(false); }}>
                  {k === "gun" ? "🔫 Give me a gun" : "⚔️ Give me a sword"}
                </Button>
              ))}
              {held && <Button size="sm" variant="secondary" onClick={() => setHeld(null)}>Drop weapon</Button>}
              <Button size="sm" variant="secondary" onClick={() => room.clearVehicles()} disabled={room.vehicles.length === 0}>
                Clear all vehicles ({room.vehicles.length})
              </Button>
            </div>
          )}
          {plains && xmas && (
            <div className="lublox-board pointer-events-none absolute right-3 top-3 rounded px-2 py-1 text-xs font-bold">
              🎁 {presents.size}/10{snowing && !snowOff ? " · ❄️ Snowing" : ""}
            </div>
          )}
          {plains && xmas && allFound(presents) && !inGarageZone && (
            <Button size="sm" onClick={() => spawn("sleigh")} className="absolute bottom-60 left-3">🛷 Spawn Santa Sleigh</Button>
          )}
          {presentMsg && (
            <div role="status" className="lublox-board pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-md px-4 py-2 text-base font-bold">{presentMsg}</div>
          )}
          {room.vehicles.length > 0 && (
            <Button size="sm" variant={driving ? "default" : "secondary"} onClick={toggleDrive} className="absolute bottom-24 right-3">
              {driving ? "Get out (E)" : "Drive nearby (E)"}
            </Button>
          )}
          {held && !driving && (
            <Button size="sm" onClick={attackNow} className="absolute bottom-36 right-3">
              {held.kind === "sword" ? "⚔️ Swing (R)" : "🔫 Shoot (R)"}
            </Button>
          )}
          {crashed && (
            <div role="status" className="lublox-board pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 rounded-md px-4 py-2 text-lg font-bold">
              Looped out! You fell off.
            </div>
          )}
          {driving && (
            <p role="status" className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2 rounded bg-background/80 px-3 py-1 text-xs font-semibold">
              {driving.kind === "sleigh" ? "W/S fly forward & back · A/D steer · hold Space to climb · hold C to descend · " : <>W/S gas & reverse · A/D steer · hold Space to {driving.kind !== "ebike" ? "drift" : "skid"}</>}{driving.kind === "ebike" ? " · hold Q to wheelie (too far = loop out) · hold 1 knee knocker · 2 seat stand · 3 one hander · 4 no hander" : ""} · E get out
            </p>
          )}
          {/* Top bar: menu + leaderboard toggle, like the classic in-game bar */}
          <div className="absolute left-3 top-3 flex gap-2">
            <Button size="icon" variant="secondary" aria-label="Open menu" title="Menu (Esc)" onClick={() => setMenu(true)} className="lublox-topbtn">
              <Menu />
            </Button>
            <Button size="icon" variant="secondary" aria-label={board ? "Hide players" : "Show players"} aria-pressed={board} title="Players" onClick={() => setBoard((b) => !b)} className="lublox-topbtn">
              <Users />
            </Button>
          </div>
          {board && (
            <aside aria-label="Players" className="lublox-board absolute right-3 top-16 w-48 overflow-hidden rounded-md text-sm">
              <div className="flex justify-between px-3 py-1.5 text-xs font-bold uppercase opacity-80">
                <span>People</span>
                <span>{1 + room.players.length}</span>
              </div>
              {[{ id: room.me ?? "me", name: avatar?.name ?? "You" }, ...room.players].map((p) => {
                const role = roleOf(p.id === "me" ? room.me : p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="size-4 rounded-sm bg-[var(--lublox-goal)]" aria-hidden />
                    <span className="truncate">{p.name}</span>
                    {role === "it" && <span className="ml-auto">🏃</span>}
                    {role === "king" && <span className="ml-auto">👑</span>}
                  </div>
                );
              })}
            </aside>
          )}
          <p className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded bg-background/60 px-2 py-1 text-xs sm:block">
            WASD move · Space jump · Drag to look · Scroll or I/O to zoom · Shift lock
          </p>
          {menu && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm" role="dialog" aria-label="Game menu">
              <div className="lublox-board flex w-72 flex-col gap-2 rounded-lg p-4">
                <h2 className="mb-2 text-center text-xl font-black">Game Menu</h2>
                <Button onClick={() => setMenu(false)}>Resume game</Button>
                {plains && xmas && (
                  <Button variant="secondary" aria-pressed={!snowOff} onClick={toggleSnow}>
                    ❄️ Snow effects: {snowOff ? "Off" : "On"}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => { setMenu(false); restart(); }}>
                  <RotateCcw /> Reset character
                </Button>
                {onLeave && (
                  <Button variant="destructive" onClick={onLeave}>
                    <LogOut /> Leave game
                  </Button>
                )}
              </div>
            </div>
          )}
          {won && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80">
              <h2 className="text-3xl font-bold">World complete!</h2>
              <Button onClick={restart}>
                <RotateCcw /> Play again
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
function TouchKey({
  code,
  label,
  keys,
  children,
  className = "",
}: {
  code: string;
  label: string;
  keys: Set<string>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant="secondary"
      className={`h-16 w-16 touch-none ${className}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        keys.add(code);
      }}
      onPointerUp={() => keys.delete(code)}
      onPointerCancel={() => keys.delete(code)}
      onLostPointerCapture={() => keys.delete(code)}
    >
      {children}
    </Button>
  );
}
