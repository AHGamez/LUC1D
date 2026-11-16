import { lazy, Suspense, useRef, useState } from "react";
import { ArrowLeft, Box, FileUp, Play, Plus, Save, Trash2, Undo2, Upload } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { STARTER, worldSchema, type Block } from "../lublox/lublox";
import { useLoad } from "../lublox/useLoad";
import AiBuildPanel from "../lublox/ai/AiBuildPanel";
import "../lublox/lublox.css";

/** The 3D editor shares the Lublox scene; it loads only when Studio opens. */
const Scene = lazy(() => import("../lublox/scene").then((m) => ({ default: m.LubloxScene })));

const NEW_TITLE = "My first obby";
const MAX_BLOCKS = 200;

/** Studio is staff-only. The database (lublox_can_create + RLS) is the real gate; this only decides what to show. */
async function loadAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc("lublox_can_create");
  if (error) throw error;
  return data === true;
}

async function loadDrafts() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to open Studio.");
  const { data, error } = await supabase
    .from("lublox_games")
    .select("*")
    .eq("creator_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export default function StudioApp() {
  const importInput = useRef<HTMLInputElement>(null);
  const access = useLoad(loadAccess, []);
  const canCreate = access.data === true;
  const drafts = useLoad(canCreate ? loadDrafts : null, [canCreate]);

  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState(NEW_TITLE);
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<Block[]>(STARTER);
  const [history, setHistory] = useState<Block[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [block, setBlock] = useState<Block>({ kind: "platform", x: 0, y: 0, z: -5 });
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const change = (next: Block[]) => {
    const parsed = worldSchema.safeParse(next);
    if (!parsed.success) {
      setError("Keep blocks inside the world limits.");
      return;
    }
    setError("");
    setHistory((h) => [...h.slice(-19), blocks]);
    setBlocks(parsed.data);
  };

  const importMap = async (file: File) => {
    setBusy(true);
    setMessage("Importing map…");
    setError("");
    try {
      // The reader and its worker are only downloaded when a map is actually imported.
      const { importRobloxFile } = await import("./lublox-import");
      const result = await importRobloxFile(file);
      setHistory((h) => [...h.slice(-19), blocks]);
      setBlocks(result.blocks);
      setId(null);
      setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "Imported map");
      setDescription("");
      setSelected(null);
      setTesting(false);
      setMessage(
        `Imported ${result.blocks.length} parts.${result.scale < 1 ? " Scaled to fit Lublox." : ""}${
          result.approximated ? ` ${result.approximated} shapes converted to boxes.` : ""
        }${result.skipped ? ` ${result.skipped} unsupported objects skipped.` : ""} Scripts, terrain and textures are not imported.`,
      );
    } catch (e) {
      setMessage("");
      setError(e instanceof Error ? e.message : "Could not import this map.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (published: boolean) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const parsed = worldSchema.safeParse(blocks);
      if (!parsed.success) throw new Error("Keep blocks inside the world limits.");
      if (!title.trim()) throw new Error("Give your world a name.");
      const row = { title: title.trim(), description, blocks: parsed.data, published };
      // creator_id defaults to auth.uid() and RLS requires staff, so the server re-checks every save.
      const response = id
        ? await supabase.from("lublox_games").update(row).eq("id", id).select("id").single()
        : await supabase.from("lublox_games").insert(row).select("id").single();
      if (response.error) throw new Error(response.error.message);
      setId(response.data.id);
      setMessage(published ? "Published! Your game is now in Lublox." : "Draft saved.");
      drafts.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your world.");
    } finally {
      setBusy(false);
    }
  };

  if (access.pending)
    return (
      <p role="status" className="p-8 text-sm text-muted-foreground">
        Checking Studio access…
      </p>
    );
  if (access.error)
    return (
      <p role="alert" className="p-8 text-sm text-destructive">
        {access.error.message}
      </p>
    );
  if (!canCreate)
    return (
      <div className="lublox flex h-full flex-col items-center justify-center gap-4 bg-background p-8">
        <Box className="size-12 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-foreground">Lublox Studio</h1>
        <p className="max-w-md text-center text-muted-foreground">
          Game creation is currently open to moderators, co-owners and the owner only.
        </p>
      </div>
    );

  return (
    <div className="lublox flex h-full flex-col bg-background text-foreground">
      <header className="shell-glass flex flex-wrap items-center gap-2 border-b p-3">
        <span className="grid size-9 place-items-center rounded-[12px] bg-[color-mix(in_oklab,var(--app-lublox,var(--primary))_18%,transparent)] text-[var(--app-lublox,var(--primary))]">
          <Box className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mr-auto font-display font-bold tracking-tight">LUBLOX STUDIO</h1>
        <input
          ref={importInput}
          type="file"
          className="hidden"
          aria-label="Import Roblox map"
          accept=".rblx,.rbxl,.rbxlx,.rbxm,.rbxmx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importMap(file);
          }}
        />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => importInput.current?.click()}>
          <FileUp /> Import map
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setTesting((v) => !v)}>
          {testing ? <ArrowLeft /> : <Play />}
          {testing ? "Edit" : "Test"}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void save(false)}>
          <Save /> Save draft
        </Button>
        <Button size="sm" disabled={busy} className="rounded-[12px] bg-[var(--app-lublox,var(--primary))] text-primary-foreground hover:brightness-110" onClick={() => void save(true)}>
          <Upload /> Publish
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {!testing && (
          <aside
            aria-busy={busy}
            inert={busy}
            className={`shell-glass max-h-72 w-full shrink-0 space-y-4 overflow-y-auto border-b p-4 text-card-foreground md:m-2 md:mr-0 md:max-h-none md:w-72 md:rounded-[18px] md:border md:border-b md:border-r-0 ${
              busy ? "opacity-60" : ""
            }`}
          >
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              World name
              <input
                aria-label="World name"
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-[12px] border border-border bg-background/60 p-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              Description
              <textarea
                aria-label="World description"
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-y rounded-[12px] border border-border bg-background/60 p-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              Block type
              <select
                aria-label="Block type"
                value={block.kind}
                onChange={(e) => setBlock({ ...block, kind: e.target.value as Block["kind"] })}
                className="w-full rounded-[12px] border border-border bg-background/60 p-2 text-sm text-foreground"
              >
                <option value="platform">Platform</option>
                <option value="hazard">Hazard</option>
                <option value="goal">Finish</option>
                <option value="car">Car</option>
                <option value="lambo">Lamborghini</option>
                <option value="ebike">E-bike</option>
                <option value="sword">Sword</option>
                <option value="gun">Gun</option>
              </select>
            </label>
            {["car", "lambo", "ebike", "sword", "gun"].includes(block.kind) && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Color
                  <input aria-label="Block color" type="color" value={block.color ?? "#d23a2f"} onChange={(e) => setBlock({ ...block, color: e.target.value })} className="mt-1 h-9 w-full rounded-[12px] border border-border bg-background/60" />
                </label>
                {(block.kind === "sword" || block.kind === "gun") && (
                  <label className="text-xs font-medium text-muted-foreground">
                    Trim
                    <input aria-label="Block trim color" type="color" value={block.accent ?? "#d4a52a"} onChange={(e) => setBlock({ ...block, accent: e.target.value })} className="mt-1 h-9 w-full rounded-[12px] border border-border bg-background/60" />
                  </label>
                )}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {(["x", "y", "z"] as const).map((axis) => (
                <label key={axis} className="space-y-1 text-xs font-medium uppercase text-muted-foreground">
                  {axis}
                  <input
                    aria-label={`Block ${axis}`}
                    type="number"
                    min={axis === "y" ? 0 : -40}
                    max={axis === "y" ? 30 : 40}
                    value={block[axis]}
                    onChange={(e) => setBlock({ ...block, [axis]: Number(e.target.value) })}
                    className="w-full rounded-[12px] border border-border bg-background/60 p-2 text-sm text-foreground"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={blocks.length >= MAX_BLOCKS}
                onClick={() => {
                  change([...blocks, { ...block }]);
                  setSelected(null);
                }}
              >
                <Plus /> Add
              </Button>
              <Button
                size="icon"
                variant="outline"
                title="Remove selected block"
                aria-label="Remove selected block"
                disabled={selected === null}
                onClick={() => {
                  change(blocks.filter((_, i) => i !== selected));
                  setSelected(null);
                }}
              >
                <Trash2 />
              </Button>
              <Button
                size="icon"
                variant="outline"
                aria-label="Undo"
                title="Undo"
                disabled={!history.length}
                onClick={() => {
                  const previous = history.at(-1);
                  if (previous) {
                    setBlocks(previous);
                    setHistory((h) => h.slice(0, -1));
                    setSelected(null);
                  }
                }}
              >
                <Undo2 />
              </Button>
            </div>
            {selected !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => change(blocks.map((b, i) => (i === selected ? { ...b, ...block } : b)))}
              >
                Update selected block
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {blocks.length} blocks{selected !== null ? ` · Selected ${selected + 1}` : ""}
            </p>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              Your worlds
              <select
                aria-label="Your worlds"
                value={id ?? ""}
                onChange={(e) => {
                  const g = drafts.data?.find((d) => d.id === e.target.value);
                  if (!g) {
                    setId(null);
                    setTitle(NEW_TITLE);
                    setDescription("");
                    setBlocks(STARTER);
                  } else {
                    const parsed = worldSchema.safeParse(g.blocks);
                    if (!parsed.success) return;
                    setId(g.id);
                    setTitle(g.title);
                    setDescription(g.description);
                    setBlocks(parsed.data);
                  }
                  setHistory([]);
                  setSelected(null);
                  setMessage("");
                }}
                className="w-full rounded-[12px] border border-border bg-background/60 p-2 text-sm text-foreground"
              >
                <option value="">New world</option>
                {drafts.data?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                    {g.published ? " · Published" : " · Draft"}
                  </option>
                ))}
              </select>
            </label>
            {drafts.error && (
              <p role="alert" className="text-xs text-destructive">
                {drafts.error.message}
              </p>
            )}
            <AiBuildPanel
              blocks={blocks}
              disabled={busy}
              onBusyChange={setBusy}
              onApply={(next, status) => {
                // Same undo rule as every other edit: the old world goes on the history first.
                setHistory((h) => [...h.slice(-19), blocks]);
                setBlocks(next);
                setSelected(null);
                setMessage(status);
              }}
            />
          </aside>
        )}
        <div className="relative m-2 min-h-64 min-w-0 flex-1 overflow-hidden rounded-[18px] border border-border/70 shadow-[0_24px_60px_-28px_color-mix(in_oklab,var(--app-lublox,var(--primary))_60%,transparent)]">
          <Suspense
            fallback={
              <p role="status" className="p-8 text-sm text-muted-foreground">
                Opening 3D Studio…
              </p>
            }
          >
            <Scene
              key={testing ? "play" : "edit"}
              blocks={blocks}
              editing={!testing}
              onSelect={(i) => {
                const b = blocks[i];
                if (b) {
                  setSelected(i);
                  setBlock({ ...b });
                }
              }}
            />
          </Suspense>
        </div>
      </div>
      {(message || error) && (
        <p
          role={error ? "alert" : "status"}
          className={`shell-glass border-t px-4 py-2 text-sm ${error ? "text-destructive" : "text-[var(--app-lublox,var(--primary))]"}`}
        >
          {error || message}
        </p>
      )}
    </div>
  );
}
