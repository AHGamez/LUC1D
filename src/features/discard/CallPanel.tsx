import { useEffect, useRef, useState, type ReactNode } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { RTC_CONFIG, type CallSignal } from "./lib/discard-call";

/**
 * Live voice or video call. Each pair of participants talks over a direct WebRTC connection; the realtime
 * broadcast on "call-<room>" only carries offers, answers and ICE candidates. Nothing is recorded.
 * The lower user id makes the offer, so each pair negotiates once.
 */
export function CallPanel({
  room,
  me,
  video,
  nameOf,
  onLeave,
}: {
  room: string;
  me: string;
  video: boolean;
  nameOf: (id: string) => string;
  onLeave: () => void;
}) {
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<Record<string, MediaStream>>({});
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(!video);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    let channel: RealtimeChannel | null = null;
    let stream: MediaStream | null = null;
    const pcs = new Map<string, RTCPeerConnection>();

    const send = (s: Omit<CallSignal, "from">) => {
      void channel?.send({ type: "broadcast", event: "signal", payload: { ...s, from: me } });
    };
    const drop = (id: string) => {
      pcs.get(id)?.close();
      pcs.delete(id);
      setRemotes((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
    };
    const peer = (id: string) => {
      const existing = pcs.get(id);
      if (existing) return existing;
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcs.set(id, pc);
      stream?.getTracks().forEach((t) => pc.addTrack(t, stream!));
      pc.onicecandidate = (e) => {
        if (e.candidate) send({ to: id, ice: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        const s = e.streams[0];
        if (s) setRemotes((r) => ({ ...r, [id]: s }));
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") drop(id);
      };
      return pc;
    };

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setCamOff(true);
        } catch {
          setErr("Allow microphone access in your browser to join.");
          return;
        }
      }
      if (!alive) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      setLocal(stream);
      const ch = supabase.channel(`call-${room}`, { config: { presence: { key: me }, broadcast: { self: false } } });
      channel = ch;
      ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
          const s = payload as CallSignal;
          if (s.to !== me) return;
          const pc = peer(s.from);
          if (s.sdp) {
            await pc.setRemoteDescription(s.sdp);
            if (s.sdp.type === "offer") {
              await pc.setLocalDescription(await pc.createAnswer());
              send({ to: s.from, sdp: pc.localDescription!.toJSON() });
            }
          } else if (s.ice) {
            await pc.addIceCandidate(s.ice).catch(() => {});
          }
        })
        .on("presence", { event: "sync" }, async () => {
          const ids = Object.keys(ch.presenceState()).filter((id) => id !== me);
          for (const id of [...pcs.keys()]) if (!ids.includes(id)) drop(id);
          for (const id of ids) {
            if (pcs.has(id) || me > id) continue;
            const pc = peer(id);
            await pc.setLocalDescription(await pc.createOffer());
            send({ to: id, sdp: pc.localDescription!.toJSON() });
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void ch.track({ at: Date.now() });
        });
    })();

    return () => {
      alive = false;
      pcs.forEach((pc) => pc.close());
      stream?.getTracks().forEach((t) => t.stop());
      if (channel) void supabase.removeChannel(channel);
    };
  }, [room, me, video]);

  useEffect(() => {
    local?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [local, muted]);
  useEffect(() => {
    local?.getVideoTracks().forEach((t) => (t.enabled = !camOff));
  }, [local, camOff]);

  const hasCam = !!local?.getVideoTracks().length;
  const ids = Object.keys(remotes);

  return (
    <div className="d-surface shrink-0 border-b border-[var(--d-line)] p-3">
      {err && <p role="alert" className="pb-2 text-sm text-destructive">{err}</p>}
      <div className="flex gap-2 overflow-x-auto">
        <Tile stream={local} label="You" muted />
        {ids.map((id) => (
          <Tile key={id} stream={remotes[id] ?? null} label={nameOf(id)} />
        ))}
        {ids.length === 0 && !err && <div className="flex items-center px-3 text-sm opacity-70">Waiting for others to join…</div>}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <CallButton label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)}>
          {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </CallButton>
        {hasCam && (
          <CallButton label={camOff ? "Turn camera on" : "Turn camera off"} onClick={() => setCamOff((c) => !c)}>
            {camOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
          </CallButton>
        )}
        <CallButton label="Leave call" onClick={onLeave} danger>
          <PhoneOff className="size-4" />
        </CallButton>
      </div>
    </div>
  );
}

function CallButton({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-full p-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-ring ${danger ? "bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:brightness-110" : "border border-[var(--d-line-strong)] bg-[var(--d-card)] text-[var(--dc-text)] hover:bg-[var(--d-active)]"}`}
    >
      {children}
    </button>
  );
}

function Tile({ stream, label, muted = false }: { stream: MediaStream | null; label: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  const live = !!stream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
  return (
    <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-2xl border border-[var(--d-line)] bg-[var(--d-well)] shadow-[inset_0_1px_0_var(--d-highlight)]">
      <video ref={ref} autoPlay playsInline muted={muted} className={`h-full w-full object-cover ${live ? "" : "opacity-0"}`} />
      {!live && <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold opacity-70">{label.slice(0, 1).toUpperCase()}</div>}
      <span className="d-chip absolute bottom-2 left-2 bg-[var(--d-card)] text-[var(--dc-text)]">{label}</span>
    </div>
  );
}
