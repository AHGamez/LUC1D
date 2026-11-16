export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ad_slots: {
        Row: {
          body: string
          bought_at: string
          image_path: string
          paid_with: string
          slot: number
          stripe_session: string | null
          user_id: string
        }
        Insert: {
          body: string
          bought_at?: string
          image_path: string
          paid_with: string
          slot: number
          stripe_session?: string | null
          user_id: string
        }
        Update: {
          body?: string
          bought_at?: string
          image_path?: string
          paid_with?: string
          slot?: number
          stripe_session?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bikelife_payouts: {
        Row: {
          cents: number
          day: string
          last_at: string
          user_id: string
        }
        Insert: {
          cents?: number
          day: string
          last_at?: string
          user_id: string
        }
        Update: {
          cents?: number
          day?: string
          last_at?: string
          user_id?: string
        }
        Relationships: []
      }
      club_birds: {
        Row: {
          color: string
          hat: string
          tag: string
          user_id: string
        }
        Insert: {
          color?: string
          hat?: string
          tag?: string
          user_id: string
        }
        Update: {
          color?: string
          hat?: string
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
      club_grants: {
        Row: {
          cents: number
          created_at: string
          from_user: string
          id: string
          to_user: string
        }
        Insert: {
          cents: number
          created_at?: string
          from_user: string
          id?: string
          to_user: string
        }
        Update: {
          cents?: number
          created_at?: string
          from_user?: string
          id?: string
          to_user?: string
        }
        Relationships: []
      }
      club_owned: {
        Row: {
          bought_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          bought_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          bought_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: []
      }
      club_pass: {
        Row: {
          bought_at: string
          claimed: number[]
          last_ping: string | null
          streak_start: string | null
          user_id: string
          xp: number
        }
        Insert: {
          bought_at?: string
          claimed?: number[]
          last_ping?: string | null
          streak_start?: string | null
          user_id: string
          xp?: number
        }
        Update: {
          bought_at?: string
          claimed?: number[]
          last_ping?: string | null
          streak_start?: string | null
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      club_trades: {
        Row: {
          created_at: string
          from_user: string
          give_cents: number
          give_items: string[]
          id: string
          status: string
          to_user: string
          want_cents: number
          want_items: string[]
        }
        Insert: {
          created_at?: string
          from_user: string
          give_cents?: number
          give_items?: string[]
          id?: string
          status?: string
          to_user: string
          want_cents?: number
          want_items?: string[]
        }
        Update: {
          created_at?: string
          from_user?: string
          give_cents?: number
          give_items?: string[]
          id?: string
          status?: string
          to_user?: string
          want_cents?: number
          want_items?: string[]
        }
        Relationships: []
      }
      club_wallets: {
        Row: {
          earned_cents: number
          messages: number
          spent_cents: number
          user_id: string
        }
        Insert: {
          earned_cents?: number
          messages?: number
          spent_cents?: number
          user_id: string
        }
        Update: {
          earned_cents?: number
          messages?: number
          spent_cents?: number
          user_id?: string
        }
        Relationships: []
      }
      discard_announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          sitewide: boolean
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sitewide?: boolean
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sitewide?: boolean
          user_id?: string
        }
        Relationships: []
      }
      discard_channels: {
        Row: {
          created_at: string
          id: string
          name: string
          server_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          server_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discard_channels_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "discard_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discard_chat_tags: {
        Row: {
          tag: string
          user_id: string
        }
        Insert: {
          tag?: string
          user_id: string
        }
        Update: {
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
      discard_day_one_tags: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      discard_dms: {
        Row: {
          content: string
          created_at: string
          id: string
          image_path: string | null
          pinned: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_path?: string | null
          pinned?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_path?: string | null
          pinned?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      discard_friends: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      discard_members: {
        Row: {
          joined_at: string
          server_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          server_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discard_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "discard_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discard_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          image_path: string | null
          pinned: boolean
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          image_path?: string | null
          pinned?: boolean
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          image_path?: string | null
          pinned?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discard_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "discard_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      discard_moderators: {
        Row: {
          coowner: boolean
          granted_at: string
          user_id: string
        }
        Insert: {
          coowner?: boolean
          granted_at?: string
          user_id: string
        }
        Update: {
          coowner?: boolean
          granted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discard_poll_votes: {
        Row: {
          option: number
          poll_id: string
          user_id: string
        }
        Insert: {
          option: number
          poll_id: string
          user_id?: string
        }
        Update: {
          option?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discard_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "discard_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      discard_polls: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          options: string[]
          question: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          options: string[]
          question: string
          user_id?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          options?: string[]
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discard_polls_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "discard_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      discard_profiles: {
        Row: {
          avatar_color: string
          avatar_decoration: string
          avatar_path: string | null
          banner: string
          banner_path: string | null
          created_at: string
          display_name: string
          name_effect: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_color?: string
          avatar_decoration?: string
          avatar_path?: string | null
          banner?: string
          banner_path?: string | null
          created_at?: string
          display_name: string
          name_effect?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_color?: string
          avatar_decoration?: string
          avatar_path?: string | null
          banner?: string
          banner_path?: string | null
          created_at?: string
          display_name?: string
          name_effect?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discard_sanctions: {
        Row: {
          by_user: string
          created_at: string
          kind: string
          until: string
          user_id: string
        }
        Insert: {
          by_user: string
          created_at?: string
          kind: string
          until: string
          user_id: string
        }
        Update: {
          by_user?: string
          created_at?: string
          kind?: string
          until?: string
          user_id?: string
        }
        Relationships: []
      }
      discard_servers: {
        Row: {
          created_at: string
          icon: string
          id: string
          invite_code: string
          is_public: boolean
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          invite_code?: string
          is_public?: boolean
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          invite_code?: string
          is_public?: boolean
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      donation_claims: {
        Row: {
          cents: number
          claimed_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          cents: number
          claimed_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          cents?: number
          claimed_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      installed_games: {
        Row: {
          game_id: string
          installed_at: string
          user_id: string
        }
        Insert: {
          game_id: string
          installed_at?: string
          user_id: string
        }
        Update: {
          game_id?: string
          installed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      larp_battles: {
        Row: {
          challenger_flex: string
          challenger_id: string
          challenger_image: string | null
          challenger_score: number | null
          created_at: string
          id: string
          opponent_flex: string | null
          opponent_id: string | null
          opponent_image: string | null
          opponent_score: number | null
          status: string
          topic: string
          updated_at: string
          verdict: string | null
          winner_id: string | null
        }
        Insert: {
          challenger_flex?: string
          challenger_id: string
          challenger_image?: string | null
          challenger_score?: number | null
          created_at?: string
          id?: string
          opponent_flex?: string | null
          opponent_id?: string | null
          opponent_image?: string | null
          opponent_score?: number | null
          status?: string
          topic?: string
          updated_at?: string
          verdict?: string | null
          winner_id?: string | null
        }
        Update: {
          challenger_flex?: string
          challenger_id?: string
          challenger_image?: string | null
          challenger_score?: number | null
          created_at?: string
          id?: string
          opponent_flex?: string | null
          opponent_id?: string | null
          opponent_image?: string | null
          opponent_score?: number | null
          status?: string
          topic?: string
          updated_at?: string
          verdict?: string | null
          winner_id?: string | null
        }
        Relationships: []
      }
      longform_videos: {
        Row: {
          app: string
          category: string
          created_at: string
          description: string
          id: string
          path: string
          title: string
          user_id: string
        }
        Insert: {
          app: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          path: string
          title: string
          user_id?: string
        }
        Update: {
          app?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          path?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      lounge_afk_sessions: {
        Row: {
          active: boolean
          earned_cents: number
          last_ping: string
          seconds: number
          session_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          earned_cents?: number
          last_ping?: string
          seconds?: number
          session_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          earned_cents?: number
          last_ping?: string
          seconds?: number
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      lublox_ai_usage: {
        Row: {
          day: string
          used: number
          user_id: string
        }
        Insert: {
          day: string
          used?: number
          user_id: string
        }
        Update: {
          day?: string
          used?: number
          user_id?: string
        }
        Relationships: []
      }
      lublox_avatars: {
        Row: {
          hat: string
          pants: string
          shirt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          hat?: string
          pants?: string
          shirt?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          hat?: string
          pants?: string
          shirt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lublox_builders: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lublox_games: {
        Row: {
          blocks: Json
          created_at: string
          creator_id: string
          description: string
          id: string
          published: boolean
          title: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          published?: boolean
          title?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          published?: boolean
          title?: string
        }
        Relationships: []
      }
      lublox_plots: {
        Row: {
          bought_at: string
          house: string
          plot: number
          user_id: string
        }
        Insert: {
          bought_at?: string
          house: string
          plot: number
          user_id: string
        }
        Update: {
          bought_at?: string
          house?: string
          plot?: number
          user_id?: string
        }
        Relationships: []
      }
      music_playlists: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      music_tracks: {
        Row: {
          created_at: string
          id: string
          path: string
          playlist_id: string
          position: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          playlist_id: string
          position?: number
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          playlist_id?: string
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "music_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      push_everyone_log: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      tikitaki_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tikitaki_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tikitaki_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      tikitaki_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      tikitaki_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tikitaki_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tikitaki_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      tikitaki_posts: {
        Row: {
          caption: string
          created_at: string
          id: string
          user_id: string
          video_path: string
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          user_id: string
          video_path: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          user_id?: string
          video_path?: string
        }
        Relationships: []
      }
      tikitaki_profiles: {
        Row: {
          avatar_path: string | null
          banner_color: string
          banner_path: string | null
          bio: string
          handle: string
          links: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          banner_color?: string
          banner_path?: string | null
          bio?: string
          handle: string
          links?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          banner_color?: string
          banner_path?: string | null
          bio?: string
          handle?: string
          links?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tuffboi_winner: {
        Row: {
          only_one: boolean
          user_id: string
          won_at: string
        }
        Insert: {
          only_one?: boolean
          user_id: string
          won_at?: string
        }
        Update: {
          only_one?: boolean
          user_id?: string
          won_at?: string
        }
        Relationships: []
      }
      turkey_hunts: {
        Row: {
          event_id: number
          hits: number
          last_hit: string | null
          user_id: string
        }
        Insert: {
          event_id: number
          hits?: number
          last_hit?: string | null
          user_id: string
        }
        Update: {
          event_id?: number
          hits?: number
          last_hit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      turkey_manual_events: {
        Row: {
          ends_at: string
          event_id: number
          started_at: string
          started_by: string
        }
        Insert: {
          ends_at: string
          event_id?: never
          started_at?: string
          started_by: string
        }
        Update: {
          ends_at?: string
          event_id?: never
          started_at?: string
          started_by?: string
        }
        Relationships: []
      }
      turkey_targets: {
        Row: {
          claimed: boolean
          event_id: number
          id: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          claimed?: boolean
          event_id: number
          id?: string
          user_id: string
          x: number
          y: number
        }
        Update: {
          claimed?: boolean
          event_id?: number
          id?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      turkey_wallets: {
        Row: {
          earned_cents: number
          spent_cents: number
          user_id: string
        }
        Insert: {
          earned_cents?: number
          spent_cents?: number
          user_id: string
        }
        Update: {
          earned_cents?: number
          spent_cents?: number
          user_id?: string
        }
        Relationships: []
      }
      xmas_gifts: {
        Row: {
          opened_at: string
          reward: string
          user_id: string
        }
        Insert: {
          opened_at?: string
          reward: string
          user_id: string
        }
        Update: {
          opened_at?: string
          reward?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ad_buy_coins: {
        Args: { _body: string; _image: string; _slot: number }
        Returns: number
      }
      bikelife_cash: { Args: { _cents: number }; Returns: number }
      club_buy: { Args: { _item: string }; Returns: number }
      club_buy_pass: { Args: never; Returns: undefined }
      club_equip: { Args: { _item: string; _slot: string }; Returns: undefined }
      club_grant: {
        Args: { _cents: number; _target: string; _tz?: string }
        Returns: number
      }
      club_owns: { Args: { _item: string; _u: string }; Returns: boolean }
      club_pass_claim: { Args: { _level: number }; Returns: string }
      club_pass_ping: { Args: never; Returns: number }
      club_pass_reward: { Args: { _level: number }; Returns: string }
      club_price: { Args: { _item: string }; Returns: number }
      club_trade_offer: {
        Args: {
          _give_cents: number
          _give_items: string[]
          _to: string
          _want_cents: number
          _want_items: string[]
        }
        Returns: string
      }
      club_trade_respond: {
        Args: { _action: string; _id: string }
        Returns: string
      }
      discard_are_friends: {
        Args: { _a: string; _b: string }
        Returns: boolean
      }
      discard_can_join: { Args: { _server: string }; Returns: boolean }
      discard_can_see_server: {
        Args: { _server: string; _user: string }
        Returns: boolean
      }
      discard_is_coowner: { Args: { _u: string }; Returns: boolean }
      discard_is_day_one: { Args: { _created_at: string }; Returns: boolean }
      donation_claim_reward: { Args: { _cents: number; _reward_cents: number; _session_id: string; _tag: string; _user_id: string }; Returns: boolean }
      discard_is_mod: { Args: { _u: string }; Returns: boolean }
      discard_is_muted: { Args: { _u: string }; Returns: boolean }
      discard_is_owner: { Args: { _u: string }; Returns: boolean }
      discard_is_server_owner: { Args: { _server: string }; Returns: boolean }
      discard_join_by_code: { Args: { _code: string }; Returns: string }
      discard_lift: { Args: { _target: string }; Returns: undefined }
      discard_rank: { Args: { _u: string }; Returns: number }
      discard_sanction: {
        Args: { _days: number; _kind: string; _target: string }
        Returns: string
      }
      discard_set_coowner: {
        Args: { _on: boolean; _target: string }
        Returns: undefined
      }
      discard_set_mod: {
        Args: { _on: boolean; _target: string }
        Returns: undefined
      }
      discard_set_tag: {
        Args: { _on: boolean; _tag: string; _target: string }
        Returns: undefined
      }
      discard_timeout_minutes: {
        Args: { _minutes: number; _target: string }
        Returns: string
      }
      discard_toggle_pin: {
        Args: { _id: string; _kind: string }
        Returns: boolean
      }
      larp_join: {
        Args: { _flex: string; _id: string; _image: string }
        Returns: undefined
      }
      lounge_afk_reward: { Args: { _seconds: number }; Returns: number }
      lounge_afk_tick: {
        Args: { _action?: string; _session: string }
        Returns: Json
      }
      lublox_ai_limit: { Args: never; Returns: number }
      lublox_ai_take: { Args: never; Returns: number }
      lublox_buy_plot: {
        Args: { _house: string; _plot: number }
        Returns: undefined
      }
      lublox_can_create: { Args: never; Returns: boolean }
      lublox_equip: {
        Args: { _item: string; _slot: string }
        Returns: undefined
      }
      lublox_plot_price: { Args: never; Returns: number }
      lublox_set_plot_house: { Args: { _house: string }; Returns: undefined }
      lublox_valid_world: { Args: { _w: Json }; Returns: boolean }
      tuffboi_claim: { Args: never; Returns: boolean }
      turkey_activate: { Args: never; Returns: string }
      turkey_buy: { Args: { _item: string }; Returns: number }
      turkey_can_activate: { Args: never; Returns: boolean }
      turkey_hit: { Args: { _target: string }; Returns: number }
      turkey_price: { Args: { _item: string }; Returns: number }
      turkey_reward_cents: {
        Args: { _amount: number; _tier: number }
        Returns: number
      }
      turkey_status: { Args: never; Returns: Json }
      xmas_access: { Args: { _u: string }; Returns: boolean }
      xmas_gift_open: { Args: never; Returns: string }
      xmas_staff: { Args: { _u: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
