import { Home, LogOut } from "lucide-react";
import { AppTile } from "../components/ui/AppTile";
import { Button } from "../components/ui/Button";
import { APPS } from "../apps/registry";
import type { AppDefinition } from "../apps/types";
import { DESKTOP_APP_IDS } from "../features/desktop-grid/desktop-layout";
import { GlassLogoChip } from "./Logo";

interface SidebarProps {
  onHome: () => void;
  onOpen: (appId: string) => void;
  onSignOut: () => void;
  /** App id of the window in front, if any. Marked with aria-current. */
  activeAppId?: string | null;
  /** App ids with an open window. Each gets a small dot, so you can see what is running. */
  openAppIds?: string[];
  /** Extra shortcuts that are not docked all the time, such as the Turkey Hunt while a hunt is live. */
  extraApps?: AppDefinition[];
  /** "Apps on desktop" setting. When on, DESKTOP_APP_IDS are left out of the rail (they live on the grid). */
  gridApps?: boolean;
}

/**
 * Left icon rail. Every app with `dock: true` gets a shortcut, so adding an app to the registry adds it here.
 * Apps that sit on the desktop grid (DESKTOP_APP_IDS) are left out, as the reference desktop does.
 */
export function Sidebar({ onHome, onOpen, onSignOut, activeAppId = null, openAppIds = [], extraApps = [], gridApps = true }: SidebarProps) {
  const onGrid = gridApps ? (DESKTOP_APP_IDS as readonly string[]) : [];
  const docked = [...APPS.filter((a) => a.dock && !onGrid.includes(a.id)), ...extraApps];
  const homeActive = activeAppId === null;

  return (
    <nav aria-label="Apps" className="shell-glass shell-rounded z-20 flex w-[58px] flex-col items-center gap-2 border py-3.5">
      <GlassLogoChip className="mb-2 size-10" />
      <Button
        variant="ghost"
        size="icon"
        title="Home"
        aria-label="Home"
        aria-current={homeActive ? "page" : undefined}
        onClick={onHome}
        className={`lift size-10 rounded-[var(--radius-control)] ${homeActive ? "surface-tab-selected text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Home />
      </Button>
      <div aria-hidden className="my-0.5 h-px w-6 bg-border" />
      {docked.map((app) => {
        const isActive = activeAppId === app.id;
        const isOpen = openAppIds.includes(app.id);
        return (
          <button
            key={app.id}
            type="button"
            title={app.title}
            aria-label={app.title}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onOpen(app.id)}
            className={`lift press relative grid size-10 shrink-0 place-items-center rounded-[14px] focus-visible:outline-2 focus-visible:outline-ring ${
              isActive ? "ring-2 ring-foreground/50 ring-offset-2 ring-offset-transparent" : ""
            }`}
          >
            <AppTile appId={app.id} size="md">
              {app.icon}
            </AppTile>
            {isOpen && <span aria-hidden className="absolute -bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />}
          </button>
        );
      })}
      <div className="flex-1" />
      <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={onSignOut} className="size-10 rounded-[var(--radius-control)] text-muted-foreground hover:text-destructive">
        <LogOut />
      </Button>
    </nav>
  );
}
