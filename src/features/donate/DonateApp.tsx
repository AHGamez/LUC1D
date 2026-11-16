import { useState } from "react";
import { Heart, Lock } from "lucide-react";
import type { AppProps } from "../../apps/types";
import { Button } from "../../components/ui/Button";
import { Input, Spinner } from "../../components/ui/kit";
import { apiCall, isStripeCheckoutUrl } from "../site/api";
import { DONATION_MAX_CENTS, DONATION_MIN_CENTS } from "./donation-rules";

const MIN_DOLLARS = DONATION_MIN_CENTS / 100;
const MAX_DOLLARS = DONATION_MAX_CENTS / 100;
const PRESETS = [1, 5, 10, 30];

type Banner = { tone: "warning" | "info"; text: string } | null;

/** Reads the publishable payments token only to decide what to tell the user. It is never a secret. */
function paymentsBanner(): { configured: boolean; banner: Banner } {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN?.trim();
  if (!token) {
    return {
      configured: false,
      banner: { tone: "warning", text: "Donations are not set up on this site yet." },
    };
  }
  if (token.startsWith("pk_test_")) {
    return { configured: true, banner: { tone: "info", text: "Test mode. No real money moves." } };
  }
  return { configured: true, banner: null };
}

export default function DonateApp({ session }: AppProps) {
  const [presetDollars, setPresetDollars] = useState(5);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { configured, banner } = paymentsBanner();

  const cents = custom.trim() ? Math.round(Number(custom) * 100) : presetDollars * 100;
  const valid = Number.isFinite(cents) && cents >= MIN_DOLLARS * 100 && cents <= MAX_DOLLARS * 100;

  async function donate() {
    setLoading(true);
    setError(null);
    // The signed-in token goes with the request so the server can tie the paid session to this account
    // when the donation is claimed on return.
    const result = await apiCall<{ url: string }>("/api/donations/checkout", "POST", {
      amountCents: cents,
      ...(session.user?.email ? { customerEmail: session.user.email } : {}),
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    if (typeof result.data.url !== "string" || !isStripeCheckoutUrl(result.data.url)) {
      setError("Checkout did not return a valid payment page.");
      setLoading(false);
      return;
    }
    window.location.assign(result.data.url);
  }

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-card text-card-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(70%_100%_at_50%_0%,color-mix(in_oklab,var(--app-donate,var(--primary))_22%,transparent),transparent)]"
      />
      {banner && (
        <div
          className={`px-4 py-2 text-center text-xs ${
            banner.tone === "warning" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-6 p-6">
        <div className="shell-glass flex flex-col gap-5 rounded-[18px] border p-5">
        <header className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--app-donate,var(--primary))_18%,transparent)] text-[var(--app-donate,var(--primary))] ring-1 ring-[color-mix(in_oklab,var(--app-donate,var(--primary))_35%,transparent)]">
            <Heart className="size-5" fill="currentColor" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Donate</p>
            <h1 className="mt-0.5 font-display text-xl font-bold tracking-tight">Support LUC1D reborn</h1>
            <p className="mt-1.5 text-sm leading-normal text-muted-foreground">
              LUC1D is free. Donations help pay for hosting so the site stays up. Give any amount from ${MIN_DOLLARS} to ${MAX_DOLLARS}.
            </p>
          </div>
        </header>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Amount</legend>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((dollars) => {
              const selected = !custom.trim() && presetDollars === dollars;
              return (
                <button
                  key={dollars}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setPresetDollars(dollars);
                    setCustom("");
                  }}
                  className={`rounded-[12px] border py-2.5 font-display text-sm font-semibold transition-[transform,background-color,border-color] motion-safe:active:scale-95 ${
                    selected
                      ? "border-[var(--app-donate,var(--primary))] bg-[color-mix(in_oklab,var(--app-donate,var(--primary))_16%,transparent)] text-[var(--app-donate,var(--primary))] shadow-[0_8px_20px_-10px_color-mix(in_oklab,var(--app-donate,var(--primary))_70%,transparent)]"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  ${dollars}
                </button>
              );
            })}
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Or enter a custom amount</span>
            <span className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground" aria-hidden>$</span>
              <Input
                type="number"
                inputMode="decimal"
                min={MIN_DOLLARS}
                max={MAX_DOLLARS}
                step="1"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={`${MIN_DOLLARS} to ${MAX_DOLLARS}`}
                aria-invalid={custom.trim() !== "" && !valid}
              />
            </span>
          </label>
          {custom.trim() !== "" && !valid && (
            <p className="text-xs text-destructive">Enter an amount between ${MIN_DOLLARS} and ${MAX_DOLLARS}.</p>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="rounded-[12px] bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          size="lg"
          className="w-full rounded-[12px] bg-[var(--app-donate,var(--primary))] font-display text-primary-foreground shadow-[0_14px_30px_-12px_color-mix(in_oklab,var(--app-donate,var(--primary))_75%,transparent)] hover:brightness-110"
          disabled={!valid || loading || !configured}
          onClick={() => void donate()}
        >
          {loading ? (
            <>
              <Spinner className="size-4" /> Starting checkout
            </>
          ) : (
            `Donate $${(cents / 100).toFixed(2)}`
          )}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" aria-hidden /> You will complete payment on Stripe's secure page.
        </p>
        </div>
      </div>
    </div>
  );
}
