import { RoundedBox } from "@react-three/drei";
import { LBX_ITEMS } from "./lublox";
import { Hat } from "./hat";
import { ShirtDetail, isBaggy, sleeveLength } from "./clothes";

const SKIN = "#f5cd30", PANTS = "#4b974b", TORSO = "#0d69ac";
const col = (id?: string) => LBX_ITEMS.find((i) => i.id === id)?.color;

/** Static shop-preview avatar matching the in-game model. */
export function AvatarBody({ hat, shirt, pants }: { hat?: string; shirt?: string; pants?: string }) {
  const top = col(shirt) ?? TORSO, leg = col(pants) ?? PANTS, sl = sleeveLength(shirt), baggy = isBaggy(pants);
  return (
    <group>
      <RoundedBox args={[0.8, 0.8, 0.4]} radius={0.06} smoothness={3} position={[0, 0.05, 0]}><meshStandardMaterial color={top} roughness={0.8} /></RoundedBox>
      <ShirtDetail id={shirt} />
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.24, 0.24, 0.42, 20]} /><meshStandardMaterial color={SKIN} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.08, 0.76, 0.236]} scale={[1, 1.6, 0.4]}><sphereGeometry args={[0.028, 10, 8]} /><meshBasicMaterial color="#111" /></mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.6, 0.42, 0]}>
          <RoundedBox args={[0.38, 0.8, 0.38]} radius={0.07} smoothness={3} position={[0, -0.38, 0]}><meshStandardMaterial color={SKIN} /></RoundedBox>
          {sl > 0 && <RoundedBox args={[0.41, sl, 0.41]} radius={0.07} position={[0, 0.02 - sl / 2, 0]}><meshStandardMaterial color={top} roughness={0.85} /></RoundedBox>}
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.2, -0.35, 0]}>
          <RoundedBox args={baggy ? [0.44, 0.46, 0.46] : [0.38, 0.42, 0.38]} radius={0.06} position={[0, baggy ? -0.22 : -0.2, 0]}><meshStandardMaterial color={leg} roughness={0.9} /></RoundedBox>
          {baggy && <mesh position={[0, -0.42, 0]}><boxGeometry args={[0.47, 0.06, 0.49]} /><meshStandardMaterial color="#5d80b0" roughness={0.9} /></mesh>}
          <RoundedBox args={[0.4, 0.1, 0.46]} radius={0.04} position={[0, -0.44, 0.03]}><meshStandardMaterial color="#222" /></RoundedBox>
        </group>
      ))}
      {hat && <Hat id={hat} />}
    </group>
  );
}
