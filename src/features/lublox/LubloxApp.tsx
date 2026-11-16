import { lazy, Suspense, useState, type ReactNode } from "react";
import { ArrowLeft, Box, Play, RefreshCw, Search, Shirt } from "lucide-react";
import type { AppProps } from "../../apps/types";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { STARTER, worldSchema, type Block } from "./lublox";
import { fetchAvatar } from "./avatar";
import { LubloxShop } from "./shop";
import { useLoad } from "./useLoad";
import "./lublox.css";

/** The 3D scene (R3F + Rapier) is its own chunk, loaded only when a world starts. */
const LubloxScene = lazy(() => import("./scene").then((m) => ({ default: m.LubloxScene })));

type Playing = { title: string; blocks: Block[]; plains?: boolean };

export default function LubloxApp({ shell }: AppProps) {
  const avatar = useLoad(fetchAvatar, []);
  const [shop, setShop] = useState(false);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [search, setSearch] = useState("");
  const games = useLoad(
    async () => {
      const { data, error } = await supabase
        .from("lublox_games")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    [],
  );

  if (playing)
    return (
      <div className="lublox flex h-full flex-col bg-background">
        <header className="flex items-center gap-3 border-b p-2">
          <Button size="icon" variant="ghost" aria-label="Back to Lublox" title="Back to Lublox" onClick={() => setPlaying(null)}>
            <ArrowLeft />
          </Button>
          <h2 className="font-semibold text-foreground">{playing.title}</h2>
        </header>
        <div className="min-h-0 flex-1">
          <Suspense
            fallback={
              <div role="status" className="p-8 text-sm text-muted-foreground">
                Loading world…
              </div>
            }
          >
            <LubloxScene blocks={playing.blocks} plains={!!playing.plains} avatar={avatar.data} onLeave={() => setPlaying(null)} />
          </Suspense>
        </div>
      </div>
    );

  if (shop)
    return (
      <div className="lublox h-full overflow-y-auto bg-background">
        <LubloxShop
          onBack={() => setShop(false)}
          avatar={avatar.data}
          onAvatarChange={avatar.reload}
          toast={(text, kind) => shell.toast(text, kind)}
        />
      </div>
    );

  const term = search.trim().toLowerCase();
  const filtered = (games.data ?? []).filter((g) => g.title.toLowerCase().includes(term));

  return (
    <div className="lublox h-full overflow-y-auto bg-background">
      <div className="min-h-full p-5 sm:p-8">
        <header className="shell-glass mb-8 flex flex-wrap items-center gap-3 rounded-[18px] border p-4">
          <span className="grid size-11 place-items-center rounded-[14px] bg-[color-mix(in_oklab,var(--app-lublox,var(--primary))_18%,transparent)] text-[var(--app-lublox,var(--primary))] ring-1 ring-[color-mix(in_oklab,var(--app-lublox,var(--primary))_35%,transparent)]">
            <Box className="size-6" aria-hidden="true" />
          </span>
          <h1 className="font-display text-3xl font-black tracking-tight text-foreground">LUBLOX</h1>
          <label className="ml-auto flex items-center gap-2 rounded-[12px] border border-border bg-background/50 px-3 py-2 text-foreground transition-colors focus-within:border-[var(--app-lublox,var(--primary))]">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              aria-label="Search Lublox games"
              placeholder="Search games"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-36 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-52"
            />
          </label>
          <Button variant="secondary" onClick={() => setShop(true)}>
            <Shirt /> Avatar shop
          </Button>
          <Button size="icon" variant="ghost" aria-label="Refresh games" title="Refresh games" onClick={() => games.reload()}>
            <RefreshCw />
          </Button>
        </header>

        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Jump in</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <GameCard
            title="Grassy Plains"
            subtitle="Lublox original · Hangout"
            art={<PlainsArt />}
            onPlay={() => setPlaying({ title: "Grassy Plains", blocks: [], plains: true })}
          />
          <GameCard
            title="Sky Steps"
            subtitle="Lublox original · Obby"
            art={<WorldArt />}
            onPlay={() => setPlaying({ title: "Sky Steps", blocks: STARTER })}
          />
          {filtered.map((g) => (
            <GameCard
              key={g.id}
              title={g.title}
              subtitle={g.description || "Community world"}
              art={<WorldArt />}
              onPlay={() => {
                const r = worldSchema.safeParse(g.blocks);
                if (r.success) setPlaying({ title: g.title, blocks: r.data });
                else shell.toast("This world could not be loaded.", "error");
              }}
            />
          ))}
        </div>
        {games.pending && !games.data && (
          <p role="status" className="mt-6 text-sm text-muted-foreground">
            Loading community games…
          </p>
        )}
        {games.error && (
          <p role="alert" className="mt-6 text-sm text-destructive">
            {games.error.message}
          </p>
        )}
      </div>
    </div>
  );
}

function GameCard({ title, subtitle, art, onPlay }: { title: string; subtitle: string; art: ReactNode; onPlay: () => void }) {
  return (
    <article className="shell-glass group flex flex-col overflow-hidden rounded-[18px] border text-card-foreground transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-1 hover:shadow-[0_22px_44px_-20px_color-mix(in_oklab,var(--app-lublox,var(--primary))_75%,transparent)]">
      <div className="overflow-hidden border-b border-border/60">{art}</div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="break-words font-display font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 break-words text-sm text-muted-foreground">{subtitle}</p>
        <Button className="mt-4 w-full rounded-[12px] bg-[var(--app-lublox,var(--primary))] text-primary-foreground shadow-[0_10px_24px_-12px_color-mix(in_oklab,var(--app-lublox,var(--primary))_85%,transparent)] hover:brightness-110" onClick={onPlay}>
          <Play /> Play
        </Button>
      </div>
    </article>
  );
}

function PlainsArt() {
  return (
    <svg viewBox="0 0 400 180" className="w-full" aria-hidden="true">
      <rect width="400" height="180" className="lublox-art-sky" />
      <rect y="120" width="400" height="60" className="lublox-art-top" />
      <path d="M210 120V80h70v40Z" className="lublox-art-front" />
      <path d="M200 82l45-32 45 32Z" className="lublox-art-side" />
    </svg>
  );
}

function WorldArt() {
  return (
    <svg viewBox="0 0 400 180" className="w-full" aria-hidden="true">
      <rect width="400" height="180" className="lublox-art-sky" />
      {[0, 1, 2, 3, 4].map((n) => (
        <g key={n} transform={`translate(${35 + n * 65},${125 - n * 20})`}>
          <path d="M0 0 35 -17 70 0 35 17Z" className="lublox-art-top" />
          <path d="M0 0 35 17 35 30 0 13Z" className="lublox-art-side" />
          <path d="M35 17 70 0 70 13 35 30Z" className="lublox-art-front" />
        </g>
      ))}
      <circle cx="330" cy="36" r="14" fill="none" className="lublox-art-goal" strokeWidth="5" />
    </svg>
  );
}
