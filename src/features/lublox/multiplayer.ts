import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { canStealCrown, chooseIt, findTagTarget, pickMode, randomKing, TAG_IMMUNITY_MS, type PlainsMode } from "./lublox-tag";
import { lbxSound } from "./lublox-sound";
import type { Avatar } from "./lublox";
import type { VehicleKind } from "../../lib/lublox-vehicle";

/** A vehicle a player spawned in the shared room (staff spawn or a bought garage car). */
export type Spawned = { id: string; kind: VehicleKind; x: number; z: number; yaw: number; color?: string };

export type Vec = { x: number; y: number; z: number; ry: number; v?: string | undefined; vk?: VehicleKind | undefined; w?: boolean | undefined; t?: string | undefined };
export type Remote = { id: string; name: string; hat: string; shirt: string; pants?: string; vote?: PlainsMode };

/** Grassy Plains live room: shares positions and runs tag mode once 2+ players are here. */
export function usePlainsRoom(enabled: boolean, avatar: Avatar | undefined, self: Vec) {
  const [me, setMe] = useState<string | null>(null);
  const [players, setPlayers] = useState<Remote[]>([]);
  const [it, setIt] = useState<string | null>(null);
  const positions = useRef(new Map<string, Vec>()).current;
  const itRef = useRef<string | null>(null);
  const immuneUntil = useRef(0);
  const [vote, setVote] = useState<PlainsMode>("tag");
  const [mode, setMode] = useState<PlainsMode>("tag");
  const modeRef = useRef<PlainsMode>("tag");
  const [vehicles, setVehicles] = useState<Spawned[]>([]);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !me || !avatar) return;
    const ch = supabase.channel("lublox-plains", { config: { presence: { key: me }, broadcast: { self: false } } });
    const applyIt = (next: string | null, sound = true) => {
      if (next === itRef.current) return;
      itRef.current = next;
      immuneUntil.current = Date.now() + TAG_IMMUNITY_MS;
      setIt(next);
      if (sound && next) lbxSound.tag();
    };
    ch.on("presence", { event: "sync" }, () => {
      const st = ch.presenceState<Remote>();
      const list = Object.entries(st).map(([id, metas]) => ({ ...metas[0]!, id }));
      setPlayers(list.filter((p) => p.id !== me));
      for (const id of positions.keys()) if (!st[id]) positions.delete(id);
      const ids = Object.keys(st);
      const nextMode = pickMode(list.map((p) => p.vote));
      const switched = nextMode !== modeRef.current;
      modeRef.current = nextMode;
      setMode(nextMode);
      if (nextMode === "tag") applyIt(chooseIt(ids, switched ? null : itRef.current), false);
      else if (ids.length < 2) applyIt(null, false);
      else if (switched || !itRef.current || !ids.includes(itRef.current)) {
        // The first player alphabetically draws the random king for everyone.
        if ([...ids].sort()[0] === me) {
          const king = randomKing(ids);
          void ch.send({ type: "broadcast", event: "tag", payload: { it: king } });
          applyIt(king);
        }
      }
    })
      .on("broadcast", { event: "pos" }, ({ payload }) => positions.set(payload.id, payload.p))
      .on("broadcast", { event: "spawn" }, ({ payload }) => setVehicles((v) => [...v.slice(-11), payload as Spawned]))
      .on("broadcast", { event: "clear" }, () => setVehicles([]))
      .on("broadcast", { event: "tag" }, ({ payload }) => applyIt(payload.it))
      .subscribe((s) => {
        if (s === "SUBSCRIBED") void ch.track({ name: avatar.name, hat: avatar.hat, shirt: avatar.shirt, pants: avatar.pants, vote: voteRef.current });
      });
    chRef.current = ch;
    const timer = setInterval(() => {
      if (document.hidden) return;
      void ch.send({ type: "broadcast", event: "pos", payload: { id: me, p: { ...self } } });
      if (modeRef.current === "crown") {
        const king = itRef.current ? positions.get(itRef.current) : undefined;
        if (king && itRef.current !== me && Date.now() > immuneUntil.current && canStealCrown(self, king)) {
          void ch.send({ type: "broadcast", event: "tag", payload: { it: me } });
          applyIt(me);
        }
      } else if (itRef.current === me && Date.now() > immuneUntil.current) {
        const target = findTagTarget(self, [...positions].map(([id, pos]) => ({ id, pos })));
        if (target) {
          void ch.send({ type: "broadcast", event: "tag", payload: { it: target } });
          applyIt(target);
        }
      }
    }, 100);
    return () => {
      clearInterval(timer);
      chRef.current = null;
      void supabase.removeChannel(ch);
      positions.clear();
      setPlayers([]);
      itRef.current = null;
      setIt(null);
    };
  }, [enabled, me, avatar, positions, self]);

  const voteRef = useRef(vote);
  voteRef.current = vote;
  const castVote = (v: PlainsMode) => {
    setVote(v);
    voteRef.current = v;
    if (avatar) void chRef.current?.track({ name: avatar.name, hat: avatar.hat, shirt: avatar.shirt, pants: avatar.pants, vote: v });
  };
  const votes = { tag: 0, crown: 0 };
  for (const p of players) votes[p.vote ?? "tag"]++;
  votes[vote]++;
  const spawnVehicle = (v: Spawned) => {
    setVehicles((list) => [...list.slice(-11), v]);
    void chRef.current?.send({ type: "broadcast", event: "spawn", payload: v });
  };
  const clearVehicles = () => {
    setVehicles([]);
    void chRef.current?.send({ type: "broadcast", event: "clear", payload: {} });
  };
  return { me, players, it, positions, active: players.length + 1, mode, vote, votes, castVote, vehicles, spawnVehicle, clearVehicles };
}
