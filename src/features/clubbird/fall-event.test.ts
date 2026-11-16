import { describe, expect, it } from "vitest";
import { enabledPets, huntWindow, HUNT_INTERVAL_MS, TURKEY_MIN_CENTS, TURKEY_MAX_CENTS } from "./fall-event";
describe("fall hunts", () => {
  it("starts a new event every two hours", () => {
    expect(HUNT_INTERVAL_MS).toBe(7200000);
    expect(huntWindow(7200000).start).toBe(7200000);
    expect(huntWindow(7199999).next).toBe(7200000);
  });
  it("rewards are between 0.10 and 10 Turkey Coins", () => {
    expect(TURKEY_MIN_CENTS / 100).toBe(0.10);
    expect(TURKEY_MAX_CENTS / 100).toBe(10);
  });
  it("never displays disabled Shimejis", () => {
    expect(enabledPets(["pet-turkey", "pet-stickman"], ["pet-turkey"], false)).toEqual(["pet-stickman"]);
  });
  it("phone mode limits active pets without changing computer selections", () => {
    expect(enabledPets(["a", "b", "c"], [], true)).toEqual(["a", "b"]);
    expect(enabledPets(["a", "b", "c"], [], false)).toEqual(["a", "b", "c"]);
  });
});