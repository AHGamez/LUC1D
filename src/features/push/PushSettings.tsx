import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { VAPID_PUBLIC_KEY } from "./pushConfig";

export type PushState = "unsupported" | "off" | "on" | "busy";

const SW_PATH = "/push-sw.js";

/** Decodes a URL-safe base64 VAPID key into the bytes pushManager.subscribe expects. */
function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Push alert state for this browser. `enable` asks permission, subscribes and saves the subscription
 * to push_subscriptions (RLS limits each row to the signed-in user). `disable` removes both.
 */
export function usePushStatus() {
  const [state, setState] = useState<PushState>("off");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) {
      setState("unsupported");
      return;
    }
    let alive = true;
    navigator.serviceWorker
      .getRegistration(SW_PATH)
      .then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        if (alive) setState(sub ? "on" : "off");
      })
      .catch(() => alive && setState("off"));
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setError(null);
    setState("busy");
    let created: PushSubscription | null = null;
    try {
      if (!pushSupported()) throw new Error("This browser can't receive push alerts.");
      if ((await Notification.requestPermission()) !== "granted") {
        throw new Error("Notifications are blocked. Allow them in your browser settings, then try again.");
      }
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in first.");

      const reg = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (created = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
      const json = sub.toJSON();
      const { error: dbErr } = await supabase.from("push_subscriptions").upsert({
        endpoint: sub.endpoint,
        user_id: u.user.id,
        p256dh: json.keys?.["p256dh"] ?? "",
        auth: json.keys?.["auth"] ?? "",
      });
      if (dbErr) throw dbErr;
      setState("on");
    } catch (e) {
      // Do not keep a browser subscription the account does not know about.
      if (created) await created.unsubscribe().catch(() => undefined);
      setError(e instanceof Error ? e.message : "Could not turn on alerts.");
      setState("off");
    }
  }, []);

  const disable = useCallback(async () => {
    setError(null);
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const { error: dbErr } = await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        if (dbErr) throw dbErr;
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn off alerts.");
      setState("on");
    }
  }, []);

  return { state, error, enable, disable };
}

/** Settings card for @everyone alerts. Mount inside Settings. Renders nothing extra when unsupported. */
export default function PushSettings() {
  const { state, error, enable, disable } = usePushStatus();
  const on = state === "on";

  return (
    <section aria-labelledby="push-settings-title" className="shell-glass shell-rounded flex flex-col gap-3 border p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklab,var(--app-club,var(--primary))_18%,transparent)] text-[var(--app-club,var(--primary))] ring-1 ring-[color-mix(in_oklab,var(--app-club,var(--primary))_35%,transparent)]" aria-hidden="true">
          {on ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="push-settings-title" className="font-display font-semibold tracking-tight text-foreground">
            @everyone alerts
          </h3>
          <p className="text-sm text-muted-foreground">
            {state === "unsupported"
              ? "This browser can't receive push alerts."
              : on
                ? "On. You'll get staff @everyone alerts even when LUC1D is closed."
                : "Get staff @everyone alerts even when LUC1D is closed."}
          </p>
        </div>
        {state !== "unsupported" && (
          <Button
            variant={on ? "outline" : "default"}
            size="sm"
            disabled={state === "busy"}
            aria-pressed={on}
            onClick={on ? disable : enable}
          >
            {state === "busy" ? "Working..." : on ? "Turn off" : "Turn on"}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
