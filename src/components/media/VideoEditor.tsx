import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Film, Loader2, Upload } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/kit";
import { cn } from "../../lib/cn";

const FILTERS = [
  { id: "none", name: "Normal", css: "" },
  { id: "bw", name: "B&W", css: "grayscale(1)" },
  { id: "warm", name: "Warm", css: "sepia(0.4) saturate(1.3)" },
  { id: "cool", name: "Cool", css: "hue-rotate(190deg) saturate(1.2)" },
  { id: "vivid", name: "Vivid", css: "saturate(1.8) contrast(1.15)" },
  { id: "fade", name: "Fade", css: "contrast(0.8) brightness(1.1)" },
];
const SPEEDS = [0.5, 1, 1.5, 2];
const TEXT_POSITIONS = ["top", "middle", "bottom"] as const;
type TextPosition = (typeof TEXT_POSITIONS)[number];
const MIME_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function download(file: File) {
  const href = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function Chip({ active, disabled, onClick, children, className }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface VideoEditorProps {
  initialFile?: File | null;
  /** When set, the edited clip is handed back instead of downloaded. */
  onDone?: (file: File) => void;
  doneLabel?: string;
}

/**
 * Browser-only clip editor: trim, speed, filter, brightness, text and mute.
 * Export replays the clip once in real time through a canvas and MediaRecorder, producing a .webm.
 * Nothing leaves the device.
 */
export function VideoEditor({ initialFile, onDone, doneLabel = "Download" }: VideoEditorProps) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [url, setUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [filter, setFilter] = useState("none");
  const [brightness, setBrightness] = useState(100);
  const [text, setText] = useState("");
  const [textPos, setTextPos] = useState<TextPosition>("bottom");
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (video.current) {
      video.current.playbackRate = speed;
      video.current.muted = muted;
    }
  }, [speed, muted, url]);

  const filterCss = [
    FILTERS.find((f) => f.id === filter)?.css ?? "",
    brightness !== 100 ? `brightness(${brightness / 100})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const onTime = () => {
    const v = video.current;
    if (v && !busy && end > 0 && v.currentTime >= end) {
      v.pause();
      v.currentTime = start;
    }
  };

  const exportVideo = async () => {
    const v = video.current;
    if (!v || !file) return;
    if (end <= start) {
      setErr("The end point must be after the start.");
      return;
    }
    setBusy(true);
    setErr("");
    setProgress(0);
    let recorder: MediaRecorder | null = null;
    try {
      const w = v.videoWidth || 720;
      const h = v.videoHeight || 1280;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");

      const stream = canvas.captureStream(30);
      const source = (v as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
      if (!muted && source) source.getAudioTracks().forEach((t) => stream.addTrack(t));

      const type = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      recorder = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        rec.onstop = () => resolve();
      });

      v.pause();
      v.currentTime = start;
      v.playbackRate = speed;
      v.muted = false;
      v.volume = muted ? 0 : 1;
      // Seeking to the current position may not fire "seeked", so never wait on it forever.
      await Promise.race([
        new Promise<void>((resolve) => v.addEventListener("seeked", () => resolve(), { once: true })),
        wait(1500),
      ]);

      rec.start(250);
      await v.play();
      await new Promise<void>((resolve) => {
        const draw = () => {
          ctx.filter = filterCss || "none";
          ctx.drawImage(v, 0, 0, w, h);
          ctx.filter = "none";
          const label = text.trim();
          if (label) {
            const size = Math.round(h / 16);
            ctx.font = `bold ${size}px sans-serif`;
            ctx.textAlign = "center";
            ctx.lineWidth = size / 6;
            ctx.strokeStyle = "black";
            ctx.fillStyle = "white";
            const y = textPos === "top" ? size * 1.5 : textPos === "middle" ? h / 2 : h - size;
            ctx.strokeText(label, w / 2, y);
            ctx.fillText(label, w / 2, y);
          }
          setProgress(Math.min(1, Math.max(0, (v.currentTime - start) / (end - start))));
          if (v.currentTime >= end || v.ended) resolve();
          else requestAnimationFrame(draw);
        };
        draw();
      });

      v.pause();
      rec.stop();
      await stopped;
      v.muted = muted;
      v.volume = 1;

      const out = new File(
        [new Blob(chunks, { type: "video/webm" })],
        `${file.name.replace(/\.[^.]+$/, "")}-edit.webm`,
        { type: "video/webm" },
      );
      if (onDone) onDone(out);
      else download(out);
    } catch (e) {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      setErr(e instanceof Error ? e.message : "Export failed. Try Chrome or Edge.");
    } finally {
      setBusy(false);
    }
  };

  if (!file || !url) {
    return (
      <label className="shell-glass flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed p-8 text-center transition-colors hover:border-[var(--app-video,var(--primary))] focus-within:ring-2 focus-within:ring-ring">
        <span className="grid size-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-video,var(--primary))_16%,transparent)] text-[var(--app-video,var(--primary))]"><Film className="size-7" /></span>
        <span className="font-display font-semibold tracking-tight text-foreground">Video maker</span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="size-4" /> Choose a video to edit
        </span>
        <input
          type="file"
          accept="video/*"
          aria-label="Choose a video to edit"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
    );
  }

  const textOverlayPos =
    textPos === "top" ? "top-[6%]" : textPos === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-[6%]";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[18px] border border-border bg-black">
        <video
          ref={video}
          src={url}
          controls={!busy}
          playsInline
          className="max-h-[65dvh] w-full"
          style={{ filter: filterCss || "none" }}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration || 0;
            setDuration(d);
            setStart(0);
            setEnd(d);
          }}
          onTimeUpdate={onTime}
        />
        {text.trim() && (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 px-3 text-center text-2xl font-bold text-white [text-shadow:0_0_4px_#000,0_0_8px_#000]",
              textOverlayPos,
            )}
          >
            {text}
          </div>
        )}
        {busy && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div className="h-full bg-[var(--app-video,var(--primary))] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>

      <div className="shell-glass space-y-4 rounded-[18px] border p-4 text-sm">
        <label className="grid gap-1">
          <span className="flex justify-between text-muted-foreground">
            <span>Start</span>
            <span className="tabular-nums text-foreground">{fmt(start)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={start}
            disabled={busy}
            onChange={(e) => setStart(Math.min(Number(e.target.value), end - 0.5))}
            className="w-full accent-[var(--app-video,var(--primary))]"
          />
        </label>
        <label className="grid gap-1">
          <span className="flex justify-between text-muted-foreground">
            <span>End</span>
            <span className="tabular-nums text-foreground">{fmt(end)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={end}
            disabled={busy}
            onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 0.5))}
            className="w-full accent-[var(--app-video,var(--primary))]"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-muted-foreground">Speed</span>
          <div className="flex flex-wrap gap-1.5">
            {SPEEDS.map((s) => (
              <Chip key={s} active={speed === s} disabled={busy} onClick={() => setSpeed(s)}>
                {s}x
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-muted-foreground">Filter</span>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Chip key={f.id} active={filter === f.id} disabled={busy} onClick={() => setFilter(f.id)}>
                {f.name}
              </Chip>
            ))}
          </div>
        </div>

        <label className="grid gap-1">
          <span className="flex justify-between text-muted-foreground">
            <span>Brightness</span>
            <span className="tabular-nums text-foreground">{brightness}%</span>
          </span>
          <input
            type="range"
            min={50}
            max={150}
            value={brightness}
            disabled={busy}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full accent-[var(--app-video,var(--primary))]"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-muted-foreground">Text overlay</span>
          <Input
            value={text}
            maxLength={60}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add text…"
            aria-label="Text overlay"
          />
          <div className="flex gap-1.5">
            {TEXT_POSITIONS.map((p) => (
              <Chip key={p} active={textPos === p} disabled={busy} onClick={() => setTextPos(p)} className="capitalize">
                {p}
              </Chip>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={muted} disabled={busy} onChange={(e) => setMuted(e.target.checked)} className="accent-[var(--app-video,var(--primary))]" />
          Mute sound
        </label>

        {err && <p role="alert" className="text-destructive">{err}</p>}

        <Button className="w-full" disabled={busy} onClick={exportVideo}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" /> Making… {Math.round(progress * 100)}%
            </>
          ) : (
            <>
              <Download /> {doneLabel}
            </>
          )}
        </Button>
        <Button variant="ghost" size="sm" className="w-full" disabled={busy} onClick={() => setFile(null)}>
          Pick a different video
        </Button>
        <p className="text-xs text-muted-foreground">Export plays the clip once in real time.</p>
      </div>
    </div>
  );
}
