import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { supabase } from "@/lib/supabase";
import { ARENA, BIKES, RAMPS, TRICK_KEYS, newBike, payoutRequest, stepBike, trickCents, type BikeId, type BikeState, type Trick } from "./bikelife";

/** What the HUD shows. Sent from the scene a few times a second. */
export type BikeHud = { speed: number; deg: number; trick: Trick; combo: number; bank: number; earned: number; msg: string };

const TAU = Math.PI * 2;
/** Tube along a smooth curve through points. */
function Tube({ pts, r = 0.035, children }: { pts: [number, number, number][]; r?: number; children: ReactNode }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, r, 10, false), [pts, r]);
  return <mesh geometry={geo} castShadow>{children}</mesh>;
}

/** Knobby dirt wheel. Axle runs along X so rotation.x spins it. */
function Wheel({ r = 0.36, rim = "#1a1a1a", disc = true }: { r?: number; rim?: string; disc?: boolean }) {
  const knobs = 30, spokes = 32, rr = r - 0.1;
  return (
    <group>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[r - 0.055, 0.07, 14, 40]} /><meshStandardMaterial color="#161616" roughness={0.95} /></mesh>
      {Array.from({ length: knobs }, (_, i) => {
        const a = (i / knobs) * TAU;
        return [-0.035, 0.035].map((x, j) => (
          <mesh key={`${i}-${j}`} position={[x + (i % 2 ? 0.012 : -0.012), Math.cos(a) * (r - 0.005), Math.sin(a) * (r - 0.005)]} rotation={[a, 0, 0]}>
            <boxGeometry args={[0.045, 0.03, 0.045]} /><meshStandardMaterial color="#1b1b1b" roughness={1} />
          </mesh>
        ));
      })}
      <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[rr, 0.018, 8, 40]} /><meshStandardMaterial color={rim} metalness={0.85} roughness={0.3} /></mesh>
      {Array.from({ length: spokes }, (_, i) => {
        const a = (i / spokes) * TAU + (i % 2 ? 0.08 : -0.08), m = (rr + 0.05) / 2, side = i % 2 ? 0.03 : -0.03;
        return (
          <mesh key={i} position={[side / 2, Math.cos(a) * m, Math.sin(a) * m]} rotation={[a, 0, side * 2]}>
            <cylinderGeometry args={[0.0045, 0.0045, rr - 0.05, 4]} /><meshStandardMaterial color="#d8dbe0" metalness={1} roughness={0.2} />
          </mesh>
        );
      })}
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.055, 0.055, 0.13, 18]} /><meshStandardMaterial color={rim} metalness={0.8} roughness={0.3} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.2, 10]} /><meshStandardMaterial color="#aaa" metalness={1} /></mesh>
      {disc && (
        <group position={[0.085, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.14, 0.14, 0.006, 32]} /><meshStandardMaterial color="#9a9ea4" metalness={1} roughness={0.35} /></mesh>
          {Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TAU; return <mesh key={i} position={[0.004, Math.cos(a) * 0.1, Math.sin(a) * 0.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.018, 0.018, 0.008, 10]} /><meshStandardMaterial color="#333" /></mesh>; })}
        </group>
      )}
    </group>
  );
}

/** Electric dirt bike. Origin = rear axle. Front axle at z≈1.3. fork/rear refs animate suspension. */
function BikeModel({ id, fork, rear, front, back }: { id: BikeId; fork: RefObject<THREE.Group | null>; rear: RefObject<THREE.Group | null>; front: RefObject<THREE.Group | null>; back: RefObject<THREE.Group | null> }) {
  const b = BIKES[id];
  const paint = <meshPhysicalMaterial color={b.color} metalness={0.15} roughness={0.3} clearcoat={1} clearcoatRoughness={0.08} />;
  const accent = <meshPhysicalMaterial color={b.accent} metalness={0.4} roughness={0.3} clearcoat={0.6} />;
  const black = <meshStandardMaterial color="#141416" roughness={0.55} metalness={0.2} />;
  const rubber = <meshStandardMaterial color="#0d0d0d" roughness={0.95} />;
  const alu = <meshStandardMaterial color="#b9bec5" metalness={0.95} roughness={0.22} />;
  const gold = <meshStandardMaterial color="#d9a82e" metalness={1} roughness={0.18} />;
  const L = 0.13; // half width of frame spars
  return (
    <group>
      {/* Swingarm + rear wheel (pivot near footpegs) */}
      <group ref={rear} position={[0, 0.42, 0.55]}>
        <group position={[0, -0.06, -0.55]}>
          <group ref={back}><Wheel r={0.36} rim={b.accent === "#f2f2f2" ? "#1a1a1a" : b.accent} /></group>
          {[-1, 1].map((s) => <Tube key={s} pts={[[s * 0.11, 0, 0], [s * 0.12, 0.03, 0.3], [s * 0.1, 0.06, 0.55]]} r={0.028}>{alu}</Tube>)}
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.012, 30]} />{alu}</mesh>
          {/* chain */}
          <mesh position={[-0.105, 0.015, 0.28]} rotation={[0.08, 0, 0]}><boxGeometry args={[0.012, 0.012, 0.56]} />{rubber}</mesh>
          <mesh position={[-0.105, -0.1, 0.28]} rotation={[-0.12, 0, 0]}><boxGeometry args={[0.012, 0.012, 0.56]} />{rubber}</mesh>
        </group>
      </group>
      {/* Frame spars from steering head down around the battery */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Tube pts={[[s * 0.05, 1.12, 1.02], [s * L, 0.98, 0.8], [s * L, 0.62, 0.62], [s * 0.1, 0.38, 0.55]]} r={0.032}>{alu}</Tube>
          <Tube pts={[[s * L, 0.95, 0.62], [s * 0.11, 0.92, 0.2], [s * 0.09, 0.86, -0.22]]} r={0.022}>{alu}</Tube>
          <Tube pts={[[s * 0.1, 0.42, 0.52], [s * 0.1, 0.7, 0.2], [s * 0.09, 0.85, -0.15]]} r={0.018}>{alu}</Tube>
        </group>
      ))}
      {/* Battery + motor */}
      <RoundedBox args={[0.22, 0.4, 0.42]} radius={0.05} position={[0, 0.72, 0.74]} rotation={[0.25, 0, 0]} castShadow>{black}</RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.012, 0.22, 0.3]} radius={0.005} position={[s * 0.115, 0.74, 0.74]} rotation={[0.25, 0, 0]}>
          <meshStandardMaterial color={b.accent} emissive={b.accent} emissiveIntensity={0.35} metalness={0.5} />
        </RoundedBox>
      ))}
      <group position={[0, 0.42, 0.62]} rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow><cylinderGeometry args={[0.12, 0.12, 0.2, 28]} />{black}</mesh>
        <mesh position={[0, 0.105, 0]}><cylinderGeometry args={[0.09, 0.09, 0.01, 28]} />{alu}</mesh>
        <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />{alu}</mesh>
      </group>
      {/* Rear shock with coil spring */}
      <group position={[0, 0.66, 0.4]} rotation={[0.5, 0, 0]}>
        <mesh><cylinderGeometry args={[0.022, 0.022, 0.42, 12]} />{alu}</mesh>
        <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.04, 0.04, 0.08, 14]} />{gold}</mesh>
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, -0.13 + i * 0.033, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.042, 0.009, 6, 18]} />{accent}</mesh>)}
      </group>
      {/* Seat */}
      <RoundedBox args={[0.22, 0.09, 0.8]} radius={0.04} position={[0, 0.98, 0.32]} rotation={[0.05, 0, 0]} castShadow><meshStandardMaterial color="#1c1c1e" roughness={0.85} /></RoundedBox>
      <RoundedBox args={[0.2, 0.02, 0.7]} radius={0.01} position={[0, 1.025, 0.32]} rotation={[0.05, 0, 0]}><meshStandardMaterial color={b.accent} roughness={0.7} /></RoundedBox>
      {/* Side plates, number plate, tail */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <RoundedBox args={[0.02, 0.2, 0.42]} radius={0.008} position={[s * 0.125, 0.86, 0.02]} rotation={[0.22, 0, 0]} castShadow>{paint}</RoundedBox>
          <RoundedBox args={[0.02, 0.06, 0.2]} radius={0.008} position={[s * 0.136, 0.86, 0.02]} rotation={[0.22, 0, 0]}>{accent}</RoundedBox>
          <RoundedBox args={[0.04, 0.24, 0.4]} radius={0.02} position={[s * 0.14, 0.92, 0.88]} rotation={[0.42, s * 0.08, 0]} castShadow>{paint}</RoundedBox>
          <mesh position={[s * 0.18, 0.42, 0.48]}><boxGeometry args={[0.1, 0.025, 0.05]} />{alu}</mesh>
        </group>
      ))}
      <RoundedBox args={[0.2, 0.035, 0.5]} radius={0.015} position={[0, 0.95, -0.3]} rotation={[0.18, 0, 0]} castShadow>{paint}</RoundedBox>
      <mesh position={[0, 0.9, -0.56]}><boxGeometry args={[0.08, 0.03, 0.02]} /><meshStandardMaterial color="#ff2a2a" emissive="#ff1010" emissiveIntensity={1.4} /></mesh>
      {/* Steering head + fork */}
      <group ref={front} position={[0, 1.15, 1.08]} rotation={[-0.42, 0, 0]}>
        <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.32, 0.04, 0.09]} />{black}</mesh>
        <mesh position={[0, -0.04, 0]}><boxGeometry args={[0.32, 0.04, 0.09]} />{black}</mesh>
        {/* Handlebar with bend, grips, levers */}
        <group position={[0, 0.2, -0.05]}>
          <Tube pts={[[-0.38, 0.06, -0.06], [-0.2, 0.02, -0.02], [0, 0, 0], [0.2, 0.02, -0.02], [0.38, 0.06, -0.06]]} r={0.014}>{black}</Tube>
          <mesh position={[0, -0.08, 0.02]}><boxGeometry args={[0.08, 0.14, 0.05]} />{alu}</mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.34, 0.055, -0.055]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.024, 0.024, 0.11, 12]} />{rubber}</mesh>
              <mesh position={[s * 0.25, 0.04, 0.05]} rotation={[0, s * 0.3, 0]}><boxGeometry args={[0.15, 0.008, 0.015]} />{alu}</mesh>
            </group>
          ))}
          <mesh position={[0, 0.03, -0.06]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 0.18, 12]} /><meshStandardMaterial color={b.accent} metalness={0.6} roughness={0.3} /></mesh>
        </group>
        {/* Upper fork tubes */}
        {[-0.11, 0.11].map((x) => <mesh key={x} position={[x, -0.25, 0]} castShadow><cylinderGeometry args={[0.04, 0.04, 0.55, 16]} />{gold}</mesh>)}
        {/* Front number plate + headlight */}
        <RoundedBox args={[0.28, 0.3, 0.04]} radius={0.04} position={[0, -0.04, 0.1]} castShadow>{paint}</RoundedBox>
        <mesh position={[0, -0.06, 0.125]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 0.02, 24]} /><meshStandardMaterial color="#fff" emissive="#e2f3ff" emissiveIntensity={2} /></mesh>
        {[-0.06, 0.06].map((x) => <mesh key={x} position={[x, 0.08, 0.125]}><boxGeometry args={[0.05, 0.012, 0.01]} /><meshStandardMaterial color="#fff" emissive="#cfe9ff" emissiveIntensity={2} /></mesh>)}
        <group ref={fork}>
          {[-0.11, 0.11].map((x) => <mesh key={x} position={[x, -0.6, 0]} castShadow><cylinderGeometry args={[0.052, 0.046, 0.46, 16]} />{black}</mesh>)}
          {[-0.11, 0.11].map((x) => <mesh key={`c${x}`} position={[x, -0.86, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, 0.05, 12]} />{alu}</mesh>)}
          {/* Front fender */}
          <group position={[0, -0.46, 0.05]} rotation={[0.42, 0, 0]}>
            <RoundedBox args={[0.2, 0.025, 0.36]} radius={0.012} position={[0, 0, 0.12]} rotation={[-0.15, 0, 0]}>{paint}</RoundedBox>
            <RoundedBox args={[0.2, 0.025, 0.22]} radius={0.012} position={[0, -0.03, -0.14]} rotation={[0.25, 0, 0]}>{paint}</RoundedBox>
          </group>
          <group position={[0, -0.86, 0]} rotation={[0.42, 0, 0]}><Wheel r={0.38} rim={b.accent === "#f2f2f2" ? "#1a1a1a" : b.accent} /></group>
        </group>
      </group>
    </group>
  );
}

function Rider({ trick, lean }: { trick: Trick; lean: RefObject<THREE.Group | null> }) {
  const jersey = <meshStandardMaterial color="#202024" roughness={0.8} />, pants = <meshStandardMaterial color="#2f3d5c" roughness={0.85} />;
  const glove = <meshStandardMaterial color="#e9e9e9" roughness={0.7} />, boot = <meshStandardMaterial color="#efefef" roughness={0.5} />;
  const seat = trick === "seat", knee = trick === "knee";
  const armL = trick === "nohand" ? [0, 0.4, 2.6] : [0.15, 0, -0.35];
  const armR = trick === "nohand" || trick === "one" ? [0, -0.4, -2.6] : [0.15, 0, 0.35];
  return (
    <group ref={lean} position={[0, seat ? 1.25 : 1.05, seat ? 0.35 : 0.45]}>
      <group rotation={[seat ? -0.1 : 0.45, 0, 0]}>
        <mesh position={[0, 0.42, 0]} castShadow><capsuleGeometry args={[0.17, 0.32, 6, 12]} />{jersey}</mesh>
        <mesh position={[0, 0.48, -0.17]}><boxGeometry args={[0.2, 0.18, 0.03]} /><meshStandardMaterial color="#d4a52a" /></mesh>
        {/* Helmet with visor peak and goggles */}
        <group position={[0, 0.88, 0.03]}>
          <mesh castShadow scale={[1, 1, 1.12]}><sphereGeometry args={[0.17, 24, 18]} /><meshPhysicalMaterial color="#f4f4f4" clearcoat={1} roughness={0.2} /></mesh>
          <mesh position={[0, 0.1, 0.12]} rotation={[0.35, 0, 0]}><boxGeometry args={[0.22, 0.015, 0.14]} /><meshPhysicalMaterial color="#d4372b" clearcoat={1} /></mesh>
          <mesh position={[0, -0.1, 0.14]}><boxGeometry args={[0.12, 0.08, 0.08]} /><meshStandardMaterial color="#222" /></mesh>
          <mesh position={[0, 0.01, 0.17]}><boxGeometry args={[0.24, 0.07, 0.04]} /><meshStandardMaterial color="#ff9f2a" metalness={0.7} roughness={0.1} /></mesh>
        </group>
        {[[-0.22, armL], [0.22, armR]].map(([x, r], i) => (
          <group key={i} position={[x as number, 0.62, 0]} rotation={r as [number, number, number]}>
            <mesh position={[0, -0.05, 0.22]} rotation={[1.35, 0, 0]} castShadow><capsuleGeometry args={[0.055, 0.3, 4, 8]} />{jersey}</mesh>
            <mesh position={[0, -0.1, 0.45]} rotation={[1.35, 0, 0]}><capsuleGeometry args={[0.045, 0.06, 4, 8]} />{glove}</mesh>
          </group>
        ))}
      </group>
      {[-0.11, 0.11].map((x, i) => (
        <group key={x} position={[x, 0.15, 0]} rotation={seat ? [-0.2, 0, 0] : knee ? [1.3, 0, i ? -0.5 : 0.5] : [1.2, 0, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.075, 0.4, 4, 8]} />{pants}</mesh>
          <mesh position={[0, -0.6, 0.05]}><boxGeometry args={[0.15, 0.2, 0.24]} />{boot}</mesh>
        </group>
      ))}
    </group>
  );
}

export function Track() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d")!;
    g.fillStyle = "#6b5a46"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${40 + Math.random() * 60},${30 + Math.random() * 40},20,${Math.random() * 0.4})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[ARENA * 2 + 20, ARENA * 2 + 20]} /><meshStandardMaterial map={tex} roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow><ringGeometry args={[55, 63, 64]} /><meshStandardMaterial color="#2c2c30" roughness={0.85} /></mesh>
      {RAMPS.map((r, i) => {
        const ang = Math.atan2(r.h, r.len), hyp = Math.hypot(r.h, r.len);
        return (
          <group key={i} position={[r.x, 0, r.z]}>
            <mesh position={[0, r.h / 2, 0]} rotation={[-ang, 0, 0]} castShadow receiveShadow><boxGeometry args={[r.w, 0.15, hyp]} /><meshStandardMaterial color="#8a6a42" roughness={0.8} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[(s * r.w) / 2, r.h / 2 - 0.3, 0]} rotation={[-ang, 0, 0]}><boxGeometry args={[0.2, 0.3, hyp]} /><meshStandardMaterial color="#f2b705" /></mesh>)}
            <mesh position={[0, r.h / 2, r.len / 2 - 0.1]}><boxGeometry args={[r.w, r.h, 0.2]} /><meshStandardMaterial color="#5a4630" /></mesh>
          </group>
        );
      })}
      {Array.from({ length: 40 }, (_, i) => {
        const a = (i / 40) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * (ARENA + 3), 0.6, Math.sin(a) * (ARENA + 3)]} castShadow><boxGeometry args={[1.2, 1.2, 1.2]} /><meshStandardMaterial color={i % 2 ? "#e0262b" : "#f2f2f2"} /></mesh>;
      })}
    </group>
  );
}

/** The rider and bike. Reads `keys` every frame, reports HUD numbers through `onHud`, and cashes the bank through the database. */
export function BikeGame({ bike, keys, userId, onHud }: { bike: BikeId; keys: Set<string>; userId: string | null; onHud: (h: Partial<BikeHud>) => void }) {
  const s = useRef<BikeState>(newBike()), root = useRef<THREE.Group>(null), pitchG = useRef<THREE.Group>(null);
  const fork = useRef<THREE.Group>(null), rear = useRef<THREE.Group>(null), front = useRef<THREE.Group>(null), back = useRef<THREE.Group>(null), lean = useRef<THREE.Group>(null);
  const [trick, setTrick] = useState<Trick>("none");
  const combo = useRef(0), bank = useRef(0), roll = useRef(0), hudT = useRef(0), trickR = useRef<Trick>("none");
  const { camera } = useThree();
  useFrame((_, delta) => {
    const k = keys, dt = Math.min(delta, 0.05);
    const input = { throttle: Number(k.has("KeyW") || k.has("ArrowUp")) - Number(k.has("KeyS") || k.has("ArrowDown")), steer: Number(k.has("KeyD") || k.has("ArrowRight")) - Number(k.has("KeyA") || k.has("ArrowLeft")), wheelie: k.has("KeyQ") || k.has("Space") };
    let t: Trick = "none";
    for (const [code, tr] of Object.entries(TRICK_KEYS)) if (k.has(code)) t = tr;
    if (s.current.pitch < 0.25 && !s.current.air) t = "none";
    if (t !== trickR.current) { trickR.current = t; setTrick(t); }
    const r = stepBike(s.current, input, bike, dt);
    s.current = r.s;
    const st = r.s;
    combo.current += trickCents(st, t, dt);
    if (r.looped) { onHud({ msg: "LOOPED OUT! Combo lost" }); combo.current = 0; }
    else if (combo.current > 0 && st.pitch < 0.1 && !st.air) { bank.current += combo.current; onHud({ msg: `+$${(combo.current / 100).toFixed(2)} landed` }); combo.current = 0; }
    // Draw
    if (root.current) { root.current.position.set(st.x, st.y, st.z); root.current.rotation.y = st.yaw; }
    roll.current += (-input.steer * Math.min(1, Math.abs(st.speed) / 10) * 0.45 - roll.current) * (1 - Math.exp(-6 * dt));
    if (pitchG.current) { pitchG.current.rotation.x = -st.pitch + (st.air ? -st.vy * 0.015 : 0); pitchG.current.rotation.z = roll.current; }
    const spin = (st.speed * dt) / 0.36;
    if (back.current) back.current.rotation.x += spin;
    if (fork.current) { fork.current.position.y = st.fork; const w = fork.current.children[fork.current.children.length - 1]; if (w) w.rotation.x += spin; }
    if (rear.current) rear.current.rotation.x = -st.fork * 0.8;
    if (front.current) front.current.rotation.y = input.steer * -0.35;
    if (lean.current) lean.current.position.y = (trick === "seat" ? 1.25 : 1.05) + st.fork * 0.5;
    const cx = st.x - Math.sin(st.yaw) * 4.6 + Math.cos(st.yaw) * 1.2, cz = st.z - Math.cos(st.yaw) * 4.6 - Math.sin(st.yaw) * 1.2;
    camera.position.lerp(new THREE.Vector3(cx, st.y + 2.1, cz), 1 - Math.exp(-5 * dt));
    camera.lookAt(st.x, st.y + 0.9, st.z);
    hudT.current += dt;
    if (hudT.current > 0.12) { hudT.current = 0; onHud({ speed: Math.abs(st.speed) * 2.24, deg: Math.round((st.pitch * 180) / Math.PI), trick: t, combo: combo.current, bank: bank.current }); }
  });
  // Cash in banked money every 16s through the checked database function (bikelife_cash). Only when signed in.
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(async () => {
      const c = payoutRequest(bank.current);
      if (c < 1) return;
      const { data, error } = await supabase.rpc("bikelife_cash", { _cents: c });
      if (error) { onHud({ msg: "Cash-out failed. We'll try again." }); return; }
      const paid = Number(data ?? 0);
      if (paid > 0) { bank.current -= paid; onHud({ earned: paid, msg: `Cashed $${(paid / 100).toFixed(2)} to your Discard money` }); }
    }, 16000);
    return () => clearInterval(id);
  }, [userId, onHud]);
  return (
    <group ref={root}>
      <group ref={pitchG}>
        <BikeModel id={bike} fork={fork} rear={rear} front={front} back={back} />
        <Rider trick={trick} lean={lean} />
      </group>
    </group>
  );
}
