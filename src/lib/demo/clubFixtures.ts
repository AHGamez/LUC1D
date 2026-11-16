import { demoId, minutesAgo, type DemoPeople, type DemoRows } from "./shared";

/**
 * Club Bird and Battle Pass fixtures. Item ids match src/features/clubbird/club-items.ts and the
 * Lublox item list. Balances are earned minus spent, so money shown here adds up.
 */
export function clubFixtures(p: DemoPeople, now: number): DemoRows {
  const at = (m: number) => minutesAgo(now, m);
  const owned = (user: string, items: string[], minsAgo: number) => items.map((item_id) => ({ user_id: user, item_id, bought_at: at(minsAgo) }));

  return {
    club_wallets: [
      { user_id: p.one, earned_cents: 9000, spent_cents: 4900, messages: 14 },
      { user_id: p.two, earned_cents: 2100, spent_cents: 800, messages: 9 },
    ],
    club_owned: [
      ...owned(
        p.one,
        ["ring-nebula", "color-blue", "hat-cap", "hat-shades", "tag-goat", "tag-chirpy", "pet-turkey", "lbxhat-tophat", "lbxshirt-black"],
        60 * 24,
      ),
      ...owned(p.two, ["color-pink", "hat-cap", "tag-chirpy", "lbxhat-cap", "lbxshirt-red"], 60 * 24),
    ],
    club_birds: [
      { user_id: p.one, color: "color-blue", hat: "hat-shades", tag: "tag-goat" },
      { user_id: p.two, color: "color-pink", hat: "hat-cap", tag: "none" },
    ],
    // Only Blank Test 1 has bought the Battle Pass, so Test 2 sees the buy screen.
    club_pass: [
      {
        user_id: p.one,
        xp: 340,
        claimed: [1],
        bought_at: at(5 * 24 * 60),
        last_ping: at(2),
        streak_start: at(2 * 24 * 60),
      },
    ],
    // One open offer from Test 2 to Test 1, so the trade centre has something to answer.
    club_trades: [
      {
        id: demoId("7a000001", 1),
        from_user: p.two,
        to_user: p.one,
        give_cents: 0,
        give_items: ["color-pink"],
        want_cents: 300,
        want_items: ["hat-shades"],
        status: "pending",
        created_at: at(25),
      },
    ],
  };
}
