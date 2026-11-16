/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (anon) key. Safe in the browser. Never put a service-role key in a VITE_ variable. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Stripe publishable key (pk_test_… or pk_live_…), used to show payment UI. */
  readonly VITE_PAYMENTS_CLIENT_TOKEN?: string;
  /** "true" opens the desktop without the sign-in screen (see src/lib/config.ts). */
  readonly VITE_SKIP_LOGIN?: string;
  /** "true": run with no Supabase project, using blank demo accounts (see src/lib/demoSupabase.ts). */
  readonly VITE_DEMO_MODE?: string;
  /** Development only: test account signed in automatically (see src/lib/devAccount.ts). */
  readonly VITE_DEV_LOGIN_EMAIL?: string;
  readonly VITE_DEV_LOGIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
