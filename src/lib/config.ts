/**
 * Build-time switches. Set in .env.local.
 *
 * VITE_SKIP_LOGIN=true opens the desktop without the sign-in screen. Apps then run
 * signed out, so anything that needs an account shows its signed-out state.
 * The sign-in code stays in place; remove the flag to bring the login screen back.
 */
export const skipLogin = import.meta.env.VITE_SKIP_LOGIN === "true";
