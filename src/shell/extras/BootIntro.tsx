import { useEffect, useState } from "react";
import chromeLogo from "@/assets/chromium-logo.png.asset.json";
import { PREFS_KEY, type IntroStyle } from "../../lib/prefs";
import { supabase } from "../../lib/supabase";

/** Christmas release: midnight Nov 16, 2026 in the viewer's local time. Matches the desktop's XMAS label. */
const XMAS_RELEASE = new Date(2026, 10, 16, 0, 0, 0).getTime();

/**
 * True once the Christmas update is visible to this viewer: after release for everyone, or before release
 * for Discard staff who the database lets see it (xmas_staff). Read-only: it does not touch the page.
 */
function useXmasLabel(): boolean {
  const [staff, setStaff] = useState(false);
  const [released, setReleased] = useState(() => Date.now() >= XMAS_RELEASE);
  useEffect(() => {
    let live = true;
    const check = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) {
          if (live) setStaff(false);
          return;
        }
        const { data: allowed } = await supabase.rpc("xmas_staff", { _u: uid });
        if (live) setStaff(!!allowed);
      } catch {
        if (live) setStaff(false);
      }
    };
    void check();
    const timer = window.setInterval(() => setReleased(Date.now() >= XMAS_RELEASE), 15000);
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void check();
    });
    return () => {
      live = false;
      window.clearInterval(timer);
      sub.subscription.unsubscribe();
    };
  }, []);
  return staff || released;
}

/** Reads the chosen intro from saved settings. Anything unknown, or no saved settings, means the spinning "1". */
function readIntro(): IntroStyle {
  try {
    const pick = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}").intro;
    return pick === "chrome" || pick === "none" ? pick : "one";
  } catch {
    return "one";
  }
}

export interface BootIntroProps {
  /**
   * Optional sound for the intro. Not bundled: pass a URL if you have a file. With no URL the intro
   * runs silently. The sound starts on the "click to enter" tap, so browsers allow it.
   */
  soundUrl?: string;
}

/** Shown once per page load. Set when the intro is entered, so it does not replay on navigation. */
let introSeen = false;

const LINES = [
  "> LUC1D reborn boot sequence",
  "> mounting /games ...... ok",
  "> linking discard ...... ok",
  "> waking club bird ..... ok",
  "> welcome back.",
];
const LINE_AT = [400, 2400, 4400, 6400, 8600];

const CODE = [
  "0x00F1  mov  eax, [luc1d_core]",
  "fn init_kernel() -> Result<(), Err> {",
  "  let gfx = Shell::new(&cfg)?;",
  "  sock.bind(\"discard://lounge\");",
  "}",
  "import { stem } from '@luc1d/games';",
  "for (let i = 0; i < 0x1F; i++) mem[i] ^= key;",
  "0x0A3C  jmp  boot_stage_2",
  "SELECT * FROM birds WHERE wallet > 0;",
  "if (!session) throw new AuthError();",
  "hash = sha256(seed + 0xDEADBEEF)",
  "[ok] mounted /dev/starfield",
  "decrypt(block_7f, iv) => 0x9e3779b9",
  "while (ready === false) await tick();",
  "pid 1337 spawned: tikitaki.d",
  "0x1B77  push ebp ; save frame",
  "render(<Desktop theme={contrast} />)",
  "[ok] handshake rtc://peer-mesh",
];

/** Beats of the intro in milliseconds: the picture inverts, crashes, then fades out. */
const BUILD_AT = 12250;
const CRASH_AT = 14550;
const FADE_AT = 15050;
const TOTAL = 15250;

type Phase = "boot" | "build" | "crash" | "out";

const CSS = `
.bi-root { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; overflow: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: #000; color: #fff; perspective: 700px; transition: background-color .35s linear, color .35s linear, opacity .2s linear; }
.bi-build { background: #fff; color: #000; }
.bi-out { opacity: 0; }
.bi-build .bi-spin { animation-duration: .32s; }
.bi-flash { position: absolute; inset: 0; background: #fff; pointer-events: none; animation: bi-flash .5s ease-out forwards; }
@keyframes bi-flash { 0% { opacity: .9; } 25% { opacity: 0; } 45% { opacity: .7; } 100% { opacity: 0; } }
.bi-spin { display: inline-block; transform-style: preserve-3d; animation: bi-spin-y 1.2s linear infinite; text-shadow: 1px 1px 0 currentColor, 2px 2px 0 currentColor, 3px 3px 0 currentColor, 4px 4px 0 currentColor, 5px 5px 0 currentColor, 6px 6px 0 currentColor, 7px 7px 0 currentColor, 8px 8px 0 currentColor, 9px 9px 0 currentColor, 10px 10px 0 currentColor, 12px 12px 0 rgba(0, 0, 0, .55), 16px 16px 24px rgba(0, 0, 0, .6); }
@keyframes bi-spin-y { from { transform: rotateY(0deg) rotateX(8deg); } to { transform: rotateY(360deg) rotateX(8deg); } }
.bi-caret { animation: bi-blink .8s steps(1) infinite; }
@keyframes bi-blink { 50% { opacity: 0; } }
.bi-enter { animation: bi-pulse 1.7s ease-in-out infinite; }
@keyframes bi-pulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .bi-spin, .bi-caret, .bi-enter { animation: none; } .bi-enter { opacity: 1; } }
@keyframes bi-spin-2d { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.bi-chrome { animation: bi-spin-2d 1.2s linear infinite; filter: drop-shadow(8px 8px 16px rgba(0, 0, 0, .5)); transition: filter .35s linear; }
.bi-build .bi-chrome { animation-duration: .32s; filter: invert(1) drop-shadow(8px 8px 16px rgba(0, 0, 0, .3)); }
@media (prefers-reduced-motion: reduce) { .bi-chrome { animation: none; } }
`;

/** Starts the optional sound. Silent when there is no URL or the browser refuses playback. */
function playSound(soundUrl: string | undefined): HTMLAudioElement | null {
  if (!soundUrl) return null;
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.8;
    void audio.play().catch(() => undefined);
    return audio;
  } catch {
    return null;
  }
}

/** "Click to enter" prompt. Holds until the user taps, so the optional sound can start on that gesture. */
function EnterGate({ onEnter, xmas }: { onEnter: () => void; xmas: boolean }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Click to enter"
      onClick={onEnter}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEnter();
        }
      }}
      className="bi-root cursor-pointer text-center outline-none"
    >
      <div aria-hidden className="pointer-events-none absolute inset-[18px] border border-current opacity-25" />
      <p className="text-[11px] uppercase tracking-[0.55em] opacity-60">LUC1D {xmas ? "(XMAS TIME!!)" : "reborn"}</p>
      <p className="bi-enter mt-7 text-3xl font-black tracking-[0.18em] sm:text-5xl">click to enter</p>
      <p className="bi-caret mt-9 text-lg">_</p>
    </div>
  );
}

/**
 * Full-screen monochrome boot intro with a spinning "1", a code stream and boot lines. It runs once
 * per page load. Click or tap anywhere to skip. Sound is optional (see `soundUrl`).
 */
export default function BootIntro({ soundUrl }: BootIntroProps) {
  const [intro] = useState<IntroStyle>(readIntro);
  const [stage, setStage] = useState<"gate" | "boot" | "gone">(() => (introSeen || intro === "none" ? "gone" : "gate"));
  const [shown, setShown] = useState(0);
  const [code, setCode] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("boot");
  const xmas = useXmasLabel();

  /* The animation and the code stream only run after the user has entered. */
  useEffect(() => {
    if (stage !== "boot") return;

    const started = performance.now();
    let raf = 0;
    const tick = () => {
      const t = performance.now() - started;
      if (t >= FADE_AT) setPhase("out");
      else if (t >= CRASH_AT) setPhase("crash");
      else if (t >= BUILD_AT) setPhase("build");
      if (t >= TOTAL) {
        setStage("gone");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const lineTimers = LINE_AT.map((ms, i) => window.setTimeout(() => setShown(i + 1), ms));
    let n = 0;
    const stream = window.setInterval(() => {
      const line = CODE[Math.floor(Math.random() * CODE.length)] ?? CODE[0];
      n++;
      setCode((c) => [...c.slice(-28), `${String(n).padStart(4, "0")}  ${line}`]);
    }, 80);

    return () => {
      cancelAnimationFrame(raf);
      lineTimers.forEach(window.clearTimeout);
      window.clearInterval(stream);
    };
  }, [stage]);

  if (stage === "gone") return null;

  if (stage === "gate") {
    return (
      <>
        <style>{CSS}</style>
        <EnterGate
          xmas={xmas}
          onEnter={() => {
            introSeen = true;
            playSound(soundUrl);
            setStage("boot");
          }}
        />
      </>
    );
  }

  const phaseClass = phase === "build" ? "bi-build" : phase === "out" ? "bi-out" : "";

  return (
    <>
      <style>{CSS}</style>
      <div role="presentation" onClick={() => setStage("gone")} className={`bi-root ${phaseClass}`}>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-6 flex w-[min(34rem,55vw)] flex-col justify-end pb-16 text-[11px] leading-4 opacity-50">
          {code.map((line, i) => (
            <p key={`${line}-${i}`} className="truncate whitespace-pre">
              {line}
            </p>
          ))}
        </div>

        <div className="absolute left-6 top-6 space-y-1 text-sm">
          {LINES.slice(0, shown).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="bi-caret">_</p>
        </div>

        {intro === "chrome" ? (
          <img src={chromeLogo.url} alt="Chromebook logo" draggable={false} className="bi-chrome relative size-48 select-none" />
        ) : (
          <span aria-hidden className="bi-spin relative select-none text-[12rem] font-black leading-none">
            1
          </span>
        )}

        {phase === "crash" && <div aria-hidden className="bi-flash" />}

        <p className="absolute bottom-6 text-xs opacity-60">click to skip</p>
      </div>
    </>
  );
}
