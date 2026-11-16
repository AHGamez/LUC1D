import { Film } from "lucide-react";
import type { AppProps } from "../../apps/types";
import { VideoEditor } from "../../components/media/VideoEditor";

/** Video Maker: edit a clip in the browser and download the result. Nothing is uploaded. */
export default function VideoMakerApp(_props: AppProps) {
  return (
    <div className="relative h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <header className="shell-glass flex items-center gap-3 rounded-[18px] border p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklab,var(--app-video,var(--primary))_18%,transparent)] text-[var(--app-video,var(--primary))] ring-1 ring-[color-mix(in_oklab,var(--app-video,var(--primary))_35%,transparent)]">
            <Film className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight">
            Video <span className="text-[var(--app-video,var(--primary))]">Maker</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Trim, speed up or slow down, filter, add text and mute. Editing happens on your device.
          </p>
          </div>
        </header>
        <VideoEditor doneLabel="Download" />
      </div>
    </div>
  );
}
