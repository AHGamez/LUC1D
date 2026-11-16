import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Crown, ImagePlus, Loader2, Swords, Trash2, X } from "lucide-react";
import type { AppProps } from "../../apps/types";
import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";

type Battle = Database["public"]["Tables"]["larp_battles"]["Row"];
const TOPICS = ["anything", "money", "grades", "drip", "tech", "cars", "skills", "food"];
const BUCKET = "larp-flex";
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;
const JUDGE_FAILED = "The judge couldn't decide. Try again.";

/**
 * Asks the server to judge a battle. Verdicts are written only by the server, which checks the
 * caller is one of the two players. The browser never sends a winner or a score.
 */
async function requestJudgement(id: string): Promise<{ error?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Sign in again to ask the judge." };
  try {
    const res = await fetch("/api/larp/judge", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    if (!res.ok) return { error: typeof body?.error === "string" ? body.error : JUDGE_FAILED };
    return {};
  } catch {
    return { error: JUDGE_FAILED };
  }
}

/** Larp Flex now runs on LarpGPT. LarpGPT cannot be shown inside another site, so this opens it in its own tab. */
export default function LarpFlexApp({ session, shell }: AppProps) {
  const me = session.user?.id ?? null;
  const [classic, setClassic] = useState(false);
  if (!me) return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-club,var(--primary))_16%,transparent)] text-[var(--app-club,var(--primary))]">
          <Swords className="size-7" aria-hidden="true" />
        </span>
        <p className="font-display text-base font-semibold tracking-tight">Larp Flex</p>
        <p className="text-sm text-muted-foreground">Sign in to play Larp Flex.</p>
      </div>
  );
  if (!classic) return <LarpGptLaunch onClassic={() => setClassic(true)} />;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-3 py-2">
        <button type="button" onClick={() => setClassic(false)} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
          ← Back to LarpGPT
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <LarpFlexBattles me={me} shell={shell} />
      </div>
    </div>
  );
}

function LarpGptLaunch({ onClassic }: { onClassic: () => void }) {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4 overflow-y-auto bg-background p-6 text-center text-foreground">
      <Swords className="size-12 text-primary" aria-hidden="true" />
      <h2 className="text-2xl font-black tracking-tight">Larp Flex is now powered by LarpGPT</h2>
      <p className="max-w-md text-sm text-muted-foreground">LarpGPT doesn't allow itself to be shown inside other sites, so it opens in a new tab.</p>
      <a
        href="https://larpgpt.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Open LarpGPT
      </a>
      <p className="text-xs text-muted-foreground">
        All credit to{" "}
        <a className="underline underline-offset-4" href="https://www.tiktok.com/search?q=larpgpt" target="_blank" rel="noopener noreferrer">
          LarpGPT on TikTok
        </a>
        .
      </p>
      <button type="button" onClick={onClassic} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Play our old Larp Flex battles
      </button>
    </div>
  );
}

function LarpFlexBattles({ me, shell }: { me: string; shell: AppProps["shell"] }) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [form, setForm] = useState<{ joinId?: string } | null>(null);
  const [tab, setTab] = useState<"open" | "mine" | "results">("open");
  const [err, setErr] = useState("");
  const [judging, setJudging] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("larp_battles").select("*").order("created_at", { ascending: false }).limit(100);
    const rows = data ?? [];
    setBattles(rows);
    const ids = [...new Set(rows.flatMap((b) => [b.challenger_id, b.opponent_id ?? ""]).filter(Boolean))];
    if (ids.length) {
      const { data: p } = await supabase.from("discard_profiles").select("user_id, display_name").in("user_id", ids);
      setNames(Object.fromEntries((p ?? []).map((x) => [x.user_id, x.display_name])));
    }
    // Migration 0042: only the two players can read a battle picture, so only sign the ones this user may see.
    const paths = rows
      .filter((b) => b.challenger_id === me || b.opponent_id === me)
      .flatMap((b) => [b.challenger_image, b.opponent_image])
      .filter((x): x is string => !!x);
    if (paths.length) {
      const { data: s } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      setUrls(Object.fromEntries((s ?? []).map((x) => [x.path ?? "", x.signedUrl ?? ""])));
    }
  }, [me]);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel(`larp-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "larp_battles" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  const runJudge = async (id: string) => {
    setJudging(id);
    setErr("");
    const r = await requestJudgement(id);
    if (r.error) setErr(r.error);
    setJudging(null);
    void load();
  };

  const cancelBattle = async (id: string) => {
    const { error } = await supabase.from("larp_battles").delete().eq("id", id);
    if (error) shell.toast(error.message, "error");
    void load();
  };

  const name = (id: string | null) => (id && names[id]) || "someone";
  const shown = battles.filter((b) =>
    tab === "open" ? b.status === "open" : tab === "mine" ? b.challenger_id === me || b.opponent_id === me : b.status === "done",
  );

  return (
    <div className="relative flex h-full flex-col bg-background text-foreground">
      <header className="shell-glass flex flex-wrap items-center gap-3 border-b p-4">
        <span className="grid size-10 place-items-center rounded-[12px] bg-[color-mix(in_oklab,var(--app-larp,var(--primary))_18%,transparent)] text-[var(--app-larp,var(--primary))] ring-1 ring-[color-mix(in_oklab,var(--app-larp,var(--primary))_35%,transparent)]">
          <Swords className="size-5" aria-hidden="true" />
        </span>
        <div className="mr-auto">
          <h2 className="font-display text-xl font-bold tracking-tight">
            LARP <span className="text-[var(--app-larp,var(--primary))]">FLEX</span>
          </h2>
          <p className="text-xs text-muted-foreground">Flex your stuff 1v1. The AI judge picks who wins.</p>
        </div>
        <Button onClick={() => setForm({})}>Start a battle</Button>
      </header>

      <nav className="flex gap-1.5 p-3" aria-label="Battle filters">
        {(["open", "mine", "results"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "secondary" : "ghost"}
            className={`rounded-[10px] ${tab === t ? "border border-[var(--app-larp,var(--primary))] text-[var(--app-larp,var(--primary))]" : ""}`}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "open" ? "Open battles" : t === "mine" ? "My battles" : "Results"}
          </Button>
        ))}
      </nav>

      {err && <p role="alert" className="px-4 text-sm text-destructive">{err}</p>}

      <div className="grid flex-1 auto-rows-min gap-3 overflow-y-auto p-4 md:grid-cols-2">
        {shown.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-larp,var(--primary))_16%,transparent)] text-[var(--app-larp,var(--primary))]">
              <Swords className="size-7" aria-hidden="true" />
            </span>
            <p className="font-display text-base font-semibold tracking-tight">{tab === "open" ? "No open battles" : "Nothing here yet"}</p>
            <p className="text-sm text-muted-foreground">{tab === "open" ? "Start one and the next player can flex back." : "Battles you join or judge show up here."}</p>
            {tab === "open" && (
              <Button size="sm" className="mt-1 rounded-[12px] bg-[var(--app-larp,var(--primary))] text-primary-foreground" onClick={() => setForm({})}>
                Start a battle
              </Button>
            )}
          </div>
        )}
        {shown.map((b) => (
          <BattleCard
            key={b.id}
            b={b}
            me={me}
            name={name}
            urls={urls}
            judging={judging}
            onJoin={() => setForm({ joinId: b.id })}
            onCancel={() => cancelBattle(b.id)}
            onJudge={() => runJudge(b.id)}
          />
        ))}
      </div>

      {form && (
        <FlexForm
          me={me}
          joinBattle={battles.find((b) => b.id === form.joinId)}
          onClose={() => setForm(null)}
          onDone={(joinedId) => {
            setForm(null);
            setTab("mine");
            void load();
            if (joinedId) void runJudge(joinedId);
          }}
        />
      )}
    </div>
  );
}

function BattleCard({
  b, me, name, urls, judging, onJoin, onCancel, onJudge,
}: {
  b: Battle;
  me: string;
  name: (id: string | null) => string;
  urls: Record<string, string>;
  judging: string | null;
  onJoin: () => void;
  onCancel: () => void;
  onJudge: () => void;
}) {
  const isPlayer = b.challenger_id === me || b.opponent_id === me;
  const statusLabel =
    b.status === "open" ? "Waiting for opponent" : b.status === "done" ? "Judged" : b.status === "judging" ? "Judging…" : "Ready to judge";
  const busy = b.status === "judging" || judging === b.id;
  return (
    <article className="shell-glass space-y-3 rounded-[18px] border p-4 transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span>
          Topic: <b className="font-display normal-case tracking-tight text-foreground">{b.topic}</b>
        </span>
        <span className={`rounded-full px-2.5 py-0.5 ${b.status === "done" ? "bg-success/15 text-success" : b.status === "open" ? "bg-secondary text-muted-foreground" : "bg-[color-mix(in_oklab,var(--app-larp,var(--primary))_18%,transparent)] text-[var(--app-larp,var(--primary))]"}`}>{statusLabel}</span>
      </div>
      <div className="relative grid grid-cols-2 gap-3">
        <FlexSide
          label={name(b.challenger_id)}
          text={b.challenger_flex}
          img={b.challenger_image ? urls[b.challenger_image] : undefined}
          pictureHidden={!!b.challenger_image && !isPlayer}
          score={b.challenger_score}
          win={b.status === "done" && b.winner_id === b.challenger_id}
        />
        {b.opponent_id ? (
          <FlexSide
            label={name(b.opponent_id)}
            text={b.opponent_flex ?? ""}
            img={b.opponent_image ? urls[b.opponent_image] : undefined}
            pictureHidden={!!b.opponent_image && !isPlayer}
            score={b.opponent_score}
            win={b.status === "done" && b.winner_id === b.opponent_id}
          />
        ) : (
          <div className="flex items-center justify-center rounded-[14px] border border-dashed border-border bg-secondary/30 p-4 text-center font-display text-lg font-bold text-muted-foreground">???</div>
        )}
      </div>
      {b.verdict && (
        <p className="rounded-[14px] border border-[color-mix(in_oklab,var(--app-larp,var(--primary))_30%,transparent)] bg-[color-mix(in_oklab,var(--app-larp,var(--primary))_10%,transparent)] p-3 text-sm">
          <Crown className="mr-1 inline size-4 text-[var(--app-larp,var(--primary))]" aria-hidden="true" />
          {b.verdict}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {b.status === "open" && b.challenger_id !== me && (
          <Button size="sm" onClick={onJoin}>Accept &amp; flex back</Button>
        )}
        {b.status === "open" && b.challenger_id === me && (
          <Button size="sm" variant="ghost" onClick={onCancel}><Trash2 />Cancel</Button>
        )}
        {(b.status === "ready" || b.status === "judging") && isPlayer && (
          <Button size="sm" disabled={busy} onClick={onJudge}>
            {busy && <Loader2 className="animate-spin" />}
            Ask the judge
          </Button>
        )}
      </div>
    </article>
  );
}

function FlexSide({
  label, text, img, pictureHidden, score, win,
}: { label: string; text: string; img?: string | undefined; pictureHidden: boolean; score: number | null; win: boolean }) {
  return (
    <div className={`space-y-2 rounded-[14px] border bg-secondary/30 p-2 ${win ? "border-[var(--app-larp,var(--primary))] shadow-[0_0_0_1px_var(--app-larp,var(--primary)),0_14px_30px_-14px_color-mix(in_oklab,var(--app-larp,var(--primary))_85%,transparent)]" : "border-border"}`}>
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="truncate">
          {win && "👑 "}
          {label}
        </span>
        {score != null && <span className="text-primary">{score}</span>}
      </div>
      {img && <img src={img} alt={`${label}'s flex`} className="aspect-square w-full rounded-[10px] object-cover" />}
      {!img && pictureHidden && <p className="rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">Picture shared with the two players only.</p>}
      {text && <p className="break-words text-sm">{text}</p>}
    </div>
  );
}

function FlexForm({
  me, joinBattle, onClose, onDone,
}: {
  me: string;
  joinBattle?: Battle | undefined;
  onClose: () => void;
  onDone: (joinedId?: string) => void;
}) {
  const [topic, setTopic] = useState("anything");
  const [text, setText] = useState("");
  const [file, setFile] = useState<Blob | null>(null);
  const [cam, setCam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // The effect owns the object URL, so it is revoked when the picture changes or the form closes.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const stopCam = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCam(false);
  }, []);
  useEffect(() => stopCam, [stopCam]);

  const startCam = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: true });
      setCam(true);
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = stream.current;
          video.current.play().catch(() => {});
        }
      });
    } catch {
      setErr("Couldn't open your camera — allow camera access in your browser.");
    }
  };

  const snap = () => {
    const v = video.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (b) setFile(b);
      stopCam();
    }, "image/jpeg", 0.85);
  };

  const submit = async () => {
    if (!text.trim() && !file) return setErr("Describe your flex or add a picture.");
    if (file && file.size > MAX_PICTURE_BYTES) return setErr("Pictures must be under 5 MB.");
    setBusy(true);
    setErr("");
    let path: string | null = null;
    if (file) {
      path = `${me}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "image/jpeg" });
      if (up.error) {
        setBusy(false);
        return setErr(up.error.message);
      }
    }
    if (joinBattle) {
      // larp_join is a security-definer function that sets the opponent and moves the battle to ready.
      // It accepts a null picture, which the generated type does not show.
      const { error } = await supabase.rpc("larp_join", {
        _id: joinBattle.id,
        _flex: text.trim().slice(0, 500),
        _image: path as string,
      });
      setBusy(false);
      if (error) return setErr(error.message);
      onDone(joinBattle.id);
    } else {
      const { error } = await supabase.from("larp_battles").insert({
        challenger_id: me,
        topic,
        challenger_flex: text.trim().slice(0, 500),
        challenger_image: path,
      });
      setBusy(false);
      if (error) return setErr(error.message);
      onDone();
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label={joinBattle ? "Flex back" : "Start a battle"} className="shell-glass max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-[18px] border p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-tight">{joinBattle ? `Flex back — topic: ${joinBattle.topic}` : "Start a battle"}</h3>
          <button aria-label="Close" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        {!joinBattle && (
          <div className="flex flex-wrap gap-1">
            {TOPICS.map((t) => (
              <Button key={t} size="sm" variant={topic === t ? "default" : "outline"} aria-pressed={topic === t} onClick={() => setTopic(t)}>
                {t}
              </Button>
            ))}
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={3}
          aria-label="Your flex"
          placeholder="What are you flexing? (e.g. straight A's, $500 in my wallet, new PC)"
          className="w-full rounded-xl border border-border bg-background p-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        {cam ? (
          <div className="space-y-2">
            <video ref={video} playsInline muted className="w-full rounded-xl bg-muted" />
            <div className="flex gap-2">
              <Button size="sm" onClick={snap}><Camera />Snap</Button>
              <Button size="sm" variant="ghost" onClick={stopCam}>Cancel</Button>
            </div>
          </div>
        ) : preview ? (
          <div className="relative">
            <img src={preview} alt="Your flex" className="max-h-64 w-full rounded-xl object-contain" />
            <Button size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => setFile(null)}>Remove</Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={startCam}><Camera />Live camera</Button>
            <Button size="sm" variant="outline" onClick={() => document.getElementById("larp-upload")?.click()}>
              <ImagePlus />Upload photo
            </Button>
            <input
              id="larp-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>
        )}
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy && <Loader2 className="animate-spin" />}
          {joinBattle ? "Flex & get judged" : "Post challenge"}
        </Button>
      </div>
    </div>
  );
}
