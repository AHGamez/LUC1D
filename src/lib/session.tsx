import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session as SbSession, User as SbUser } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { devAccount } from "./devAccount";

export interface SessionUser {
  id: string;
  email: string | null;
  /** Display name from user metadata, falling back to the email prefix. */
  displayName: string;
}

export interface SessionState {
  user: SessionUser | null;
  /** True until the first session check finishes. Wait for it before showing signed-in UI. */
  loading: boolean;
  /** True after the user opens a password-reset link. The app should ask for a new password. */
  recovery: boolean;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signInWithGoogle(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

function toSessionUser(u: SbUser): SessionUser {
  const meta = u.user_metadata as { display_name?: unknown; full_name?: unknown } | undefined;
  const name =
    (typeof meta?.display_name === "string" && meta.display_name) ||
    (typeof meta?.full_name === "string" && meta.full_name) ||
    u.email?.split("@")[0] ||
    "Player";
  return { id: u.id, email: u.email ?? null, displayName: name };
}

/** Provides the signed-in user and auth actions to the whole app. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    let alive = true;
    const apply = (session: SbSession | null) => {
      if (!alive) return;
      setUser(session?.user ? toSessionUser(session.user) : null);
      setLoading(false);
    };
    supabase.auth.getSession().then(async ({ data }) => {
      // Dev test account: sign in once if nobody is signed in. A failure falls back to the sign-in screen.
      if (!data.session && devAccount && !attempted.current) {
        attempted.current = true;
        const { error } = await supabase.auth.signInWithPassword(devAccount);
        if (!error) return; // success: the auth listener below applies the new session
        console.warn("Dev test account sign-in failed:", error.message);
      }
      apply(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
      apply(session);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setRecovery(false);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<SessionState>(
    () => ({ user, loading, recovery, signInWithPassword, signUp, signInWithGoogle, sendPasswordReset, updatePassword, signOut }),
    [user, loading, recovery, signInWithPassword, signUp, signInWithGoogle, sendPasswordReset, updatePassword, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
