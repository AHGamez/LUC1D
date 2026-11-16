import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "../../components/ui/Button";

/** The non-standard event Chromium fires when the site can be installed as an app. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Download app" button for the PWA install prompt. Hidden once the app runs standalone or is installed.
 * Where the browser gives no prompt (e.g. iPhone), it shows the manual steps instead.
 */
export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (!promptEvent) {
      setShowHelp((open) => !open);
      return;
    }
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  const inFrame = window.self !== window.top;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={() => void handleClick()}>
        <Download aria-hidden /> Download app
      </Button>
      {showHelp && (
        <p role="status" className="surface-control max-w-xs rounded-[var(--radius-control)] px-3 py-2 text-center text-caption text-muted-foreground">
          {inFrame
            ? "Open the published site in its own tab to install."
            : "Use your browser menu: “Install app” (Chrome or Edge), or Share, then “Add to Home Screen” (iPhone)."}
        </p>
      )}
    </div>
  );
}
