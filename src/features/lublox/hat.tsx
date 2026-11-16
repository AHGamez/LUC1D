import { LBX_ITEMS } from "./lublox";
const itemColor = (id: string) => LBX_ITEMS.find((i) => i.id === id)?.color;
export function Hat({ id }: { id: string }) {
  const color = itemColor(id);
  if (!color) return null;
  if (id === "lbxhat-cap")
    return (
      <group position={[0, 0.95, 0]}>
        <mesh><boxGeometry args={[0.6, 0.18, 0.6]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, -0.05, 0.4]}><boxGeometry args={[0.5, 0.05, 0.3]} /><meshStandardMaterial color={color} /></mesh>
      </group>
    );
  if (id === "lbxhat-cone")
    return (
      <mesh position={[0, 1.25, 0]}><coneGeometry args={[0.3, 0.8, 12]} /><meshStandardMaterial color={color} /></mesh>
    );
  if (id === "lbxhat-tophat")
    return (
      <group position={[0, 0.92, 0]}>
        <mesh><cylinderGeometry args={[0.5, 0.5, 0.06, 20]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.3, 0.3, 0.6, 20]} /><meshStandardMaterial color={color} /></mesh>
      </group>
    );
  const M = (c: string, x: object = {}) => <meshStandardMaterial color={c} {...x} />;
  if (id === "lbxhat-headphones")
    return (
      <group position={[0, 0.6, 0]}>
        <mesh position={[0, 0.38, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.42, 0.05, 10, 24, Math.PI]} />{M(color, { metalness: 0.4, roughness: 0.4 })}</mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.42, 0.02, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.17, 0.12, 20]} />{M(color)}</mesh>
            <mesh position={[s * 0.065, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.11, 0.11, 0.02, 20]} />{M("#39e1ff", { emissive: "#39e1ff", emissiveIntensity: 1.5 })}</mesh>
          </group>
        ))}
      </group>
    );
  if (id === "lbxhat-wizard")
    return (
      <group position={[0, 0.92, 0]}>
        <mesh><cylinderGeometry args={[0.55, 0.55, 0.05, 24]} />{M(color)}</mesh>
        <mesh position={[0.05, 0.45, -0.05]} rotation={[-0.15, 0, -0.12]}><coneGeometry args={[0.32, 0.9, 20]} />{M(color)}</mesh>
        {[[0.15, 0.25, 0.27], [-0.12, 0.5, 0.2], [0.1, 0.7, 0.12]].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}><octahedronGeometry args={[0.05]} />{M("#ffd84a", { emissive: "#ffd84a", emissiveIntensity: 1 })}</mesh>
        ))}
      </group>
    );
  if (id === "lbxhat-viking")
    return (
      <group position={[0, 0.82, 0]}>
        <mesh><sphereGeometry args={[0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />{M(color, { metalness: 0.85, roughness: 0.3 })}</mesh>
        <mesh position={[0, 0.02, 0]}><torusGeometry args={[0.4, 0.04, 8, 28]} />{M("#b8872e", { metalness: 0.8, roughness: 0.3 })}</mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.45, 0.22, 0]} rotation={[0, 0, -s * 0.9]}><coneGeometry args={[0.08, 0.45, 12]} />{M("#f1e6c8")}</mesh>
        ))}
      </group>
    );
  if (id === "lbxhat-halo")
    return (
      <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.32, 0.045, 12, 36]} />{M(color, { emissive: color, emissiveIntensity: 2.5, toneMapped: false })}</mesh>
    );
  if (id === "lbxhat-horns")
    return (
      <group position={[0, 0.85, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.25, 0, 0]} rotation={[0, 0, -s * 0.35]}>
            <mesh position={[0, 0.15, 0]}><coneGeometry args={[0.1, 0.35, 14]} />{M(color, { emissive: "#ff6a00", emissiveIntensity: 0.9 })}</mesh>
            <mesh position={[0, 0.36, 0]}><coneGeometry args={[0.05, 0.15, 10]} />{M("#ffd24a", { emissive: "#ffb000", emissiveIntensity: 2, toneMapped: false })}</mesh>
          </group>
        ))}
      </group>
    );
  if (id === "lbxhat-santa")
    return (
      <group position={[0, 0.62, 0]}>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.5, 0.5, 0.14, 24]} />{M("#ffffff", { roughness: 1 })}</mesh>
        <mesh position={[0.06, 0.36, -0.04]} rotation={[0, 0, -0.35]}><coneGeometry args={[0.44, 0.7, 24]} />{M(color, { roughness: 0.8 })}</mesh>
        <mesh position={[0.3, 0.62, -0.06]}><sphereGeometry args={[0.1, 14, 10]} />{M("#ffffff", { roughness: 1 })}</mesh>
      </group>
    );
  if (id === "lbxhat-dominus")
    return (
      <group position={[0, 0.55, 0]}>
        <mesh position={[0, 0.25, -0.03]} scale={[1, 1.15, 1]}><sphereGeometry args={[0.47, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />{M(color, { roughness: 0.9 })}</mesh>
        <mesh position={[0, -0.25, -0.28]}><boxGeometry args={[0.85, 0.7, 0.08]} />{M(color, { roughness: 0.9 })}</mesh>
        <mesh position={[0, 0.48, 0.32]} rotation={[0.5, 0, 0]}><torusGeometry args={[0.16, 0.035, 8, 20]} />{M("#e8c24a", { metalness: 0.9, roughness: 0.2 })}</mesh>
        <mesh position={[0, 0.48, 0.34]}><octahedronGeometry args={[0.07]} />{M("#ff3355", { emissive: "#ff3355", emissiveIntensity: 1.5 })}</mesh>
      </group>
    );
  return (
    <group position={[0, 1.02, 0]}>
      <mesh><cylinderGeometry args={[0.32, 0.32, 0.22, 8, 1, true]} /><meshStandardMaterial color={color} metalness={0.8} roughness={0.25} side={2} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.sin(i * 1.57) * 0.3, 0.17, Math.cos(i * 1.57) * 0.3]}><coneGeometry args={[0.07, 0.15, 4]} /><meshStandardMaterial color={color} metalness={0.8} roughness={0.25} /></mesh>
      ))}
    </group>
  );
}
