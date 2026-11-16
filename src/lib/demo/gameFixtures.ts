import { STARTER } from "../../features/lublox/lublox";
import { demoId, minutesAgo, type DemoPeople, type DemoRows } from "./shared";

/**
 * Installed games (ids from src/features/stem/games.ts, checked in demoSupabase.test.ts) and the Lublox
 * world and avatars. The world uses the starter blocks from lublox.ts, so it passes the world schema.
 */
export function gameFixtures(p: DemoPeople, now: number): DemoRows {
  const at = (m: number) => minutesAgo(now, m);
  return {
    installed_games: [
      { user_id: p.one, game_id: "gn-math-0", installed_at: at(3 * 24 * 60) },
      { user_id: p.one, game_id: "gn-math-1", installed_at: at(3 * 24 * 60) },
      { user_id: p.one, game_id: "55gms:10-minutes-til-dawn", installed_at: at(2 * 24 * 60) },
      { user_id: p.two, game_id: "gn-math-1", installed_at: at(24 * 60) },
      { user_id: p.two, game_id: "fiveplay-launcher", installed_at: at(12 * 60) },
    ],
    lublox_games: [
      {
        id: demoId("1b000001", 1),
        title: "Tower Run",
        description: "Jump the platforms and reach the goal.",
        creator_id: p.one,
        published: true,
        blocks: STARTER,
        created_at: at(4 * 24 * 60),
      },
    ],
    lublox_avatars: [
      { user_id: p.one, hat: "lbxhat-tophat", shirt: "lbxshirt-black", pants: "none", updated_at: at(60) },
      { user_id: p.two, hat: "lbxhat-cap", shirt: "lbxshirt-red", pants: "none", updated_at: at(60) },
    ],
  };
}
