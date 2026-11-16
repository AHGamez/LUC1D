# LUC1D reborn

A desktop-style web app with three layouts (Glass, LUC1D sidebar, and PS5 console), signed-in
accounts, and these apps: Stem (game store), Downloads, Discard (chat, DMs, calls), TikiTaki (short
video feed), Grime Video and Tube For You (longform), Video Maker, Music, Club Bird, Battle Pass,
Larp Flex, Lublox (3D player), Lublox Studio (staff only), Turkey Hunt (live events), Donate, and Settings.

See **[BACKENDS.md](./BACKENDS.md)** for every service the app needs and the environment variables.

## Setup

1. Create the six storage buckets in the Supabase dashboard (names in BACKENDS.md).
2. Apply the database schema: run the migrations in `drizzle/migrations/` in order (0000 to 0048)
   against your Supabase project (SQL editor or the Supabase CLI).
3. Copy `.env.example` to `.env.local` and fill in at least `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Install and run:

```sh
npm install
npm run dev          # the app at http://localhost:5173
npm run dev:server   # the API at http://localhost:8787 (second terminal)
```

The API is optional for browsing. Each route fails closed with a 503 until its secrets are set:
donations need `STRIPE_SECRET_KEY`, the Larp judge needs `ANTHROPIC_API_KEY`, push needs
`VAPID_PRIVATE_KEY`, and account deletion needs `SUPABASE_SERVICE_ROLE_KEY`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (proxies `/api` to the API) |
| `npm run dev:server` | API server with reload on change |
| `npm run build` | Type-check and production build |
| `npm start` | Run the API server (production) |
| `npm test` | Unit tests |

## Layout

| Path | What it is |
| --- | --- |
| `src/App.tsx` | Desktop shell: sign-in gate, layouts, window manager, extras, device entry |
| `src/apps/` | App registry (`registry.ts`) and the window and shell contracts (`types.ts`) |
| `src/features/<app>/` | One folder per app. Each is lazy-loaded when its window opens |
| `src/features/device/` | Startup device choice, reduced effects, opt-in tab cloaks, video wallpapers |
| `src/features/push/` | Web Push settings and the staff send helper |
| `src/shell/` | Shell pieces: sidebar, tab bar, status bar, home screens, extras (update log, shimeji, boot intro) |
| `src/components/` | Shared UI kit, auth screens, and the media video editor |
| `src/lib/` | Supabase client, session, prefs, themes, backgrounds, and the generated database types |
| `server/` | Node API: donations (Stripe), webhook, larp judge, push, account deletion |
| `drizzle/migrations/` | Database schema (source of truth for the Supabase backend, 0000–0048) |
| `supabase/tests/` | SQL checks for the turkey hunt rules |
| `public/game-files/` | Game HTML for the Stem store |

## Adding an app

Create `src/features/<name>/`, export a default component `(props: AppProps) => JSX`, then add an
entry to `APPS` in `src/apps/registry.ts`. Set `dock: true` to show it in the sidebar.

## Known limits

- Video and image files for the video wallpapers, and the music tracks and games over 10 MB that
  shipped with the original, are hosted on Lovable and are not in this repo. Missing media falls back
  to a poster or a gradient, and affected games show as unavailable.
- Games that fetch JSON or WebAssembly from their own host need CORS headers from that host.
- The Larp judge, push sending, and account deletion have not been run against live services.
- Donations are recorded only in Stripe. The webhook logs events; there is no donations table.
- The tab cloak picker can make the tab look like a school site. It is opt-in and off by default.
