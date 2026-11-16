import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { LogOut, X } from "lucide-react";
import type { AppDefinition } from "../apps/types";
import { CLOCK_FONTS } from "../lib/prefs";
import { useClock } from "../hooks/useClock";
import { AppTile } from "../components/ui/AppTile";
import { GlassWordmark } from "./Logo";

export interface GlassHomeProps {
  /** Shortcuts for the curved dock. Usually every app with `dock: true`. */
  tiles: AppDefinition[];
  onOpen: (appId: string) => void;
  onHome: () => void;
  onSignOut: () => void;
  clock24: boolean;
  /** Glass clock typeface. Unknown names fall back to Sora. */
  clockFont: string;
  /** Glass clock tint, any CSS colour. Scoped to the clock, so nothing else recolours. */
  clockColor: string;
  /** True while an app window is in front. The clock, logo and widgets step aside for it. */
  windowOpen: boolean;
  activeAppId?: string | null;
  openAppIds?: string[];
  /** Home widgets, such as the update log and install prompt. Shown only on the home screen. */
  children?: ReactNode;
}

/** Date line for the glass clock, e.g. "Wednesday, November 11". Refreshes every 10 seconds. */
function useDateLine() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

/**
 * Home for the glass layout. A big glass clock and logo top-left and top-centre, a status bar top-right,
 * a collapsible widget panel bottom-left and a curved app dock bottom-right. Overlay only: pointer
 * events pass through except on the glass panels.
 */
export function GlassHome({
  tiles,
  onOpen,
  onHome,
  onSignOut,
  clock24,
  clockFont,
  clockColor,
  windowOpen,
  activeAppId = null,
  openAppIds = [],
  children,
}: GlassHomeProps) {
  const time = useClock(clock24);
  const date = useDateLine();
  const [widgetsOpen, setWidgetsOpen] = useState(true);
  const [dockOpen, setDockOpen] = useState(true);
  const font = (CLOCK_FONTS as readonly string[]).includes(clockFont) ? clockFont : "Sora";
  const clockStyle = { fontFamily: `"${font}", sans-serif`, "--clock-tint": clockColor } as CSSProperties;

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {!windowOpen && (
        <>
          <div className="glass-clock-theme absolute left-8 top-8 sm:left-14 sm:top-12" style={clockStyle}>
            <time className="glass-clock block text-6xl font-light tabular-nums sm:text-8xl">{time}</time>
            <div className="glass-clock glass-clock-date mt-2 text-lg sm:text-2xl">{date}</div>
            <div aria-hidden className="glass-clock-line mt-4 h-px w-64" />
          </div>
          <div className="absolute left-1/2 top-6 -translate-x-1/2 text-center">
            <h1 className="text-4xl sm:text-5xl">
              <GlassWordmark />
            </h1>
            <div className="mt-1 text-caption font-semibold tracking-[0.35em] text-muted-foreground uppercase">REBORN</div>
          </div>
        </>
      )}

      <div className="shell-glass pointer-events-auto absolute right-0 top-0 flex items-center gap-3 rounded-bl-[2rem] border-b border-l py-2.5 pl-7 pr-5 text-caption text-muted-foreground">
        {windowOpen && (
          <button type="button" onClick={onHome} className="rounded-full px-2.5 py-0.5 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            ⌂ Home
          </button>
        )}
        {windowOpen && <time className="tabular-nums text-foreground">{time}</time>}
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="rounded-full p-1 hover:bg-accent hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
        >
          <LogOut className="size-4" />
        </button>
      </div>

      {!windowOpen &&
        (widgetsOpen ? (
          <section
            aria-label="Widgets"
            className="shell-glass pointer-events-auto absolute bottom-0 left-0 flex max-h-[55vh] w-[min(420px,92vw)] flex-col overflow-hidden rounded-tr-[2rem] border-r border-t"
          >
            <div className="section-label flex items-center justify-between px-4 pt-3.5">
              Widgets
              <button
                type="button"
                aria-label="Hide widgets"
                aria-expanded={true}
                onClick={() => setWidgetsOpen(false)}
                className="rounded-md p-1 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="min-h-0 space-y-4 overflow-y-auto p-4">{children}</div>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => setWidgetsOpen(true)}
            aria-expanded={false}
            className="shell-glass pointer-events-auto absolute bottom-4 left-4 rounded-full border px-4 py-2 text-caption text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            ▤ Widgets
          </button>
        ))}

      {dockOpen ? (
        <nav
          aria-label="Apps"
          className="shell-glass pointer-events-auto absolute bottom-0 right-0 max-w-[96vw] rounded-tl-[2.5rem] border-l border-t pb-3 pl-7 pr-4 pt-2"
        >
          <div className="section-label mb-1 flex items-center justify-between gap-6 pl-2">
            <span>Apps</span>
            <button
              type="button"
              aria-label="Hide apps"
              aria-expanded={true}
              onClick={() => setDockOpen(false)}
              className="rounded-md p-1 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto p-1">
            {tiles.map((t) => {
              const isActive = activeAppId === t.id;
              const isOpen = openAppIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  title={t.title}
                  aria-label={t.title}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onOpen(t.id)}
                  className={`lift press relative grid size-10 shrink-0 place-items-center rounded-[14px] focus-visible:outline-2 focus-visible:outline-ring ${
                    isActive ? "ring-2 ring-foreground/50 ring-offset-2 ring-offset-transparent" : ""
                  }`}
                >
                  <AppTile appId={t.id} size="md">
                    {t.icon}
                  </AppTile>
                  {isOpen && <span aria-hidden className="absolute -bottom-1 size-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </nav>
      ) : (
        <button
          type="button"
          onClick={() => setDockOpen(true)}
          aria-expanded={false}
          className="shell-glass pointer-events-auto absolute bottom-4 right-4 rounded-full border px-4 py-2 text-caption text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          Apps
        </button>
      )}
    </div>
  );
}
