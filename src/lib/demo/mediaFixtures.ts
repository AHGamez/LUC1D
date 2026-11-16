import { demoId, minutesAgo, type DemoPeople, type DemoRows } from "./shared";

/**
 * TikiTaki, Longform and Music fixtures. Video and audio paths point at no real files: the demo storage
 * answers with placeholder URLs that fail to load, so those cards show their error state.
 */
export function mediaFixtures(p: DemoPeople, now: number): DemoRows {
  const at = (m: number) => minutesAgo(now, m);
  const post = (n: number, user: string, caption: string, minsAgo: number) => ({
    id: demoId("7e000001", n),
    user_id: user,
    caption,
    video_path: `${user}/demo-clip-${n}.mp4`,
    created_at: at(minsAgo),
  });

  const playlistId = demoId("91000001", 1);
  const otherPlaylistId = demoId("91000001", 2);

  return {
    tikitaki_posts: [
      post(1, p.one, "First clip on TikiTaki. Placeholder video in demo mode.", 120),
      post(2, p.two, "Another sample upload. Tap the heart to like it.", 60),
      post(3, p.one, "Third post: likes and comments are saved for this page session.", 20),
    ],
    tikitaki_profiles: [
      {
        user_id: p.one,
        handle: "blanktest1",
        bio: "Demo account one. Posts here are sample content.",
        banner_color: "#2b6cb0",
        banner_path: null,
        avatar_path: null,
        links: [],
        updated_at: at(60),
      },
      {
        user_id: p.two,
        handle: "blanktest2",
        bio: "Demo account two.",
        banner_color: "#7c3aed",
        banner_path: null,
        avatar_path: null,
        links: [],
        updated_at: at(60),
      },
    ],
    tikitaki_likes: [
      { post_id: demoId("7e000001", 1), user_id: p.two, created_at: at(50) },
      { post_id: demoId("7e000001", 2), user_id: p.one, created_at: at(40) },
    ],
    tikitaki_comments: [
      {
        id: demoId("c0000001", 1),
        post_id: demoId("7e000001", 1),
        user_id: p.two,
        body: "Love this one.",
        created_at: at(48),
      },
      {
        id: demoId("c0000001", 2),
        post_id: demoId("7e000001", 2),
        user_id: p.one,
        body: "Saved for later.",
        created_at: at(38),
      },
    ],
    tikitaki_follows: [{ follower_id: p.one, following_id: p.two, created_at: at(90) }],

    longform_videos: [
      {
        id: demoId("10000001", 1),
        app: "tube",
        category: "tutorial",
        title: "Getting started with demo mode",
        description: "A sample upload. Nothing is stored in demo mode.",
        path: "demo/tube-1.mp4",
        user_id: p.one,
        created_at: at(6 * 60),
      },
      {
        id: demoId("10000001", 2),
        app: "grime",
        category: "",
        title: "Demo beat session",
        description: "Sample longform entry for the Grime page.",
        path: "demo/grime-1.mp4",
        user_id: p.two,
        created_at: at(3 * 60),
      },
    ],

    music_playlists: [
      { id: playlistId, name: "Study mix", is_public: true, user_id: p.one, created_at: at(2 * 24 * 60) },
      { id: otherPlaylistId, name: "Road trip", is_public: false, user_id: p.two, created_at: at(2 * 24 * 60) },
    ],
    music_tracks: [
      { id: demoId("92000001", 1), playlist_id: playlistId, title: "Sample track one", path: `${p.one}/study-1.mp3`, position: 0, user_id: p.one, created_at: at(2 * 24 * 60) },
      { id: demoId("92000001", 2), playlist_id: playlistId, title: "Sample track two", path: `${p.one}/study-2.mp3`, position: 1, user_id: p.one, created_at: at(2 * 24 * 60) },
      { id: demoId("92000001", 3), playlist_id: otherPlaylistId, title: "Sample drive song", path: `${p.two}/drive-1.mp3`, position: 0, user_id: p.two, created_at: at(2 * 24 * 60) },
    ],
  };
}
