import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { WeaponKind } from "./lublox";

export type Held = { kind: WeaponKind; color: string; accent: string } | null;
/** Shared attack clock + bullets (per-frame state outside React). */
export const attack = { at: -10 };
type Bullet = { x: number; y: number; z: number; dx: number; dz: number; t: number };
export const bullets: Bullet[] = [];
const POOL = 12;

export function WeaponModel({ kind, color, accent }: { kind: WeaponKind; color: string; accent: string }) {
  if (kind === "sword")
    return (
      <group>
        <mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[0.1, 1.2, 0.03]} /><meshStandardMaterial color={color} metalness={0.9} roughness={0.15} /></mesh>
        <mesh position={[0, 1.4, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.07, 0.07, 0.03]} /><meshStandardMaterial color={color} metalness={0.9} /></mesh>
        <mesh position={[0, 0.13, 0]}><boxGeometry args={[0.42, 0.07, 0.1]} /><meshStandardMaterial color={accent} metalness={0.7} /></mesh>
        <mesh position={[0, -0.08, 0]}><cylinderGeometry args={[0.04, 0.04, 0.32, 8]} /><meshStandardMaterial color="#3a2414" /></mesh>
      </group>
    );
  return (
    <group>
      <mesh position={[0, 0, 0.25]} castShadow><boxGeometry args={[0.12, 0.16, 0.6]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0, 0.03, 0.65]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.3, 8]} /><meshStandardMaterial color="#222" metalness={0.8} /></mesh>
      <mesh position={[0, -0.16, 0.05]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.1, 0.26, 0.12]} /><meshStandardMaterial color={accent} /></mesh>
      <mesh position={[0, 0.11, 0.3]}><boxGeometry args={[0.04, 0.05, 0.2]} /><meshStandardMaterial color="#111" /></mesh>
    </group>
  );
}
/** Weapon held in the right hand; swings (sword) or kicks back (gun) after an attack. */
export function HeldWeapon({ held }: { held: Held }) {
  const g = useRef<Group>(null);
  useFrame(() => {
    if (!g.current || !held) return;
    const t = (performance.now() / 1000 - attack.at) / 0.3;
    const k = t >= 0 && t < 1 ? Math.sin(t * Math.PI) : 0;
    if (held.kind === "sword") g.current.rotation.set(0.4 + k * 1.8, 0, -k * 0.6);
    else g.current.rotation.set(-k * 0.5, 0, 0);
  });
  if (!held) return null;
  return (
    <group position={[0.45, 0.85, 0.25]}>
      <group ref={g} rotation={[0.4, 0, 0]}>
        <group rotation={held.kind === "gun" ? [-0.4, 0, 0] : [0, 0, 0]} position={held.kind === "gun" ? [0, 0, 0.1] : [0, -0.1, 0.1]}>
          <WeaponModel kind={held.kind} color={held.color} accent={held.accent} />
        </group>
      </group>
    </group>
  );
}
/** Floating, spinning pickup. */
export function WeaponPickup({ kind, color, accent, position }: { kind: WeaponKind; color: string; accent: string; position: [number, number, number] }) {
  const g = useRef<Group>(null);
  useFrame((s) => {
    if (!g.current) return;
    g.current.rotation.y = s.clock.elapsedTime * 1.5;
    g.current.position.y = position[1] + 0.4 + Math.sin(s.clock.elapsedTime * 2) * 0.12;
  });
  return (
    <group ref={g} position={position}>
      <group rotation={kind === "gun" ? [0, 0, 0] : [0, 0, 0.3]}>
        <WeaponModel kind={kind} color={color} accent={accent} />
      </group>
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.6, 24]} />
        <meshBasicMaterial color={accent} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
/** Bullet pool for the gun. */
export function Bullets() {
  const refs = useRef<(Mesh | null)[]>([]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]!;
      b.x += b.dx * 40 * dt;
      b.z += b.dz * 40 * dt;
      b.t += dt;
      if (b.t > 1) bullets.splice(i, 1);
    }
    for (let i = 0; i < POOL; i++) {
      const m = refs.current[i], b = bullets[i];
      if (!m) continue;
      m.visible = !!b;
      if (b) m.position.set(b.x, b.y, b.z);
    }
  });
  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} visible={false}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={2} />
        </mesh>
      ))}
    </>
  );
}
export function fire(held: Held, self: { x: number; y: number; z: number; ry: number }) {
  if (!held) return false;
  const now = performance.now() / 1000;
  if (now - attack.at < 0.3) return false;
  attack.at = now;
  if (held.kind === "gun" && bullets.length < POOL)
    bullets.push({ x: self.x + Math.sin(self.ry) * 0.8, y: self.y + 0.4, z: self.z + Math.cos(self.ry) * 0.8, dx: Math.sin(self.ry), dz: Math.cos(self.ry), t: 0 });
  return true;
}
