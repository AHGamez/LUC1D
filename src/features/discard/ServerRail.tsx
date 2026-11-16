import { MessageCircle, Plus, Search, Shield } from "lucide-react";
import { useDiscard } from "./DiscardContext";
import type { Server } from "./lib/discard-types";

export type Mode = "server" | "dm" | "find" | "admin";

/** Far-left rail: direct messages, joined servers, create, find, admin and the Club Bird shortcut. */
export function ServerRail({
  servers,
  serverId,
  mode,
  onMode,
  onSelectServer,
  onCreateServer,
  onClubBird,
}: {
  servers: Server[];
  serverId: string;
  mode: Mode;
  onMode: (mode: Mode) => void;
  onSelectServer: (id: string) => void;
  onCreateServer: () => void;
  onClubBird: () => void;
}) {
  const { siteMod } = useDiscard();

  return (
    <nav aria-label="Servers" className="d-surface flex w-[4.5rem] shrink-0 flex-col items-center gap-2.5 overflow-y-auto border-r border-[var(--d-line)] py-3">
      <button type="button" title="Direct messages" aria-label="Direct messages" aria-pressed={mode === "dm"} onClick={() => onMode("dm")} className="d-rail-item">
        <span className="d-rail-pill" aria-hidden="true" />
        <MessageCircle className="size-5" />
      </button>
      <div className="my-0.5 h-px w-7 rounded-full bg-[var(--d-line-strong)]" aria-hidden="true" />
      {servers.map((s) => {
        const active = mode === "server" && s.id === serverId;
        return (
          <button key={s.id} type="button" title={s.name} aria-label={s.name} aria-pressed={active} onClick={() => onSelectServer(s.id)} className="d-rail-item text-lg">
            <span className="d-rail-pill" aria-hidden="true" />
            {s.icon}
          </button>
        );
      })}
      <button type="button" title="Create server" aria-label="Create server" onClick={onCreateServer} className="d-rail-item d-rail-add">
        <Plus className="size-5" />
      </button>
      {siteMod && (
        <button type="button" title="Admin menu" aria-label="Admin menu" aria-pressed={mode === "admin"} onClick={() => onMode("admin")} className="d-rail-item">
          <span className="d-rail-pill" aria-hidden="true" />
          <Shield className="size-5" />
        </button>
      )}
      <button
        type="button"
        title="Club Bird (beta)"
        aria-label="Club Bird (beta)"
        onClick={onClubBird}
        className="flex h-6 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--d-accent-line)] bg-[var(--d-accent-soft)] text-[10px] font-black tracking-wider text-[var(--dc-accent)] transition-colors duration-150 hover:bg-[var(--dc-accent)] hover:text-[var(--d-on-accent)]"
      >
        BETA
      </button>
      <button type="button" title="Find or join a server" aria-label="Find or join a server" aria-pressed={mode === "find"} onClick={() => onMode("find")} className="d-rail-item">
        <span className="d-rail-pill" aria-hidden="true" />
        <Search className="size-5" />
      </button>
    </nav>
  );
}
