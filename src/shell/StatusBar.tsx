import { Cloud, ChevronRight, Home } from "lucide-react";
import { useClock } from "../hooks/useClock";

interface StatusBarProps {
  activeTitle: string | null;
  clock24: boolean;
}

/** Address-bar style strip under the tabs: breadcrumb on the left, clock and connection dot on the right. */
export function StatusBar({ activeTitle, clock24 }: StatusBarProps) {
  const time = useClock(clock24);
  const path = activeTitle ? activeTitle.toLowerCase().replace(/\s+/g, "-") : "home";

  return (
    <div className="flex h-10 items-center gap-2.5 border-t border-[var(--shell-glass-border)] px-4 text-caption text-muted-foreground">
      <Home aria-hidden className="size-3.5" />
      <ChevronRight aria-hidden className="size-3" />
      <span className="surface-control flex min-w-0 items-center gap-1.5 truncate rounded-full px-2.5 py-0.5">
        <Cloud aria-hidden className="size-3 text-primary" /> <span className="truncate">luc1d://{path}</span>
      </span>
      <span className="ml-auto flex items-center gap-3">
        <time className="tabular-nums text-foreground">{time}</time>
        <span className="surface-control flex items-center gap-1.5 rounded-full px-2 py-0.5">
          <span aria-hidden className="size-1.5 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
          <span className="hidden sm:inline">Connected</span>
        </span>
      </span>
    </div>
  );
}
