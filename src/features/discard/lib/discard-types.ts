import type { Database } from "../../../lib/database.types";

type Tables = Database["public"]["Tables"];

export type Server = Pick<Tables["discard_servers"]["Row"], "id" | "name" | "icon" | "owner_id" | "is_public" | "invite_code">;
export type Channel = Pick<Tables["discard_channels"]["Row"], "id" | "server_id" | "name">;
export type Message = Tables["discard_messages"]["Row"];
export type Dm = Tables["discard_dms"]["Row"];
export type Friend = Pick<Tables["discard_friends"]["Row"], "id" | "requester_id" | "addressee_id" | "status">;
export type Announcement = Pick<Tables["discard_announcements"]["Row"], "id" | "content" | "created_at" | "user_id">;
export type Poll = Pick<Tables["discard_polls"]["Row"], "id" | "question" | "options" | "created_at">;
export type PollVote = Tables["discard_poll_votes"]["Row"];
export type Sanction = Pick<Tables["discard_sanctions"]["Row"], "user_id" | "kind" | "until">;

/** A profile as shown in Discard: the saved row plus signed picture URL and the verified tags. */
export interface Profile {
  user_id: string;
  display_name: string;
  avatar_color: string;
  status: string;
  avatar_path: string | null;
  avatar_decoration: string;
  avatar_url: string | null;
  /** Preset banner id (see BANNERS). Ignored when a custom banner is set. */
  banner: string;
  banner_path: string | null;
  /** Signed URL for the custom banner, when one is set. */
  banner_url?: string | null | undefined;
  /** Name effect id (see NAME_EFFECTS). */
  name_effect: string;
  /** Real account creation time, copied from the auth account by the database. Not writable by the client trigger path. */
  created_at: string;
  /** "owner" | "coowner" | "mod" when verified, otherwise undefined. */
  tag?: string | undefined;
  /** Verified Mod Management tag (discard_chat_tags, granted by the database only). */
  modMgmt?: boolean | undefined;
  dayOne: boolean;
  /** Club Bird chat tag id (e.g. "tag-tuffboi"), when bought or granted and worn. */
  shopTag?: string | undefined;
}

/** Messages stay visible for two hours unless pinned. */
export const EXPIRY_MS = 2 * 60 * 60 * 1000;
