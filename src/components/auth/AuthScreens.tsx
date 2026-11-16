import { useState, type FormEvent, type ReactNode } from "react";
import { Cloud } from "lucide-react";
import { Button } from "../ui/Button";
import { AppTile } from "../ui/AppTile";
import { Input, Label } from "../ui/kit";
import { useSession } from "../../lib/session";
import { demoMode } from "../../lib/supabase";
import { DEMO_ACCOUNTS } from "../../lib/demoSupabase";

function Card({ title, subtitle, children, onSubmit }: { title: string; subtitle: string; children: ReactNode; onSubmit: (e: FormEvent) => void }) {
  return (
    <div className="aurora-backdrop flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={onSubmit} className="shell-glass-strong rise-in w-full max-w-sm space-y-4 rounded-[var(--radius-card)] border p-6 shadow-[var(--shadow-window)]">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <AppTile tint="var(--app-stem)" size="lg">
            <Cloud aria-hidden />
          </AppTile>
          <h1 className="lucid-wordmark mt-1 text-3xl">{title}</h1>
          <p className="text-body text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </form>
    </div>
  );
}

function Notice({ kind, text }: { kind: "error" | "info"; text: string }) {
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-[var(--radius-control)] bg-background/40 px-3 py-2 text-caption ${kind === "error" ? "text-destructive" : "text-success"}`}>
      {text}
    </p>
  );
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Sign in, create an account, or request a password reset. */
export function AuthScreen() {
  const session = useSession();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const run = async (task: () => Promise<void>, ok?: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await task();
      if (ok) setNotice({ kind: "info", text: ok });
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err, "Something went wrong.") });
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const mail = email.trim();
    if (mode === "signin") return run(() => session.signInWithPassword(mail, password));
    if (mode === "forgot") return run(() => session.sendPasswordReset(mail), "If that account exists, a reset link is on its way.");
    return run(async () => {
      const { needsConfirmation } = await session.signUp(mail, password);
      setNotice({
        kind: "info",
        text: needsConfirmation ? "Check your email for a confirmation link, then sign in." : "Account created. Welcome to LUC1D.",
      });
    });
  };

  const title = mode === "signin" ? "Sign in to continue" : mode === "signup" ? "Create an account" : "Reset your password";

  return (
    <Card title="LUC1D" subtitle={title} onSubmit={submit}>
      <Label>
        Email
        <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
      </Label>
      {mode !== "forgot" && (
        <Label>
          Password
          <Input
            type="password"
            required
            minLength={mode === "signup" ? 6 : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
          />
        </Label>
      )}
      {notice && <Notice kind={notice.kind} text={notice.text} />}
      <Button type="submit" disabled={busy} className="w-full">
        {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
      </Button>
      {mode !== "forgot" && (
        <Button type="button" variant="outline" disabled={busy} onClick={() => run(() => session.signInWithGoogle())} className="w-full">
          Continue with Google
        </Button>
      )}
      {demoMode && mode === "signin" && (
        <div className="space-y-2 rounded-[var(--radius-control)] border border-dashed p-3">
          <p className="text-caption text-muted-foreground">Demo mode: pick a blank test account.</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button key={a.id} type="button" variant="outline" disabled={busy} onClick={() => run(() => session.signInWithPassword(a.email, "demo"))}>
                {a.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-between text-caption text-muted-foreground">
        <button type="button" className="rounded-full px-2 py-1 hover:bg-accent hover:text-foreground" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setNotice(null); }}>
          {mode === "signup" ? "Have an account? Sign in" : "New here? Create account"}
        </button>
        <button type="button" className="rounded-full px-2 py-1 hover:bg-accent hover:text-foreground" onClick={() => { setMode(mode === "forgot" ? "signin" : "forgot"); setNotice(null); }}>
          {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
        </button>
      </div>
    </Card>
  );
}

/** Shown after a password-reset link is opened. */
export function RecoveryScreen() {
  const session = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await session.updatePassword(password);
    } catch (err) {
      setNotice({ kind: "error", text: errorText(err, "Could not update the password.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="LUC1D" subtitle="Choose a new password" onSubmit={submit}>
      <Label>
        New password
        <Input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
      </Label>
      {notice && <Notice kind={notice.kind} text={notice.text} />}
      <Button type="submit" disabled={busy} className="w-full">
        Save password
      </Button>
    </Card>
  );
}

/** Shown instead of the app when the Supabase URL or key is missing from the build. */
export function SetupScreen() {
  return (
    <div className="aurora-backdrop flex min-h-dvh items-center justify-center p-4">
      <div className="shell-glass-strong max-w-md space-y-3 rounded-[var(--radius-card)] border p-6 text-body">
        <h1 className="lucid-wordmark text-2xl">Setup needed</h1>
        <p className="text-muted-foreground">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code>, then restart the dev server.
          See <code>.env.example</code> and <code>BACKENDS.md</code>.
        </p>
      </div>
    </div>
  );
}
