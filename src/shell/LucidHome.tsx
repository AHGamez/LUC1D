import type { ReactNode } from "react";
import { APPS, findApp } from "../apps/registry";
import { AppTile } from "../components/ui/AppTile";
import { DesktopIcons } from "../features/desktop-grid/DesktopIcons";
import { DESKTOP_APP_IDS, HOME_ZONES } from "../features/desktop-grid/desktop-layout";
import { GlassWordmark } from "./Logo";

const renderDeskIcon = (id: string) => (
  <AppTile appId={id} size="lg">
    {findApp(id)?.icon}
  </AppTile>
);

/**
 * Home screen of the LUC1D layout: glass wordmark, tagline, the desktop shortcut grid, the remaining docked apps,
 * and any extra home content (`children`, such as the update log and install prompt) below them.
 *
 * `gridApps` (the "Apps on desktop" setting): when on, DESKTOP_APP_IDS live on the grid and leave the app bar.
 * When off, every docked app is in the app bar and the grid is hidden.
 */
export function LucidHome({ onOpen, children, gridApps = true }: { onOpen: (appId: string) => void; children?: ReactNode; gridApps?: boolean }) {
  const onGrid = gridApps ? (DESKTOP_APP_IDS as readonly string[]) : [];
  const deskApps = onGrid.flatMap((id) => {
    const app = findApp(id);
    return app ? [{ id: app.id, name: app.title }] : [];
  });
  const barApps = APPS.filter((a) => a.dock && !onGrid.includes(a.id));

  return (
    <div className="relative h-full">
      <div className="absolute inset-0 flex flex-col items-center overflow-y-auto px-4 pb-20 pt-[clamp(48px,14vh,160px)]">
        <h1 className="text-center text-6xl sm:text-7xl">
          <GlassWordmark />
        </h1>
        <div className="mt-3 text-caption font-semibold tracking-[0.35em] text-muted-foreground uppercase">REBORN</div>
        <nav aria-label="Home apps" className="mt-10 flex max-w-2xl flex-wrap justify-center gap-3">
          {barApps.map((app) => (
            <button
              key={app.id}
              type="button"
              title={app.title}
              aria-label={app.title}
              onClick={() => onOpen(app.id)}
              className="group lift press flex w-20 flex-col items-center gap-2.5 rounded-[var(--radius-card)] p-2 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <AppTile appId={app.id} size="lg">
                {app.icon}
              </AppTile>
              <span className="w-full truncate text-center text-caption font-medium text-muted-foreground group-hover:text-foreground">{app.title}</span>
            </button>
          ))}
        </nav>
        {children && <div className="mt-10 w-full max-w-2xl space-y-4">{children}</div>}
      </div>
      {/* Sits above the scrolling content but below the windows, which mount after it. */}
      {gridApps && <DesktopIcons apps={deskApps} zones={HOME_ZONES} onOpen={onOpen} renderIcon={renderDeskIcon} />}
    </div>
  );
}
