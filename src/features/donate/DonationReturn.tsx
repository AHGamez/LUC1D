import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { apiCall, clearReturnParams } from "../site/api";
import { DONOR_REWARD_CENTS, DONOR_TAG } from "./donation-rules";

type Notice = { tone: "ok" | "error"; text: string };

/**
 * Handles the return from the donation checkout (?donation=success&session_id=... or ?donation=cancelled).
 * The claim is recorded server-side (POST /api/donations/claim): the server checks the paid session and its
 * owner, records it once, and grants the donor tag and reward. This component only shows the result.
 * Mount once inside the signed-in shell.
 */
export function DonationReturn() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("donation");
    if (!flag) return;
    const sessionId = params.get("session_id");

    if (flag === "cancelled") {
      clearReturnParams(["donation"]);
      setNotice({ tone: "error", text: "Donation cancelled. Nothing was charged." });
      return;
    }
    if (flag !== "success") {
      clearReturnParams(["donation", "session_id"]);
      return;
    }
    if (!sessionId) {
      clearReturnParams(["donation"]);
      setNotice({ tone: "error", text: "We could not find your donation. Contact staff with your receipt." });
      return;
    }

    let alive = true;
    void apiCall<{ ok: true; fresh: boolean }>("/api/donations/claim", "POST", { sessionId }).then((result) => {
      clearReturnParams(["donation", "session_id"]);
      if (!alive) return;
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error });
      } else if (result.data.fresh) {
        setNotice({
          tone: "ok",
          text: `Thank you! You got the ${DONOR_TAG} chat tag and $${DONOR_REWARD_CENTS / 100} Discard money.`,
        });
      } else {
        setNotice({ tone: "ok", text: "Thank you! This donation was already counted." });
      }
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
