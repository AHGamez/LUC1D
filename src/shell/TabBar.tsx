import type { KeyboardEvent } from "react";
import { Cloud, X } from "lucide-react";
import type { WindowItem } from "../apps/types";

interface TabBarProps {
  wins: WindowItem[];
  activeId: string | null;
  onHome: () => void;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
}

const tabBase = "flex h-8 shrink-0 items-center gap-2 rounded-t-[var(--radius-control)] border border-b-0 text-caption font-medium transition-colors duration-200";
const selectedTab = "surface-tab-selected border-[var(--shell-glass-border)]";
const idleTab = "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground";

/** Browser-style tab strip. Home is always first; each open window gets a closable tab. Arrow keys are left to the page. */
export function TabBar({ wins, activeId, onHome, onFocus, onClose }: TabBarProps) {
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>, focus: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      focus();
    }
  };

  return (
    <div role="tablist" aria-label="Open tabs" className="relative flex h-10 items-end gap-1 overflow-x-auto px-2 pt-1">
      <button
        role="tab"
        aria-selected={activeId === null}
        onClick={onHome}
        className={`${tabBase} w-32 px-3 ${activeId === null ? selectedTab : idleTab}`}
      >
        <Cloud aria-hidden className="size-3.5 text-primary" /> Home
      </button>
      {wins.map((w) => {
        const selected = activeId === w.id;
        return (
          <div
            key={w.id}
            role="tab"
            tabIndex={0}
            aria-selected={selected}
            onClick={() => onFocus(w.id)}
            onKeyDown={(e) => onTabKey(e, () => onFocus(w.id))}
            className={`${tabBase} group w-44 cursor-pointer pl-3 pr-1 ${selected ? selectedTab : idleTab}`}
          >
            <span aria-hidden>{w.icon}</span>
            <span className="min-w-0 flex-1 truncate">{w.title}</span>
            <button
              aria-label={`Close ${w.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(w.id);
              }}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
      <span className="section-label ml-auto shrink-0 self-center pr-3">LUC1D reborn</span>
    </div>
  );
}
