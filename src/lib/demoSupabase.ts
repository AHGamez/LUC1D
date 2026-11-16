/**
 * Demo mode: a stand-in for the Supabase client, used when VITE_DEMO_MODE=true, so the app can be
 * used with no Supabase project. Nothing is sent over the network.
 *
 * - Auth: two demo accounts. Sign in by email (any password works).
 *   "Blank Test 1" is the Discord owner (mod). "Blank Test 2" is a regular user.
 * - Data: an in-memory copy of the fixtures in src/lib/demo, built fresh on each page load. Reads
 *   apply the query filters (eq, in, or, order, limit, ...) and the visibility a signed-in account would
 *   have under row-level security (for example, only your own DMs). Signed out, every read is empty.
 * - Writes update the in-memory copy, so a message sent in Discard shows up in later reads on the same
 *   page. Reloading the page resets everything. Realtime is not implemented.
 */

import { clubFixtures } from "./demo/clubFixtures";
import { discardFixtures } from "./demo/discardFixtures";
import { gameFixtures } from "./demo/gameFixtures";
import { mediaFixtures } from "./demo/mediaFixtures";
import type { DemoPeople, DemoRow, DemoRows } from "./demo/shared";

export const DEMO_ACCOUNTS = [
  { id: "00000000-0000-4000-8000-000000000001", email: "test1@demo.local", name: "Blank Test 1" },
  { id: "00000000-0000-4000-8000-000000000002", email: "test2@demo.local", name: "Blank Test 2" },
] as const;

/** Roles per demo account. Test 1 owns the demo Discord server (owner, so also a mod). */
const ROLES: Record<string, { owner: boolean; mod: boolean; rank: number }> = {
  [DEMO_ACCOUNTS[0].id]: { owner: true, mod: true, rank: 3 },
  [DEMO_ACCOUNTS[1].id]: { owner: false, mod: false, rank: 0 },
};

type AuthUser = { id: string; email: string; user_metadata: { display_name: string }; app_metadata: object; aud: string; created_at: string };
type Session = { access_token: string; token_type: "bearer"; expires_in: number; expires_at: number; refresh_token: string; user: AuthUser };
type AuthListener = (event: string, session: Session | null) => void;

const DEMO_STORAGE_KEY = "luc1d-demo-user";

function userFor(account: (typeof DEMO_ACCOUNTS)[number]): AuthUser {
  return {
    id: account.id,
    email: account.email,
    user_metadata: { display_name: account.name },
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function sessionFor(user: AuthUser): Session {
  const now = Math.floor(Date.now() / 1000);
  return { access_token: "demo", token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "demo", user };
}

/** Result of a chained query. Awaiting it resolves to the given result. Any method returns the same chain. */
function emptyChain(result: { data: unknown; error: unknown } = { data: [], error: null }): unknown {
  const handle: unknown = new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then") return (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
      if (prop === "catch") return (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
      if (prop === "finally") return (fn: () => void) => Promise.resolve(result).finally(fn);
      if (prop === "single" || prop === "maybeSingle") return () => emptyChain({ data: null, error: null });
      if (prop === "subscribe") return () => handle;
      if (prop === "presenceState") return () => ({});
      if (prop === "unsubscribe") return () => Promise.resolve("ok");
      return () => handle;
    },
    apply() {
      return handle;
    },
  });
  return handle;
}

// ---------------------------------------------------------------------------------------------
// Query engine: a small subset of PostgREST, enough for the screens in this app.
// ---------------------------------------------------------------------------------------------

type QueryError = { message: string; code?: string };
type Result = { data: unknown; error: QueryError | null; count?: number };
type Pred = (row: DemoRow) => boolean;

/** The in-memory database as the query engine sees it. */
interface Db {
  /** Signed-in account id, or null when signed out. */
  me(): string | null;
  /** Live rows of a table (created empty on first use). */
  rows(table: string): DemoRow[];
  /** Whether the signed-in account may see a row (row-level security, see visibleRow). */
  visible(table: string, row: DemoRow): boolean;
}

/** Keys used for upsert and for duplicate checks. Tables not listed here use `id`. */
const KEYS: Record<string, string[]> = {
  discard_profiles: ["user_id"],
  discard_chat_tags: ["user_id"],
  discard_day_one_tags: ["user_id"],
  discard_moderators: ["user_id"],
  discard_members: ["server_id", "user_id"],
  discard_poll_votes: ["poll_id", "user_id"],
  discard_sanctions: ["user_id", "kind"],
  club_wallets: ["user_id"],
  club_birds: ["user_id"],
  club_pass: ["user_id"],
  club_owned: ["user_id", "item_id"],
  installed_games: ["user_id", "game_id"],
  lublox_avatars: ["user_id"],
  tikitaki_profiles: ["user_id"],
  tikitaki_likes: ["post_id", "user_id"],
  tikitaki_follows: ["follower_id", "following_id"],
};

const iso = () => new Date().toISOString();

/** Column defaults for inserted rows, matching what the database fills in. Keys already in the row win. */
const DEFAULTS: Record<string, () => DemoRow> = {
  discard_messages: () => ({ pinned: false, image_path: null }),
  discard_dms: () => ({ pinned: false, image_path: null }),
  discard_servers: () => ({ icon: "💬", is_public: false, owner_id: null, invite_code: newCode() }),
  discard_friends: () => ({ status: "pending" }),
  discard_announcements: () => ({ sitewide: false }),
  discard_members: () => ({ joined_at: iso() }),
  discard_moderators: () => ({ coowner: false, granted_at: iso() }),
  discard_profiles: () => ({
    avatar_color: "#7c8cff",
    status: "",
    avatar_path: null,
    avatar_decoration: "none",
    banner: "blurple",
    banner_path: null,
    name_effect: "none",
    updated_at: iso(),
  }),
  club_wallets: () => ({ earned_cents: 0, spent_cents: 0, messages: 0 }),
  club_birds: () => ({ color: "default", hat: "none", tag: "none" }),
  club_pass: () => ({ xp: 0, claimed: [], last_ping: null, streak_start: null, bought_at: iso() }),
  club_owned: () => ({ bought_at: iso() }),
  installed_games: () => ({ installed_at: iso() }),
  tikitaki_posts: () => ({ caption: "" }),
  tikitaki_profiles: () => ({ bio: "", links: [], banner_color: "#2b6cb0", banner_path: null, avatar_path: null, updated_at: iso() }),
  music_playlists: () => ({ is_public: false }),
  music_tracks: () => ({ position: 0 }),
  longform_videos: () => ({ category: "", description: "" }),
  lublox_games: () => ({ description: "", published: false, blocks: [] }),
  lublox_avatars: () => ({ hat: "none", shirt: "none", pants: "none", updated_at: iso() }),
};

function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function newCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, "X");
}

/** A new row: defaults, then created_at and id (for tables keyed by id), then the values given. */
function newRow(table: string, values: DemoRow): DemoRow {
  const row: DemoRow = { ...(DEFAULTS[table]?.() ?? {}), created_at: iso(), ...values };
  if (!KEYS[table] && row.id === undefined) row.id = newId();
  return row;
}

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T/;

function compareCells(a: unknown, b: unknown): number {
  if (a == null || b == null) return a == null && b == null ? 0 : a == null ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a);
  const sb = String(b);
  if (ISO_TIME.test(sa) && ISO_TIME.test(sb)) return Date.parse(sa) - Date.parse(sb);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** Compares a cell with a filter value (filter values arrive as strings). */
function compareToValue(cell: unknown, value: string): number {
  if (typeof cell === "number") return cell - Number(value);
  const text = cell == null ? "" : String(cell);
  if (ISO_TIME.test(text) && ISO_TIME.test(value)) return Date.parse(text) - Date.parse(value);
  return text < value ? -1 : text > value ? 1 : 0;
}

function likeRegex(pattern: string, insensitive: boolean): RegExp {
  const source = pattern
    .split("")
    .map((ch) => (ch === "%" ? ".*" : ch === "_" ? "." : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("");
  return new RegExp(`^${source}$`, insensitive ? "i" : "");
}

/** One filter on one column. `value` is a string for the PostgREST `or` syntax, or any value from the client. */
function applyOp(row: DemoRow, column: string, op: string, value: unknown): boolean {
  const cell = row[column];
  const text = cell == null ? "null" : String(cell);
  switch (op) {
    case "eq":
      return text === String(value);
    case "neq":
      return text !== String(value);
    case "gt":
      return compareToValue(cell, String(value)) > 0;
    case "gte":
      return compareToValue(cell, String(value)) >= 0;
    case "lt":
      return compareToValue(cell, String(value)) < 0;
    case "lte":
      return compareToValue(cell, String(value)) <= 0;
    case "like":
      return likeRegex(String(value), false).test(text);
    case "ilike":
      return likeRegex(String(value), true).test(text);
    case "is":
      return value === null || value === "null" ? cell == null : text === String(value);
    case "in":
      return Array.isArray(value) ? value.map(String).includes(text) : false;
    default:
      return false;
  }
}

/** Splits on commas that are not inside parentheses. */
function splitTop(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

/** Parses one term of a PostgREST `or` filter, such as `pinned.eq.true` or `and(a.eq.1,b.gt.2)`. */
function parseTerm(term: string): Pred {
  const group = /^(and|or)\((.*)\)$/s.exec(term);
  if (group) {
    const preds = splitTop(group[2] ?? "").map(parseTerm);
    return group[1] === "and" ? (row) => preds.every((p) => p(row)) : (row) => preds.some((p) => p(row));
  }
  const match = /^([^.]+)\.([a-z]+)\.(.*)$/s.exec(term);
  if (!match) return () => false;
  const column = match[1] ?? "";
  const op = match[2] ?? "";
  const raw = match[3] ?? "";
  if (op === "in") {
    const list = raw.replace(/^\(|\)$/g, "").split(",");
    return (row) => applyOp(row, column, "in", list);
  }
  return (row) => applyOp(row, column, op, raw);
}

function parseOr(expression: string): Pred {
  const preds = splitTop(expression).map(parseTerm);
  return (row) => preds.some((p) => p(row));
}

type Order = { column: string; ascending: boolean };

interface QueryState {
  table: string;
  op: "select" | "insert" | "upsert" | "update" | "delete";
  filters: Pred[];
  orders: Order[];
  range?: [number, number];
  limit?: number;
  payload: DemoRow[];
  conflict?: string[];
  ignoreDuplicates: boolean;
  returning: boolean;
  head: boolean;
  count: boolean;
  mode?: "single" | "maybeSingle";
}

function finish(s: QueryState, list: DemoRow[], total: number): Result {
  const countPart = s.count ? { count: total } : {};
  if (s.mode === "single" && list.length !== 1) {
    return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
  }
  if (s.mode === "maybeSingle" && list.length > 1) {
    return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
  }
  if (s.mode) return { data: list[0] ?? null, error: null, ...countPart };
  if (s.op === "select" && s.head) return { data: null, error: null, ...countPart };
  if (s.op === "select" || s.returning) return { data: list, error: null, ...countPart };
  return { data: null, error: null };
}

function execute(s: QueryState, db: Db): Result {
  const me = db.me();
  const rows = db.rows(s.table);
  const matches = (row: DemoRow) => s.filters.every((f) => f(row));
  const copy = (row: DemoRow) => ({ ...row });

  if (s.op === "select") {
    if (!me) return finish(s, [], 0);
    let list = rows.filter((row) => db.visible(s.table, row) && matches(row));
    if (s.orders.length) {
      list = [...list].sort((a, b) => {
        for (const o of s.orders) {
          const c = compareCells(a[o.column], b[o.column]);
          if (c) return o.ascending ? c : -c;
        }
        return 0;
      });
    }
    const total = list.length;
    if (s.range) list = list.slice(s.range[0], s.range[1] + 1);
    if (s.limit !== undefined) list = list.slice(0, s.limit);
    return finish(s, list.map(copy), total);
  }

  // Writes. Signed out, they succeed and change nothing, as before.
  if (!me) return finish(s, [], 0);

  if (s.op === "insert") {
    const key = KEYS[s.table];
    const added: DemoRow[] = [];
    for (const values of s.payload) {
      const row = newRow(s.table, values);
      if (key && rows.some((r) => key.every((k) => String(r[k]) === String(row[k])))) {
        return { data: null, error: { code: "23505", message: `duplicate key value violates unique constraint "${s.table}"` } };
      }
      rows.push(row);
      added.push(row);
    }
    return finish(s, added.map(copy), added.length);
  }

  if (s.op === "upsert") {
    const key = s.conflict ?? KEYS[s.table] ?? ["id"];
    const touched: DemoRow[] = [];
    for (const values of s.payload) {
      const hit = rows.find((r) => key.every((k) => values[k] !== undefined && String(r[k]) === String(values[k])));
      if (hit) {
        if (!s.ignoreDuplicates) {
          Object.assign(hit, values);
          touched.push(hit);
        }
        continue;
      }
      const row = newRow(s.table, values);
      rows.push(row);
      touched.push(row);
    }
    return finish(s, touched.map(copy), touched.length);
  }

  // update and delete touch only the rows the account can see and the filters match.
  const targets = rows.filter((row) => db.visible(s.table, row) && matches(row));
  if (s.op === "update") {
    const patch = s.payload[0] ?? {};
    targets.forEach((row) => Object.assign(row, patch));
    return finish(s, targets.map(copy), targets.length);
  }
  for (const row of targets) rows.splice(rows.indexOf(row), 1);
  return finish(s, targets.map(copy), targets.length);
}

/** A query builder. Filters are recorded; the query runs when the chain is awaited. */
function query(table: string, db: Db): unknown {
  const s: QueryState = {
    table,
    op: "select",
    filters: [],
    orders: [],
    payload: [],
    ignoreDuplicates: false,
    returning: false,
    head: false,
    count: false,
  };
  const run = (): Result => {
    try {
      return execute(s, db);
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }
  };
  const toRows = (values: unknown): DemoRow[] => (Array.isArray(values) ? (values as DemoRow[]) : [values as DemoRow]);
  const opFilter = (op: string) => (column: string, value: unknown) => {
    s.filters.push((row) => applyOp(row, column, op, value));
    return self;
  };

  const self: unknown = new Proxy(function () {}, {
    get(_target, prop) {
      switch (prop) {
        case "then":
          return (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject);
        case "catch":
          return (reject: (e: unknown) => unknown) => Promise.resolve(run()).catch(reject);
        case "finally":
          return (fn: () => void) => Promise.resolve(run()).finally(fn);
        case "select":
          return (_columns?: string, opts?: { head?: boolean; count?: string | null }) => {
            if (opts?.head) s.head = true;
            if (opts?.count) s.count = true;
            s.returning = true;
            return self;
          };
        case "insert":
          return (values: unknown) => {
            s.op = "insert";
            s.payload = toRows(values);
            return self;
          };
        case "upsert":
          return (values: unknown, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) => {
            s.op = "upsert";
            s.payload = toRows(values);
            s.conflict = opts?.onConflict ? opts.onConflict.split(",").map((c) => c.trim()) : undefined;
            s.ignoreDuplicates = !!opts?.ignoreDuplicates;
            return self;
          };
        case "update":
          return (values: DemoRow) => {
            s.op = "update";
            s.payload = [values];
            return self;
          };
        case "delete":
          return () => {
            s.op = "delete";
            return self;
          };
        case "eq":
          return (column: string, value: unknown) => {
            s.filters.push((row) => applyOp(row, column, "eq", value));
            return self;
          };
        case "neq":
          return opFilter("neq");
        case "gt":
          return opFilter("gt");
        case "gte":
          return opFilter("gte");
        case "lt":
          return opFilter("lt");
        case "lte":
          return opFilter("lte");
        case "like":
          return opFilter("like");
        case "ilike":
          return opFilter("ilike");
        case "is":
          return opFilter("is");
        case "in":
          return opFilter("in");
        case "or":
          return (expression: string) => {
            s.filters.push(parseOr(expression));
            return self;
          };
        case "not":
          return (column: string, op: string, value: unknown) => {
            s.filters.push((row) => !applyOp(row, column, op, value));
            return self;
          };
        case "match":
          return (values: DemoRow) => {
            for (const [column, value] of Object.entries(values)) s.filters.push((row) => applyOp(row, column, "eq", value));
            return self;
          };
        case "order":
          return (column: string, opts?: { ascending?: boolean }) => {
            s.orders.push({ column, ascending: opts?.ascending !== false });
            return self;
          };
        case "limit":
          return (count: number) => {
            s.limit = count;
            return self;
          };
        case "range":
          return (from: number, to: number) => {
            s.range = [from, to];
            return self;
          };
        case "single":
          return () => {
            s.mode = "single";
            return self;
          };
        case "maybeSingle":
          return () => {
            s.mode = "maybeSingle";
            return self;
          };
        default:
          // Other modifiers (returns, throwOnError, abortSignal, ...) do not change the result here.
          return () => self;
      }
    },
  });
  return self;
}

// ---------------------------------------------------------------------------------------------
// Row-level visibility: what the signed-in account could read under the real policies.
// ---------------------------------------------------------------------------------------------

function serverVisibleTo(db: Db, serverId: string, user: string): boolean {
  const server = db.rows("discard_servers").find((s) => s.id === serverId);
  if (!server) return false;
  if (server.is_public === true || server.owner_id == null || server.owner_id === user) return true;
  return db.rows("discard_members").some((m) => m.server_id === serverId && m.user_id === user);
}

function channelVisibleTo(db: Db, channelId: string, user: string): boolean {
  const channel = db.rows("discard_channels").find((c) => c.id === channelId);
  return !!channel && serverVisibleTo(db, String(channel.server_id), user);
}

function visibleRow(db: Db, me: string, table: string, row: DemoRow): boolean {
  switch (table) {
    case "discard_servers":
      return serverVisibleTo(db, String(row.id), me);
    case "discard_channels":
    case "discard_members":
      return serverVisibleTo(db, String(row.server_id), me);
    case "discard_messages":
    case "discard_polls":
      return channelVisibleTo(db, String(row.channel_id), me);
    case "discard_poll_votes": {
      const poll = db.rows("discard_polls").find((p) => p.id === row.poll_id);
      return !!poll && channelVisibleTo(db, String(poll.channel_id), me);
    }
    case "discard_friends":
      return row.requester_id === me || row.addressee_id === me;
    case "discard_dms":
      return row.sender_id === me || row.recipient_id === me;
    // Moderators are visible only to the moderator themself. The demo tests rely on this.
    case "discard_moderators":
    case "discard_sanctions":
    case "club_owned":
    case "club_pass":
    case "installed_games":
      return row.user_id === me;
    case "club_trades":
      return row.from_user === me || row.to_user === me;
    case "lublox_games":
      return row.published === true || row.creator_id === me;
    case "music_playlists":
      return row.is_public === true || row.user_id === me;
    case "music_tracks": {
      const playlist = db.rows("music_playlists").find((p) => p.id === row.playlist_id);
      return !!playlist && visibleRow(db, me, "music_playlists", playlist);
    }
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------------------------
// RPCs: the answers the screens need, with the shapes the database functions return.
// ---------------------------------------------------------------------------------------------

function rpcResult(name: string, args: Record<string, unknown>, db: Db): Result {
  const me = db.me();
  const ok = (data: unknown): Result => ({ data, error: null });
  const fail = (message: string): Result => ({ data: null, error: { message } });
  const who = (key: string) => String(args[key] ?? me ?? "");
  const rows = (table: string) => db.rows(table);

  switch (name) {
    case "discard_is_owner":
      return ok(!!ROLES[who("_u")]?.owner);
    case "discard_is_mod":
      return ok(!!ROLES[who("_u")]?.mod);
    case "discard_rank":
      return ok(ROLES[who("_u")]?.rank ?? 0);
    case "discard_is_coowner":
      return ok(rows("discard_moderators").some((m) => m.user_id === who("_u") && m.coowner === true));
    case "discard_is_muted":
      return ok(false);
    case "discard_is_day_one":
      return ok(true);
    case "discard_is_server_owner":
      return ok(rows("discard_servers").some((s) => s.id === args._server && s.owner_id === me));
    case "discard_can_see_server":
      return ok(serverVisibleTo(db, String(args._server ?? ""), who("_user")));
    case "discard_can_join":
      return ok(!!me && serverVisibleTo(db, String(args._server ?? ""), me));
    case "discard_are_friends": {
      const a = String(args._a ?? "");
      const b = String(args._b ?? "");
      return ok(
        rows("discard_friends").some(
          (f) => f.status === "accepted" && ((f.requester_id === a && f.addressee_id === b) || (f.requester_id === b && f.addressee_id === a)),
        ),
      );
    }
    case "discard_join_by_code": {
      const code = String(args._code ?? "").trim().toUpperCase();
      const server = rows("discard_servers").find((s) => String(s.invite_code).toUpperCase() === code);
      if (!server || !me) return fail("That invite code does not match a server.");
      const already = rows("discard_members").some((m) => m.server_id === server.id && m.user_id === me);
      if (!already) rows("discard_members").push({ server_id: server.id, user_id: me, joined_at: iso() });
      return ok(server.id);
    }
    case "discard_toggle_pin": {
      const table = args._kind === "dm" ? "discard_dms" : "discard_messages";
      const row = rows(table).find((r) => r.id === args._id);
      if (!row || !db.visible(table, row)) return fail("That message is gone.");
      row.pinned = !row.pinned;
      return ok(row.pinned === true);
    }
    case "club_owns":
      return ok(rows("club_owned").some((o) => o.user_id === who("_u") && o.item_id === args._item));
    case "club_pass_ping":
      return ok(0);
    case "turkey_status":
      return ok({ now: Date.now(), active: false, end: 0, next: Date.now() + 3 * 60 * 60 * 1000, balance: 0, targets: [] });
    case "turkey_can_activate":
      return ok(false);
    case "turkey_hit":
    case "turkey_buy":
      return ok(0);
    case "lublox_can_create":
      return ok(!!me);
    case "lublox_plot_price":
      return ok(500);
    case "lublox_ai_limit":
      return ok(20);
    default:
      // Writes and other RPCs: a successful no-op.
      return ok(null);
  }
}

// ---------------------------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------------------------

function buildSeed(people: DemoPeople, now: number): DemoRows {
  return { ...discardFixtures(people, now), ...clubFixtures(people, now), ...mediaFixtures(people, now), ...gameFixtures(people, now) };
}

/** Builds the demo client. Shaped like SupabaseClient for every call the app makes. */
export function createDemoSupabase(): unknown {
  const listeners = new Set<AuthListener>();
  let current: AuthUser | null = null;

  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(DEMO_STORAGE_KEY) : null;
  const first = DEMO_ACCOUNTS.find((a) => a.id === saved) ?? DEMO_ACCOUNTS[0];
  // The app starts signed in to the first blank account; signing out and back in switches accounts.
  if (saved !== "signed-out") current = userFor(first);

  const persist = (user: AuthUser | null) => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, user ? user.id : "signed-out");
    } catch {
      /* storage unavailable: the demo still works for this page load */
    }
  };
  const notify = (event: string) => {
    const session = current ? sessionFor(current) : null;
    listeners.forEach((cb) => cb(event, session));
  };
  const ok = (data: unknown = null) => Promise.resolve({ data, error: null });
  const fail = (message: string) => Promise.resolve({ data: { user: null, session: null }, error: { name: "AuthError", message, status: 400 } });

  // The in-memory database for this page load. Rebuilt from the fixtures on every load.
  const store: DemoRows = buildSeed({ one: DEMO_ACCOUNTS[0].id, two: DEMO_ACCOUNTS[1].id }, Date.now());
  const db: Db = {
    me: () => current?.id ?? null,
    rows(table) {
      let list = store[table];
      if (!list) {
        list = [];
        store[table] = list;
      }
      return list;
    },
    visible(table, row) {
      const me = current?.id;
      return !!me && visibleRow(db, me, table, row);
    },
  };

  // Uploaded files: object URLs for this page load. Fixture media answers with a placeholder that fails to load.
  const files = new Map<string, string>();
  const mediaUrl = (bucket: string, path: string) => files.get(`${bucket}/${path}`) ?? `/demo-media/${bucket}/${path}`;
  const storage = {
    from(bucket: string) {
      return {
        async createSignedUrl(path: string) {
          return { data: { signedUrl: mediaUrl(bucket, path) }, error: null };
        },
        async createSignedUrls(paths: string[]) {
          return { data: paths.map((path) => ({ path, signedUrl: mediaUrl(bucket, path), error: null })), error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: mediaUrl(bucket, path) } };
        },
        async upload(path: string, file?: Blob) {
          if (file && typeof URL.createObjectURL === "function") files.set(`${bucket}/${path}`, URL.createObjectURL(file));
          return { data: { id: path, path, fullPath: `${bucket}/${path}` }, error: null };
        },
        async remove(paths: string[]) {
          paths.forEach((path) => files.delete(`${bucket}/${path}`));
          return { data: paths.map((name) => ({ name })), error: null };
        },
      };
    },
  };

  const auth = {
    getSession: () => ok({ session: current ? sessionFor(current) : null }),
    getUser: () => ok({ user: current }),
    onAuthStateChange(callback: AuthListener) {
      listeners.add(callback);
      // Like the real client, report the current state straight away.
      queueMicrotask(() => callback("INITIAL_SESSION", current ? sessionFor(current) : null));
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
    signInWithPassword({ email }: { email: string; password?: string }) {
      const account = DEMO_ACCOUNTS.find((a) => a.email === email.trim().toLowerCase());
      if (!account) return fail(`Demo mode: use ${DEMO_ACCOUNTS.map((a) => a.email).join(" or ")} (any password).`);
      current = userFor(account);
      persist(current);
      notify("SIGNED_IN");
      return ok({ session: sessionFor(current), user: current });
    },
    signUp: () => fail("Sign-up is off in demo mode. Use one of the blank test accounts."),
    signInWithOAuth: () => fail("Google sign-in is off in demo mode."),
    resetPasswordForEmail: () => ok({}),
    updateUser: () => ok({ user: current }),
    async signOut() {
      current = null;
      persist(null);
      notify("SIGNED_OUT");
      return { error: null };
    },
  };

  return {
    auth,
    from: (table: string) => query(table, db),
    rpc: (name: string, args?: Record<string, unknown>) => emptyChain(rpcResult(name, args ?? {}, db)),
    storage,
    channel: () => emptyChain(),
    removeChannel: () => Promise.resolve("ok"),
    removeAllChannels: () => Promise.resolve([]),
    functions: { invoke: () => emptyChain({ data: null, error: null }) },
  };
}
