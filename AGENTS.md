<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the arcade shell in the authenticated desktop route, with its generated starfield imported as a bundled asset; this preserves the account gate and existing game windows while keeping appearance changes separate from game logic.
- Render the desktop wallpaper behind the entire shell and use shared semantic glass tokens for its navigation bars; real backdrop blur must sample the selected wallpaper without altering game windows.
- Whole-site themes use root semantic CSS tokens and a shared appearance listener reading desktop preferences; this keeps selections persistent across routes without modifying games or overriding app-specific customization.
- Keep external game metadata in source-specific bundled catalogues, tag each game with its source, preserve existing IDs, and use namespaced IDs for new sources; source tabs share the same filter and sandboxed player with an external-link fallback, avoiding rehosting third-party code and preserving account-specific installs.
- 55gms and GN Math launch HTML is copied into public/game-files (files over 10 MB go to lovable-assets, mapped in src/generated/big-games.json) with an injected storage shim and remote base URL, played in an opaque-origin sandbox; FivePlay stays embedded. Settings are per-browser in localStorage.
- Discard avatars use private Storage with signed URLs and user-owned upload paths; verified chat tags live in a separate read-only table keyed by account ID to prevent display-name impersonation.
- Day 1 eligibility is checked against auth account creation timestamps by a database function; existing users are backfilled and new signups are awarded by an auth lifecycle trigger so client edits cannot grant badges.
- Discard avatar decorations are saved on the user-owned profile and rendered by one shared SVG overlay; this keeps pictures visible and decorations consistent in chats, DMs, and profile previews while respecting reduced motion.
- Discard chat pictures use private Storage with message-visibility read policies and a shared composer for channels and DMs; this preserves existing conversation privacy and consistent upload behavior.
- The Home update log is generated at Vite configuration and watched source changes, grouping revisions by UTC day with source-area notes; keep its generated data out of the source hash and keep Node-only generation in scripts, never in the app runtime.
- Discard voice/video calls are peer-to-peer WebRTC with realtime presence/broadcast signalling (rooms `ch-<channel>` / `dm-<sorted ids>`, rings on `ring-<user>`); no media server, so nothing is recorded or stored.
- Larp Flex verdicts are written only by an authenticated server function using the admin client after verifying the caller is a player; joining goes through the `larp_join` security-definer function so clients can never set winners or scores.
- TikiTaki social actions use shared feed state and separate likes, comments, and follows with owner-scoped writes; this keeps reactions persistent across clips without allowing users to change other accounts' actions.
- Club Bird money is counted by database triggers on Discard message inserts and spent only through security-definer buy/equip functions with server-side prices (club_price); paid avatar rings are enforced by a profile trigger, so clients can't grant themselves money or items.
