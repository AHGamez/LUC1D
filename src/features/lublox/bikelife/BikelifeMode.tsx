import { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, Sky } from "@react-three/drei";
import { ArrowLeft, Bike } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { BIKES, DAILY_MAX_CENTS, MAX_WHEELIE, TRICK_NAME, type BikeId } from "./bikelife";
import { BikeGame, Track, type BikeHud } from "./BikeScene";

export interface BikelifeModeProps {
  /** Signed-in user id, or null. Money is only cashed out while this is set. The database checks the user itself. */
  userId: string | null;
  /** Called when the player leaves the mode (back to the Lublox lobby). */
  onExit: () => void;
}

const EMPTY_HUD: BikeHud = { speed: 0, deg: 0, trick: "none", combo: 0, bank: 0, earned: 0, msg: "" };
const BIKE_IDS = Object.keys(BIKES) as BikeId[];

const GLASS = "shell-glass rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]";

/**
 * Bikelife Mayhem as a Lublox mode: pick a bike, then ride. Wheelies and tricks earn banked money,
 * which the database pays into Discard money (see migration 0076, bikelife_cash).
 */
export default function BikelifeMode({ userId, onExit }: BikelifeModeProps) {
  const [bike, setBike] = useState<BikeId | null>(null);
  const [hud, setHud] = useState<BikeHud>(EMPTY_HUD);
  const keys = useMemo(() => new Set<string>(), []);
  const onHud = useCallback((h: Partial<BikeHud>) => setHud((p) => ({ ...p, ...h, earned: p.earned + (h.earned ?? 0) })), []);

  // Keyboard controls. Keys are read every frame by the scene, so only the set is shared.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!/^(Key|Digit|Arrow|Space)/.test(e.code)) return;
      keys.add(e.code);
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", blur);
    return () => {
      keys.clear();
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", blur);
    };
  }, [keys]);

  useEffect(() => {
    if (!hud.msg) return;
    const t = setTimeout(() => setHud((p) => ({ ...p, msg: "" })), 2200);
    return () => clearTimeout(t);
  }, [hud.msg]);

  const pickBike = (id: BikeId) => {
    keys.clear();
    setHud(EMPTY_HUD);
    setBike(id);
  };
  const leaveGame = () => {
    keys.clear();
    setBike(null);
  };

  if (!bike) {
    return (
      <div className="h-full overflow-y-auto bg-background p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <header className="mb-6 flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={onExit} aria-label="Leave Bikelife">
              <ArrowLeft />
            </Button>
            <div className="min-w-0">
              <h2 className="text-display font-black tracking-tight text-foreground">BIKELIFE MAYHEM</h2>
              <p className="mt-1 text-body text-muted-foreground">
                Pick your bike. Do wheelies and tricks to earn Discard money (up to ${DAILY_MAX_CENTS / 100} a day).
              </p>
            </div>
          </header>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BIKE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => pickBike(id)}
                className={cn(GLASS, "press group p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring")}
              >
                <div
                  aria-hidden
                  className="mb-3 grid h-20 place-items-center rounded-[var(--radius-control)] shadow-[var(--surface-highlight)]"
                  style={{ background: `linear-gradient(135deg, ${BIKES[id].color}, ${BIKES[id].accent})` }}
                >
                  <Bike className="size-8 text-white/90 drop-shadow" />
                </div>
                <div className="font-semibold text-foreground">{BIKES[id].name}</div>
                <div className="text-caption text-muted-foreground">Top speed {Math.round(BIKES[id].max * 2.24)} mph</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-background" data-scene-ready>
      <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 60, position: [0, 4, -8] }}>
        <color attach="background" args={["#a9d3f0"]} />
        <fog attach="fog" args={["#cfe3f0", 60, 200]} />
        <Sky sunPosition={[30, 25, 10]} turbidity={5} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[30, 40, 15]} intensity={2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
        <Environment resolution={64}>
          <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={1} color="#8bb" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        </Environment>
        <Track />
        <BikeGame bike={bike} keys={keys} userId={userId} onHud={onHud} />
      </Canvas>

      <div className={cn(GLASS, "pointer-events-none absolute left-3 top-3 p-3 text-body")}>
        <div className="font-semibold text-foreground">{BIKES[bike].name}</div>
        <div className="text-muted-foreground">
          {Math.round(hud.speed)} mph · wheelie {hud.deg}° / {Math.round((MAX_WHEELIE * 180) / Math.PI)}°
        </div>
        <div className={cn("font-semibold", hud.deg > 85 ? "text-destructive" : "text-foreground")}>{hud.deg > 15 ? TRICK_NAME[hud.trick] : "—"}</div>
        <div className="text-muted-foreground">
          Combo ${(hud.combo / 100).toFixed(2)} · Bank ${(hud.bank / 100).toFixed(2)}
        </div>
        <div className="font-semibold text-primary">Earned this ride ${(hud.earned / 100).toFixed(2)}</div>
      </div>

      <div className="absolute right-3 top-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={leaveGame}>
          Switch bike
        </Button>
        <Button variant="secondary" size="sm" onClick={() => { leaveGame(); onExit(); }}>
          Leave
        </Button>
      </div>

      {!userId && (
        <div className={cn(GLASS, "pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 px-4 py-2 text-body text-muted-foreground")}>
          Sign in to bank your earnings.
        </div>
      )}
      {hud.msg && (
        <div role="status" className="shell-glass-strong pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full border px-4 py-2 font-semibold text-foreground shadow-[var(--shadow-raised)] rise-in">
          {hud.msg}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 px-3 text-center text-caption text-foreground/80">
        W/S gas &amp; brake · A/D steer · hold Q or Space to wheelie (past 100° you loop) · hold 1 knee knocker · 2 seat stand · 3 one hander · 4 no hander · hit ramps for air
      </div>
    </div>
  );
}
