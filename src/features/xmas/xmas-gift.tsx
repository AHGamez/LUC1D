import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import giftAudio from "@/assets/xmas-gift-audio.mp3.asset.json";
import { useXmasAccess } from "./xmasAccess";
import "./xmas.css";

const REWARDS: Record<string, string> = {
  "lbxhat-santa": "🎅 Santa Hat for your Lublox avatar",
  "bg-xmas": "🎄 The Xmas Snowfall background — free!",
  "tag-xmas26": "✨ The XMAS-26 chat tag",
};

/**
 * One free gift per account: tap the box 3 times to open it. The reward is picked and saved by
 * xmas_gift_open() (migration 0062). The client never chooses it. Mount it once in the shell.
 */
export function XmasGift() {
  const xmas = useXmasAccess();
  const [show, setShow] = useState(false);
  const [taps, setTaps] = useState(0);
  const [reward, setReward] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // tuffboi_claim() is the existing server-side claim; the database decides whether it applies.
  useEffect(() => {
    void supabase.rpc("tuffboi_claim");
  }, []);

  // Show the box only if this account has not opened its gift yet. A failed read shows nothing.
  useEffect(() => {
    if (!xmas) return;
    let live = true;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data, error } = await supabase.from("xmas_gifts").select("reward").eq("user_id", u.user.id).maybeSingle();
      if (live && !error && !data) setShow(true);
    })();
    return () => { live = false; };
  }, [xmas]);

  // Play the jingle once when the box appears. If the browser blocks autoplay, start it on the first tap.
  // The audio file is not bundled in every build, so a failed play is ignored.
  useEffect(() => {
    if (!show) return;
    const a = new Audio(giftAudio.url);
    audioRef.current = a;
    void a.play().catch(() => {});
    return () => { a.pause(); audioRef.current = null; };
  }, [show]);

  if (!show) return null;

  const tap = async () => {
    if (reward) return;
    const a = audioRef.current;
    if (a && a.paused) void a.play().catch(() => {});
    const n = taps + 1;
    setTaps(n);
    if (n < 3) return;
    const { data, error } = await supabase.rpc("xmas_gift_open");
    if (error) { setErr(error.message); setTaps(0); return; }
    setErr("");
    setReward(typeof data === "string" ? data : String(data ?? ""));
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Christmas gift" className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-background/70 p-4 backdrop-blur-md">
      <h2 className="font-display text-2xl font-black tracking-widest text-foreground">MERRY CHRISTMAS!</h2>
      {!reward ? (
        <>
          <button
            type="button"
            aria-label="Open your gift"
            onClick={() => void tap()}
            key={taps}
            className="xmas-giftbox text-[9rem] leading-none"
            style={{ transform: `scale(${1 + taps * 0.12})` }}
          >
            🎁
          </button>
          <p className="text-sm text-muted-foreground">Tap the gift {3 - taps} more {3 - taps === 1 ? "time" : "times"}!</p>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        </>
      ) : (
        <>
          <div className="xmas-giftburst text-[7rem] leading-none" aria-hidden="true">🎉</div>
          <p className="text-lg font-bold text-foreground">You got: {REWARDS[reward] ?? reward}</p>
          {reward === "tag-xmas26" && (
            <span className="xmas-aura"><span className="xmas-aura-inner">XMAS-26</span></span>
          )}
          <button type="button" onClick={() => setShow(false)} className="rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
            Awesome!
          </button>
        </>
      )}
    </div>
  );
}
