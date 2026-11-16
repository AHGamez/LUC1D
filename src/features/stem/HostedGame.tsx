import { useEffect, useRef, useState } from "react";
import { Maximize, RotateCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/kit";
import { type GameEntry, sourceInfo } from "./games";
import { framePath, prepareLocalGame } from "./hostedHtml";
import { UnavailableNote } from "./GameNotice";

// Local copies run in an opaque origin: scripts run, but nothing can reach this site's storage or session.
const LOCAL_SANDBOX = "allow-scripts allow-pointer-lock allow-forms allow-popups";
// FivePlay is an embedded launcher that needs its own origin to work.
const HOSTED_SANDBOX = "allow-scripts allow-same-origin allow-pointer-lock allow-forms";

/** Plays one game in a sandboxed frame, with reload, fullscreen and a link to the source page. */
export function HostedGame({ game }: { game: GameEntry }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [run, setRun] = useState(0);
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [framed, setFramed] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const hosted = game.source === "fiveplay";
  const source = sourceInfo(game.source);

  // Local game pages are fetched and prepared (base URL, storage shim) before they are framed.
  useEffect(() => {
    if (hosted) return;
    const controller = new AbortController();
    const path = framePath(game.embedUrl);
    fetch(path, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => setSrcDoc(prepareLocalGame(html, path, game.source)))
      .catch(() => {
        if (!controller.signal.aborted) setLoadError("This game could not be loaded.");
      });
    return () => controller.abort();
  }, [game.embedUrl, game.source, hosted, run]);

  const reload = () => {
    setSrcDoc(null);
    setLoadError("");
    setFramed(false);
    setFullscreenError("");
    setRun((v) => v + 1);
  };

  const fullscreen = async () => {
    setFullscreenError("");
    try {
      await frame.current?.requestFullscreen();
    } catch {
      setFullscreenError("Fullscreen is unavailable in this browser.");
    }
  };

  const ready = hosted ? true : srcDoc !== null;
  const loading = !framed && !loadError;

  return (
    <div className="flex h-full min-h-[360px] flex-col bg-stem">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--shell-glass-border)] bg-titlebar px-3 py-2 shadow-[var(--surface-highlight)]">
        <span role="status" className="mr-auto text-xs text-muted-foreground">
          {loading ? "Loading…" : source.domain}
        </span>
        <Button variant="ghost" size="icon" title="Reload game" aria-label="Reload game" onClick={reload}>
          <RotateCw />
        </Button>
        <Button variant="ghost" size="icon" title="Fullscreen" aria-label="Fullscreen" onClick={fullscreen}>
          <Maximize />
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.open(game.url, "_blank", "noopener,noreferrer")}>
          Open on {source.name}
        </Button>
      </div>

      {fullscreenError && <p role="alert" className="px-3 py-2 text-xs text-destructive">{fullscreenError}</p>}

      <div className="relative min-h-0 flex-1">
        {loadError && (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center">
            <p role="alert" className="text-sm text-destructive">{loadError}</p>
            <UnavailableNote game={game} />
            <Button variant="outline" size="sm" onClick={reload}>Try again</Button>
          </div>
        )}

        {!loadError && loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Spinner />
          </div>
        )}

        {ready && !loadError && (
          <iframe
            key={run}
            ref={frame}
            title={game.name}
            {...(hosted ? { src: game.embedUrl } : { srcDoc: srcDoc ?? "" })}
            onLoad={() => setFramed(true)}
            allow="fullscreen; autoplay; gamepad"
            allowFullScreen
            sandbox={hosted ? HOSTED_SANDBOX : LOCAL_SANDBOX}
            referrerPolicy="no-referrer"
            className="block h-full min-h-[360px] w-full border-0 bg-background"
          />
        )}
      </div>
    </div>
  );
}
