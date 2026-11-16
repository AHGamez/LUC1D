import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { setDeviceMode, useDeviceMode, type DeviceMode } from "./useDeviceMode";

export interface DeviceEntryProps {
  /** Called after the user picks. Optional: the hook already holds the choice. */
  onChoose?: (mode: DeviceMode) => void;
}

/**
 * Full-screen "Mobile or computer?" prompt shown on every startup until the user picks.
 * Mount once near the root of the shell. Renders nothing after a choice this page load.
 */
export default function DeviceEntry({ onChoose }: DeviceEntryProps) {
  const { chosen } = useDeviceMode();
  if (chosen) return null;

  const pick = (mode: DeviceMode) => {
    setDeviceMode(mode);
    onChoose?.(mode);
  };

  return (
    <div className="fixed inset-0 z-[10000] grid place-items-center bg-background p-6 bg-[radial-gradient(60%_50%_at_50%_30%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]">
      <div role="dialog" aria-modal="true" aria-labelledby="device-entry-title" className="shell-glass w-full max-w-md space-y-8 rounded-[18px] border p-8 text-center">
        <h1 className="lucid-wordmark text-5xl text-foreground">LUC1D.</h1>
        <h2 id="device-entry-title" className="text-xl font-semibold text-foreground">
          Mobile or computer?
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-32 flex-col gap-4 rounded-[18px] border-border bg-secondary/40 text-base font-semibold transition-[transform,border-color,background-color] duration-200 hover:border-[var(--app-club,var(--primary))] hover:bg-[color-mix(in_oklab,var(--app-club,var(--primary))_12%,transparent)] motion-safe:hover:-translate-y-0.5" onClick={() => pick("mobile")}>
            <Smartphone className="size-8" aria-hidden="true" />
            Mobile
          </Button>
          <Button variant="outline" className="h-32 flex-col gap-4 rounded-[18px] border-border bg-secondary/40 text-base font-semibold transition-[transform,border-color,background-color] duration-200 hover:border-[var(--app-club,var(--primary))] hover:bg-[color-mix(in_oklab,var(--app-club,var(--primary))_12%,transparent)] motion-safe:hover:-translate-y-0.5" onClick={() => pick("computer")}>
            <Monitor className="size-8" aria-hidden="true" />
            Computer
          </Button>
        </div>
        <p className="text-xs leading-normal text-muted-foreground">Phones get lighter effects. You'll be asked again next time you open LUC1D.</p>
      </div>
    </div>
  );
}
