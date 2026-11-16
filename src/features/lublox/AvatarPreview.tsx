import { Canvas } from "@react-three/fiber";
import type { Avatar } from "./lublox";
import { AvatarBody } from "./avatar-body";

/** Static 3D preview of the avatar. Loaded lazily by the shop so R3F stays out of the main player chunk. */
export default function AvatarPreview({ avatar }: { avatar: Avatar }) {
  return (
    <Canvas camera={{ position: [0, 0.6, 3.4], fov: 40 }} frameloop="demand">
      <hemisphereLight intensity={1.4} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 4, 3]} intensity={2} />
      <group rotation={[0, -0.5, 0]}>
        <AvatarBody hat={avatar.hat} shirt={avatar.shirt} pants={avatar.pants} />
      </group>
    </Canvas>
  );
}
