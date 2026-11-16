import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

vi.mock("./supabase", async () => {
  const { createDemoSupabase } = await import("./demoSupabase");
  return { supabase: createDemoSupabase() };
});

import { SessionProvider, useSession, type SessionState } from "./session";
import { DEMO_ACCOUNTS } from "./demoSupabase";

let api: SessionState | null = null;
function Probe() {
  api = useSession();
  return null;
}

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });
let root: Root | null = null;
afterEach(() => { if (root) act(() => root!.unmount()); root = null; });

describe("SessionProvider with the demo client", () => {
  it("signs in on load and clears the user on sign-out", async () => {
    localStorage.clear();
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(<SessionProvider><Probe /></SessionProvider>));
    await flush();
    expect(api!.user?.id).toBe(DEMO_ACCOUNTS[0].id);
    await act(async () => { await api!.signOut(); });
    await flush();
    expect(api!.user).toBeNull();
  });
});
