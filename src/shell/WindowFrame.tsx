import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "../components/ui/Button";

interface WindowFrameProps {
  title: string;
  icon: string;
  onClose: () => void;
  /** PS5 layout zooms the window open; LUC1D and glass fade it in. */
  zoomOpen?: boolean;
  children: ReactNode;
}

/** An app window: an 18px glass window with a translucent titlebar, then a scrolling body. */
export function WindowFrame({ title, icon, onClose, zoomOpen, children }: WindowFrameProps) {
  return (
    <div
      className={`app-window shell-window window-shadow absolute inset-0 flex flex-col overflow-hidden ${zoomOpen ? "ps5-open" : "window-fade"}`}
    >
      <div className="app-titlebar flex min-h-11 select-none items-center justify-between gap-2 px-3.5 py-2 text-body">
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="text-base leading-none">{icon}</span>
          <span className="truncate font-semibold tracking-tight">{title}</span>
        </span>
        <Button variant="ghost" size="icon" title="Close" aria-label="Close" onClick={onClose} className="size-8 rounded-full hover:bg-destructive hover:text-destructive-foreground">
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-card">{children}</div>
    </div>
  );
}
