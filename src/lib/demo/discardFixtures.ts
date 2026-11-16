import { demoId, minutesAgo, type DemoPeople, type DemoRows } from "./shared";

/** Fixed ids, so tests and other fixtures can refer to the same rows. */
export const DEMO_SERVER_ID = demoId("5e000001", 1);
export const PUBLIC_SERVER_ID = demoId("5e000001", 2);
export const GENERAL_CHANNEL_ID = demoId("c4000001", 1);
export const ANNOUNCEMENTS_CHANNEL_ID = demoId("c4000001", 2);
export const VOICE_CHANNEL_ID = demoId("c4000001", 3);
export const PUBLIC_GENERAL_CHANNEL_ID = demoId("c4000001", 4);
export const POLL_ID = demoId("b0000001", 1);

/**
 * Discard fixtures for both demo accounts: one private server owned by Blank Test 1, one public
 * server with no owner, the messages and DMs between the two accounts, a poll, an announcement,
 * friends and profiles. Times are relative to `now`, so messages stay inside the two-hour window.
 */
export function discardFixtures(p: DemoPeople, now: number): DemoRows {
  const at = (m: number) => minutesAgo(now, m);
  const day = 24 * 60;

  const msg = (n: number, channel: string, user: string, content: string, minsAgo: number, pinned = false) => ({
    id: demoId("3e000001", n),
    channel_id: channel,
    user_id: user,
    content,
    image_path: null,
    pinned,
    created_at: at(minsAgo),
  });

  const dm = (n: number, sender: string, recipient: string, content: string, minsAgo: number) => ({
    id: demoId("dd000001", n),
    sender_id: sender,
    recipient_id: recipient,
    content,
    image_path: null,
    pinned: false,
    created_at: at(minsAgo),
  });

  return {
    discard_profiles: [
      {
        user_id: p.one,
        display_name: "Blank Test 1",
        avatar_color: "#e5484d",
        status: "Testing the demo",
        avatar_path: null,
        avatar_decoration: "ring-nebula",
        banner: "blurple",
        banner_path: null,
        name_effect: "stars",
        created_at: at(3 * day),
        updated_at: at(30),
      },
      {
        user_id: p.two,
        display_name: "Blank Test 2",
        avatar_color: "#3e8ef7",
        status: "",
        avatar_path: null,
        avatar_decoration: "none",
        banner: "sunset",
        banner_path: null,
        name_effect: "none",
        created_at: at(3 * day),
        updated_at: at(45),
      },
    ],
    discard_chat_tags: [{ user_id: p.one, tag: "owner" }],
    discard_day_one_tags: [{ user_id: p.one }, { user_id: p.two }],
    // Moderator rows are visible only to the moderator (see demoSupabase.ts), as the tests expect.
    discard_moderators: [{ user_id: p.one, coowner: false, granted_at: at(3 * day) }],
    discard_servers: [
      { id: DEMO_SERVER_ID, name: "Demo Server", icon: "🦃", owner_id: p.one, is_public: false, invite_code: "DEMO", created_at: at(3 * day) },
      { id: PUBLIC_SERVER_ID, name: "Open Lounge", icon: "🎮", owner_id: null, is_public: true, invite_code: "LOUNGE", created_at: at(2 * day) },
    ],
    discard_members: [
      { server_id: DEMO_SERVER_ID, user_id: p.one, joined_at: at(3 * day) },
      { server_id: DEMO_SERVER_ID, user_id: p.two, joined_at: at(2 * day) },
      { server_id: PUBLIC_SERVER_ID, user_id: p.two, joined_at: at(2 * day) },
    ],
    discard_channels: [
      { id: GENERAL_CHANNEL_ID, server_id: DEMO_SERVER_ID, name: "general", created_at: at(3 * day) },
      { id: ANNOUNCEMENTS_CHANNEL_ID, server_id: DEMO_SERVER_ID, name: "announcements", created_at: at(3 * day) },
      { id: VOICE_CHANNEL_ID, server_id: DEMO_SERVER_ID, name: "voice-lounge", created_at: at(3 * day) },
      { id: PUBLIC_GENERAL_CHANNEL_ID, server_id: PUBLIC_SERVER_ID, name: "general", created_at: at(2 * day) },
    ],
    discard_messages: [
      msg(1, GENERAL_CHANNEL_ID, p.one, "Welcome to Demo Server. Everything here is sample data, so post away.", 58, true),
      msg(2, GENERAL_CHANNEL_ID, p.two, "Thanks! Is the voice lounge open?", 46),
      msg(3, GENERAL_CHANNEL_ID, p.one, "Always. Hit the headset icon at the top of the channel to join.", 44),
      msg(4, GENERAL_CHANNEL_ID, p.two, "Nice. I like the new polls too.", 21),
      msg(5, GENERAL_CHANNEL_ID, p.one, "Pinned messages stay put past the two-hour window.", 9),
      msg(6, ANNOUNCEMENTS_CHANNEL_ID, p.one, "Demo mode: nothing you send is saved after a reload.", 75),
      msg(7, PUBLIC_GENERAL_CHANNEL_ID, p.two, "Anyone up for a round of Bowmasters tonight?", 33),
    ],
    discard_dms: [
      dm(1, p.two, p.one, "Did the Club Bird balance update after your messages?", 40),
      dm(2, p.one, p.two, "Yep. Each message you send adds to your earnings.", 36),
      dm(3, p.two, p.one, "Cool. Want to play a round later?", 30),
    ],
    discard_friends: [
      {
        id: demoId("f1000001", 1),
        requester_id: p.one,
        addressee_id: p.two,
        status: "accepted",
        created_at: at(2 * day),
      },
    ],
    discard_polls: [
      {
        id: POLL_ID,
        channel_id: GENERAL_CHANNEL_ID,
        user_id: p.one,
        question: "Pizza or tacos tonight?",
        options: ["Pizza", "Tacos"],
        created_at: at(15),
      },
    ],
    discard_poll_votes: [
      { poll_id: POLL_ID, user_id: p.one, option: 0 },
      { poll_id: POLL_ID, user_id: p.two, option: 1 },
    ],
    discard_announcements: [
      {
        id: demoId("a0000001", 1),
        user_id: p.one,
        content: "Demo server: the data here is sample data and resets when the page reloads.",
        sitewide: false,
        created_at: at(90),
      },
    ],
    discard_sanctions: [],
  };
}
