/**
 * Development-only test account. When VITE_DEV_LOGIN_EMAIL and VITE_DEV_LOGIN_PASSWORD are set in
 * .env.local, `npm run dev` signs in with them automatically, so Discord and the other account-based
 * apps work without typing credentials. The account must exist in Supabase.
 *
 * Only read in development (import.meta.env.DEV). Production builds never include these values.
 */
export const devAccount: { email: string; password: string } | null = (() => {
  if (!import.meta.env.DEV) return null;
  const email = import.meta.env.VITE_DEV_LOGIN_EMAIL?.trim();
  const password = import.meta.env.VITE_DEV_LOGIN_PASSWORD;
  return email && password ? { email, password } : null;
})();
