import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleDeleteAccount } from "../../../server/handlers/accountAdmin";
import { handleSendEveryonePush } from "../../../server/handlers/push";

const ENV_KEYS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PUBLISHABLE_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function setEnv() {
  process.env["SUPABASE_URL"] = "https://example.supabase.co";
  process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-key";
  process.env["SUPABASE_PUBLISHABLE_KEY"] = "test-publishable-key";
  process.env["VAPID_PRIVATE_KEY"] = "test-vapid-private";
  process.env["VAPID_SUBJECT"] = "mailto:test@example.com";
}

const req = (path: string, init: RequestInit) => new Request(`http://localhost${path}`, init);

describe("account delete handler", () => {
  it("refuses when not configured", async () => {
    for (const k of ENV_KEYS) delete process.env[k];
    const res = await handleDeleteAccount(req("/api/account/delete", { method: "POST" }));
    expect(res.status).toBe(503);
  });

  it("requires a bearer token", async () => {
    setEnv();
    const res = await handleDeleteAccount(
      req("/api/account/delete", { method: "POST", body: JSON.stringify({ target: "00000000-0000-4000-8000-000000000000" }) }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects GET", async () => {
    setEnv();
    const res = await handleDeleteAccount(req("/api/account/delete", { method: "GET" }));
    expect(res.status).toBe(405);
  });
});

describe("everyone push handler", () => {
  it("refuses when VAPID is not configured", async () => {
    setEnv();
    delete process.env["VAPID_PRIVATE_KEY"];
    const res = await handleSendEveryonePush(req("/api/push/everyone", { method: "POST" }));
    expect(res.status).toBe(503);
  });

  it("requires a bearer token", async () => {
    setEnv();
    const res = await handleSendEveryonePush(
      req("/api/push/everyone", { method: "POST", body: JSON.stringify({ text: "hi", sender: "me" }) }),
    );
    expect(res.status).toBe(401);
  });
});
