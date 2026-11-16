import { RoundedBox } from "@react-three/drei";
import { LBX_ITEMS } from "./lublox";

/** Torso-local details for each shirt (torso centre at y=0.05, 0.8x0.8x0.4). */
export function ShirtDetail({ id }: { id?: string | undefined }) {
  const c = LBX_ITEMS.find((i) => i.id === id)?.color;
  if (!c || !id) return null;
  const dark = <meshStandardMaterial color="#000" transparent opacity={0.28} />;
  if (id === "lbxshirt-hoodie" || id === "lbxshirt-green")
    return (
      <group>
        {/* hood resting behind the head */}
        <RoundedBox args={[0.6, 0.34, 0.22]} radius={0.1} position={[0, 0.5, -0.2]} castShadow><meshStandardMaterial color={c} roughness={0.95} /></RoundedBox>
        {/* kangaroo pocket */}
        <RoundedBox args={[0.5, 0.2, 0.04]} radius={0.02} position={[0, -0.16, 0.205]}><meshStandardMaterial color={c} roughness={1} /></RoundedBox>
        <mesh position={[0, -0.16, 0.228]}><boxGeometry args={[0.44, 0.012, 0.005]} />{dark}</mesh>
        {/* drawstrings */}
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.24, 0.215]}><cylinderGeometry args={[0.012, 0.012, 0.22, 6]} /><meshStandardMaterial color="#f2f2f2" /></mesh>
        ))}
      </group>
    );
  if (id === "lbxshirt-black")
    return (
      <group>
        <mesh position={[0, 0.05, 0.205]}><boxGeometry args={[0.025, 0.78, 0.01]} /><meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.2} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.14, 0.34, 0.21]} rotation={[0, 0, s * 0.5]}><boxGeometry args={[0.1, 0.24, 0.02]} /><meshStandardMaterial color="#111114" /></mesh>
        ))}
      </group>
    );
  if (id === "lbxshirt-gold")
    return (
      <group>
        <mesh position={[0, 0.3, 0.205]}><boxGeometry args={[0.22, 0.22, 0.01]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[0, 0.16, 0.215]}><boxGeometry args={[0.07, 0.4, 0.01]} /><meshStandardMaterial color="#8a1020" /></mesh>
        {[-0.05, -0.2].map((y) => (
          <mesh key={y} position={[0.15, y, 0.21]}><sphereGeometry args={[0.022, 8, 6]} /><meshStandardMaterial color="#fff2b0" metalness={1} roughness={0.2} /></mesh>
        ))}
      </group>
    );
  // tee: collar
  return (
    <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.18, 0.025, 6, 18]} /><meshStandardMaterial color={c} roughness={0.8} /></mesh>
  );
}

/** Sleeve length for each shirt (0 = bare arms). */
export function sleeveLength(id?: string) {
  if (!id || id === "none") return 0;
  return id === "lbxshirt-red" ? 0.32 : 0.82;
}

export const isBaggy = (id?: string) => id === "lbxpants-baggy";
