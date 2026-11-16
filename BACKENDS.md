# Backends

What the app needs, what each part is used for, and where the code lives.

## 1. Supabase (required)

The main backend: accounts, the database, file storage, realtime, and scheduled jobs.

| Piece | Used for | Where it is defined |
| --- | --- | --- |
| Auth | Email and password, password reset, Google sign-in | `src/lib/session.tsx` |
| Postgres tables | Discard (servers, channels, messages, DMs, friends, polls, moderation, push), TikiTaki, Club Bird (wallets, birds, owned items, trades, pass), Larp Flex battles, music playlists, longform videos, installed games, Turkey Hunt (wallets, hunts, targets), Lublox (games, avatars), push subscriptions | `drizzle/migrations/` (0000–0048) |
| Row-level security | Per-user access. Verified chat tags are read-only. Lublox games are writable only by staff | `drizzle/migrations/` |
| Functions (RPC) | Purchases, equips, trades, pass claims, Larp joins, moderation and rank rules, invite codes, Turkey hits and buys, Lublox staff check. Money, prices and ranks are set only here | `drizzle/migrations/`, called from `src/features/*` |
| Storage buckets | `discard-avatars`, `discard-chat-images`, `tikitaki-videos`, `longform`, `music`, `larp-flex`. The migrations add the access policies but do not create the buckets | policies in `drizzle/migrations/` |
| Realtime | Presence and broadcast for chat, calls, Club Bird, Lublox multiplayer and Larp Flex. Database changes for live lists | `src/features/*` |
| `pg_cron` | Extension is enabled by a migration. Schedule any jobs in the Supabase dashboard | `drizzle/migrations/0011_enable_pg_cron.sql` |

Setup: create the six storage buckets, run the migrations in order (0000 to 0048), then set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Enable the Google provider under
Authentication if you want Google sign-in, and add your site URL to the redirect allow-list.

## 2. Anthropic (optional: Larp Flex judge)

`server/handlers/larpJudge.ts`, called at `POST /api/larp/judge`. It calls the Anthropic Messages API
and forces a tool call so the verdict is structured.

- `ANTHROPIC_API_KEY` is required for judging. The old OpenAI variable is no longer read.
- `LARP_JUDGE_MODEL` is optional. The default is `claude-haiku-5-5`. An old value such as
  `openai/gpt-6-astra` will fail.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` let the handler verify the caller and write the verdict.
  The service-role key is secret: never put it in a `VITE_` variable.

The judge handler has not been run against the live API yet. Check the key and model first.

## 3. Web Push (optional: notifications)

`server/handlers/push.ts`, called at `POST /api/push/everyone` (staff only, checked in the handler).

- The public key is in `src/features/push/pushConfig.ts`. The matching private key must be set on the
  server as `VAPID_PRIVATE_KEY`. Without it, sending returns 503.
- `VAPID_SUBJECT` is a `mailto:` or `https:` contact for the push service.
- `public/push-sw.js` is the service worker. It must be served from the site root.
- Subscriptions are stored in `push_subscriptions` (migration 0043).

## 4. Account deletion (optional: admin)

`server/handlers/accountAdmin.ts`, called at `POST /api/account/delete`. It checks the caller's rank in
the database and fails closed. It needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. There is no
button for it in the UI yet; the route is ready.

## 5. Stripe (optional: donations)

`server/donations.ts` and `server/index.ts`.

- `STRIPE_SECRET_KEY` creates hosted Checkout sessions. Without it, `/api/donations/checkout` returns 503.
- `STRIPE_WEBHOOK_SECRET` verifies `/api/stripe/webhook`. The webhook logs `checkout.session.completed`
  events. There is no donations table, so nothing is stored.
- `PUBLIC_SITE_URL` is the origin Checkout returns to in production.
- `VITE_PAYMENTS_CLIENT_TOKEN` (publishable) only controls whether the Donate button is enabled.

## 6. Hosting

- The web app is a static Vite build (`npm run build`, output in `dist/`).
- The API (`npm start`) is a long-running Node process. Host it anywhere that runs Node 20.12 or newer.
  Put it behind the same domain as the site, or set `ALLOWED_ORIGIN` for cross-origin calls.

## Environment variables

| Name | Where | Secret | Used by |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | no | Supabase client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser | no (public key) | Supabase client |
| `VITE_SKIP_LOGIN` | browser | no | Opens the desktop without sign-in (development) |
| `VITE_PAYMENTS_CLIENT_TOKEN` | browser | no | Donate button state |
| `SUPABASE_URL` | server | no | Larp judge, account deletion, push |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **yes** | Larp judge, account deletion, push |
| `ANTHROPIC_API_KEY` | server | **yes** | Larp judge |
| `LARP_JUDGE_MODEL` | server | no | Larp judge (default `claude-haiku-5-5`) |
| `VAPID_PRIVATE_KEY` | server | **yes** | Web Push |
| `VAPID_SUBJECT` | server | no | Web Push |
| `STRIPE_SECRET_KEY` | server | **yes** | Donations |
| `STRIPE_WEBHOOK_SECRET` | server | **yes** | Stripe webhook |
| `PUBLIC_SITE_URL` | server | no | Checkout return URLs |
| `ALLOWED_ORIGIN` | server | no | CORS for the dev origin |
| `PORT` | server | no | API port (default 8787) |

Keep secret values out of git. `.env` and `.env.*` are ignored, except `.env.example`.

## Not carried over from the original

- Lovable's hosted services: its AI gateway, Stripe connector, sign-in button, and error reporter.
- Video and image files for the video wallpapers and some assets. Only their JSON manifests are in the
  zip; the 15 video and poster files must be supplied. Missing media falls back to a poster or gradient.
- Music tracks that shipped with the original, and games over 10 MB. Their files were stored on
  Lovable's servers and are not in this repo.
- The Stem `/gn-play` relay. Games now run directly from `public/game-files/`.
