import { beforeEach, describe, expect, it } from "vitest";
import { createDemoSupabase, DEMO_ACCOUNTS } from "./demoSupabase";
import { clubFixtures } from "./demo/clubFixtures";
import {
  ANNOUNCEMENTS_CHANNEL_ID,
  discardFixtures,
  DEMO_SERVER_ID,
  GENERAL_CHANNEL_ID,
  POLL_ID,
  PUBLIC_SERVER_ID,
} from "./demo/discardFixtures";
import { gameFixtures } from "./demo/gameFixtures";
import { mediaFixtures } from "./demo/mediaFixtures";
import type { DemoPeople, DemoRows } from "./demo/shared";
import { GAMES } from "../features/stem/games";
import { worldSchema } from "../features/lublox/lublox";

type Client = ReturnType<typeof createDemoSupabase> & {
  auth: {
    getSession(): Promise<{ data: { session: { user: { id: string } } | null } }>;
    onAuthStateChange(cb: (event: string, session: unknown) => void): unknown;
    signOut(): Promise<{ error: null }>;
    signInWithPassword(args: { email: string }): Promise<unknown>;
  };
  rpc(name: string): Promise<{ data: unknown }>;
  from(table: string): Promise<{ data: unknown[] }>;
};

type Res = { data: unknown; error: { message: string; code?: string } | null };
/** A query chain. Every modifier returns the chain; awaiting it runs the query. */
interface Chain extends PromiseLike<Res> {
  select(columns?: string): Chain;
  insert(values: object): Chain;
  upsert(values: object, opts?: object): Chain;
  update(values: object): Chain;
  delete(): Chain;
  eq(column: string, value: unknown): Chain;
  in(column: string, values: unknown[]): Chain;
  order(column: string, opts?: object): Chain;
  limit(n: number): Chain;
  single(): Chain;
  maybeSingle(): Chain;
}
interface DemoClient {
  auth: Client["auth"];
  from(table: string): Chain;
  rpc(name: string, args?: object): PromiseLike<Res>;
}

const demo = (): DemoClient => createDemoSupabase() as unknown as DemoClient;

const [test1, test2] = DEMO_ACCOUNTS;
const PEOPLE: DemoPeople = { one: test1.id, two: test2.id };
const ACCOUNT_IDS: string[] = DEMO_ACCOUNTS.map((a) => a.id);

describe("demo Supabase client", () => {
  beforeEach(() => localStorage.clear());

  it("starts signed in to the first blank account", async () => {
    const client = createDemoSupabase() as Client;
    const { data } = await client.auth.getSession();
    expect(data.session?.user.id).toBe(test1.id);
  });

  it("reports SIGNED_OUT to listeners and stays signed out after a reload", async () => {
    const client = createDemoSupabase() as Client;
    const events: Array<{ event: string; session: unknown }> = [];
    client.auth.onAuthStateChange((event, session) => events.push({ event, session }));
    await client.auth.signOut();
    expect(events).toContainEqual({ event: "SIGNED_OUT", session: null });
    const reloaded = createDemoSupabase() as Client;
    expect((await reloaded.auth.getSession()).data.session).toBeNull();
  });

  it("switches accounts with signInWithPassword and reports SIGNED_IN", async () => {
    const client = createDemoSupabase() as Client;
    const events: string[] = [];
    client.auth.onAuthStateChange((event) => events.push(event));
    await client.auth.signOut();
    await client.auth.signInWithPassword({ email: test2.email });
    expect(events).toContain("SIGNED_IN");
    expect((await client.auth.getSession()).data.session?.user.id).toBe(test2.id);
  });

  it("makes the first blank account the Discord owner and mod, and the second a regular user", async () => {
    const client = createDemoSupabase() as Client;
    expect((await client.rpc("discard_is_owner")).data).toBe(true);
    expect((await client.rpc("discard_is_mod")).data).toBe(true);
    expect((await client.from("discard_moderators")).data).toHaveLength(1);

    await client.auth.signOut();
    await client.auth.signInWithPassword({ email: test2.email });
    expect((await client.rpc("discard_is_owner")).data).toBe(false);
    expect((await client.rpc("discard_is_mod")).data).toBe(false);
    expect((await client.from("discard_moderators")).data).toHaveLength(0);
  });

  it("returns no rows when signed out", async () => {
    const client = demo();
    await client.auth.signOut();
    expect((await client.from("discard_servers").select("*")).data).toEqual([]);
    expect((await client.from("club_wallets").select("*")).data).toEqual([]);
    expect((await client.from("installed_games").select("*")).data).toEqual([]);
  });

  it("shows the signed-in account its own servers, channels and messages", async () => {
    const client = demo();
    const servers = (await client.from("discard_servers").select("id, name, owner_id")).data as Array<{ id: string; name: string }>;
    expect(servers.map((s) => s.name).sort()).toEqual(["Demo Server", "Open Lounge"]);

    const channels = (await client.from("discard_channels").select("*").eq("server_id", DEMO_SERVER_ID).order("created_at")).data as Array<{ name: string }>;
    expect(channels.map((c) => c.name)).toEqual(["general", "announcements", "voice-lounge"]);

    const messages = (await client.from("discard_messages").select("*").eq("channel_id", GENERAL_CHANNEL_ID).order("created_at")).data as Array<{
      channel_id: string;
    }>;
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every((m) => m.channel_id === GENERAL_CHANNEL_ID)).toBe(true);
  });

  it("filters the wallet and pass to the signed-in account", async () => {
    const client = demo();
    const mine = (await client.from("club_wallets").select("earned_cents, spent_cents").eq("user_id", test2.id).maybeSingle()) as unknown as Res;
    expect(mine.data).toMatchObject({ user_id: test2.id, earned_cents: 2100, spent_cents: 800 });
    // Everyone's wallets are readable, for the Club Bird leaderboard.
    expect(((await client.from("club_wallets").select("user_id")).data as unknown[]).length).toBe(2);
    // Battle Pass rows are only the owner's.
    expect((await client.from("club_pass").select("xp").eq("user_id", test2.id)).data).toEqual([]);
    expect((await client.from("club_pass").select("xp").eq("user_id", test1.id)).data).toHaveLength(1);
  });

  it("shows a channel message insert in a later select", async () => {
    const client = demo();
    const sent = (await client
      .from("discard_messages")
      .insert({ channel_id: GENERAL_CHANNEL_ID, user_id: test1.id, content: "hello from the test", image_path: null })
      .select()
      .single()) as unknown as Res;
    expect(sent.error).toBeNull();
    const sentRow = sent.data as { id: string; content: string; pinned: boolean };
    expect(sentRow.content).toBe("hello from the test");
    expect(sentRow.pinned).toBe(false);

    const later = (await client.from("discard_messages").select("*").eq("channel_id", GENERAL_CHANNEL_ID)).data as Array<{ id: string }>;
    expect(later.map((m) => m.id)).toContain(sentRow.id);

    // The message stays in its own channel.
    const elsewhere = (await client.from("discard_messages").select("*").eq("channel_id", ANNOUNCEMENTS_CHANNEL_ID)).data as Array<{ id: string }>;
    expect(elsewhere.map((m) => m.id)).not.toContain(sentRow.id);
  });

  it("forgets writes when the page reloads", async () => {
    const first = demo();
    await first.from("discard_messages").insert({ channel_id: GENERAL_CHANNEL_ID, user_id: test1.id, content: "temporary" });
    const reloaded = demo();
    const rows = (await reloaded.from("discard_messages").select("*").eq("channel_id", GENERAL_CHANNEL_ID)).data as Array<{ content: string }>;
    expect(rows.map((m) => m.content)).not.toContain("temporary");
  });

  it("keeps an installed game and reads it back for the same account", async () => {
    const client = demo();
    const install = { user_id: test1.id, game_id: "gn-math-2" };
    await client.from("installed_games").upsert(install, { onConflict: "user_id,game_id", ignoreDuplicates: true });
    // Installing twice is a no-op, not a duplicate row.
    await client.from("installed_games").upsert(install, { onConflict: "user_id,game_id", ignoreDuplicates: true });
    const ids = ((await client.from("installed_games").select("game_id").eq("user_id", test1.id)).data as Array<{ game_id: string }>).map((r) => r.game_id);
    expect(ids).toContain("gn-math-2");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("answers the owner RPCs for the signed-in account", async () => {
    const client = demo();
    expect((await client.rpc("discard_is_server_owner", { _server: DEMO_SERVER_ID })).data).toBe(true);
    expect((await client.rpc("discard_is_server_owner", { _server: PUBLIC_SERVER_ID })).data).toBe(false);
    expect((await client.rpc("discard_is_coowner", { _u: test1.id })).data).toBe(false);
    expect((await client.rpc("discard_rank", { _u: test1.id })).data).toBe(3);
    expect((await client.rpc("discard_is_owner", { _u: test2.id })).data).toBe(false);
    expect((await client.rpc("discard_can_see_server", { _server: DEMO_SERVER_ID, _user: test2.id })).data).toBe(true);
    expect((await client.rpc("discard_are_friends", { _a: test1.id, _b: test2.id })).data).toBe(true);
    expect((await client.rpc("club_pass_ping")).data).toBe(0);
    expect((await client.rpc("turkey_status")).data).toMatchObject({ active: false, targets: [] });
  });

  it("joins a server by invite code and reports bad codes as errors", async () => {
    const client = demo();
    const joined = await client.rpc("discard_join_by_code", { _code: "lounge" });
    expect(joined.data).toBe(PUBLIC_SERVER_ID);
    const bad = (await client.rpc("discard_join_by_code", { _code: "NOPE" })) as unknown as Res;
    expect(bad.error?.message).toMatch(/invite code/);
  });

  it("toggles a channel pin and returns the new state", async () => {
    const client = demo();
    const messageId = ((await client.from("discard_messages").select("id, pinned").eq("channel_id", GENERAL_CHANNEL_ID).eq("pinned", true)).data as Array<{ id: string }>)[0]?.id ?? "";
    expect(messageId).not.toBe("");
    expect((await client.rpc("discard_toggle_pin", { _kind: "channel", _id: messageId })).data).toBe(false);
    expect((await client.rpc("discard_toggle_pin", { _kind: "channel", _id: messageId })).data).toBe(true);
  });

  it("answers poll and lublox RPC shapes", async () => {
    const client = demo();
    const votes = (await client.from("discard_poll_votes").select("poll_id, user_id, option").in("poll_id", [POLL_ID])).data as unknown[];
    expect(votes).toHaveLength(2);
    expect((await client.rpc("lublox_can_create")).data).toBe(true);
    expect(typeof (await client.rpc("lublox_plot_price")).data).toBe("number");
  });
});

describe("demo fixtures: consistency", () => {
  const discard = discardFixtures(PEOPLE, Date.now());
  const club = clubFixtures(PEOPLE, Date.now());
  const media = mediaFixtures(PEOPLE, Date.now());
  const apps = gameFixtures(PEOPLE, Date.now());
  const all: DemoRows = { ...discard, ...club, ...media, ...apps };

  const ids = (table: string, column: string) => new Set((all[table] ?? []).map((r) => String(r[column])));
  const expectInSet = (table: string, column: string, valid: Set<string>) => {
    for (const row of all[table] ?? []) {
      const value = row[column];
      if (value === null || value === undefined) continue;
      expect(valid.has(String(value)), `${table}.${column} = ${String(value)}`).toBe(true);
    }
  };

  it("uses only the two demo accounts for every user column", () => {
    const accounts = new Set(ACCOUNT_IDS);
    for (const table of Object.keys(all)) {
      for (const column of ["user_id", "owner_id", "requester_id", "addressee_id", "sender_id", "recipient_id", "from_user", "to_user", "creator_id", "follower_id", "following_id"]) {
        // owner_id may be null (the public server); expectInSet skips null.
        const hasColumn = (all[table] ?? []).some((r) => column in r);
        if (hasColumn) expectInSet(table, column, accounts);
      }
    }
  });

  it("links channels, messages, polls and votes to rows that exist", () => {
    expectInSet("discard_channels", "server_id", ids("discard_servers", "id"));
    expectInSet("discard_members", "server_id", ids("discard_servers", "id"));
    expectInSet("discard_messages", "channel_id", ids("discard_channels", "id"));
    expectInSet("discard_polls", "channel_id", ids("discard_channels", "id"));
    expectInSet("discard_poll_votes", "poll_id", ids("discard_polls", "id"));
  });

  it("links TikiTaki, Longform and Music rows that exist", () => {
    expectInSet("tikitaki_likes", "post_id", ids("tikitaki_posts", "id"));
    expectInSet("tikitaki_comments", "post_id", ids("tikitaki_posts", "id"));
    expectInSet("music_tracks", "playlist_id", ids("music_playlists", "id"));
  });

  it("gives every server a member for its owner", () => {
    for (const server of all.discard_servers ?? []) {
      if (server.owner_id === null) continue;
      const member = (all.discard_members ?? []).some((m) => m.server_id === server.id && m.user_id === server.owner_id);
      expect(member, `owner of ${String(server.name)} is a member`).toBe(true);
    }
  });

  it("keeps one profile per account and one wallet, bird, and pass row per account", () => {
    for (const table of ["discard_profiles", "club_wallets", "club_birds"]) {
      const userIds = (all[table] ?? []).map((r) => r.user_id);
      expect(new Set(userIds).size, table).toBe(userIds.length);
      expect(userIds.sort(), table).toEqual([...ACCOUNT_IDS].sort());
    }
    const passUsers = (all.club_pass ?? []).map((r) => r.user_id);
    expect(new Set(passUsers).size).toBe(passUsers.length);
  });

  it("only installs games that exist in the game catalogue", () => {
    const catalogue = new Set(GAMES.map((g) => g.id));
    for (const row of all.installed_games ?? []) {
      expect(catalogue.has(String(row.game_id)), String(row.game_id)).toBe(true);
    }
  });

  it("publishes a Lublox world that passes the world schema", () => {
    for (const game of all.lublox_games ?? []) {
      expect(worldSchema.safeParse(game.blocks).success, String(game.title)).toBe(true);
    }
  });
});
