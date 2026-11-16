import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { createDemoSupabase } from "./demoSupabase";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Demo mode (VITE_DEMO_MODE=true): no Supabase project. Two blank test accounts, and every data call is
 * answered with empty results. See src/lib/demoSupabase.ts.
 */
export const demoMode = import.meta.env.VITE_DEMO_MODE === "true";

/** True when the app can run: a Supabase URL and key, or demo mode. main.tsx shows a setup screen otherwise. */
export const supabaseConfigured = demoMode || Boolean(url && key);

/**
 * The one Supabase client for the app. Typed with the generated Database type, so table and
 * RPC names are checked at compile time. Only the publishable key is used in the browser.
 */
export const supabase: SupabaseClient<Database> = demoMode
  ? (createDemoSupabase() as unknown as SupabaseClient<Database>)
  : createClient<Database>(url || "http://localhost.invalid", key || "missing-key", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
