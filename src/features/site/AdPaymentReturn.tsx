import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { apiCall, clearReturnParams } from "./api";

type Notice = { tone: "ok" | "error"; text: string };

/**
 * Handles the return from an ad card checkout (?ad=success&session_id=... or ?ad=cancelled). On success
 * the server records the slot; this shows the result. Mount once inside the signed-in shell. Params are
 * cleared only after the claim finishes, so a repeated effect run just claims the same session again
 * (the server treats that as already done).
 */
export function AdPaymentReturn() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("ad");
    if (!flag) return;
    const sessionId = params.get("session_id");

    if (flag === "cancelled") {
      clearReturnParams(["ad"]);
      setNotice({ tone: "error", text: "Ad checkout cancelled. Nothing was charged." });
      return;
    }
    if (flag !== "success" || !sessionId) {
      clearReturnParams(["ad", "session_id"]);
      return;
    }

    let alive = true;
    void apiCall<{ ok: true; fresh: boolean }>("/api/ads/claim", "POST", { sessionId }).then((result) => {
      clearReturnParams(["ad", "session_id"]);
      if (!alive) return;
      setNotice(
        result.ok
          ? { tone: "ok", text: "Paid. Your ad is live on the Advertise board." }
          : { tone: "error", text: result.error },
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!notice) return null;

  return (
    <div
      role="status"
      className="shell-glass fixed bottom-6 left-1/2 z-[9997] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-[var(--radius-card)] border px-4 py-3 text-body text-foreground shadow-[var(--shadow-window)]"
    >
      <span className={notice.tone === "ok" ? "text-success" : "text-destructive"}>{notice.text}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setNotice(null)}
        className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
