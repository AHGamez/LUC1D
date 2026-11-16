import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

/* Stubbed before the component module loads, so its sound uses the fake. */
const calls = vi.hoisted(() => {
  const state = { plays: 0 };
  class FakeAudio {
    preload = "";
    volume = 1;
    currentTime = 0;
    src: string;
    constructor(src: string) {
      this.src = src;
    }
    load() {}
    addEventListener() {}
    pause() {}
    play() {
      state.plays++;
      return Promise.resolve();
    }
  }
  (globalThis as unknown as Record<string, unknown>)["Audio"] = FakeAudio;
  return state;
});

vi.stubGlobal("requestAnimationFrame", () => 0);
vi.stubGlobal("cancelAnimationFrame", () => {});
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import BootIntro from "@/shell/extras/BootIntro";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  calls.plays = 0;
});

describe("Startup entry prompt", () => {
  it("waits on 'click to enter' and only then starts the animation and the sound", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root?.render(<BootIntro soundUrl="intro.mp3" />));

    expect(container.textContent).toContain("click to enter");
    expect(container.querySelector(".bi-spin")).toBeNull();
    expect(calls.plays).toBe(0);

    const gate = container.querySelector<HTMLElement>('[aria-label="Click to enter"]');
    expect(gate).not.toBeNull();
    act(() => gate?.click());

    expect(container.querySelector(".bi-spin")).not.toBeNull();
    expect(calls.plays).toBe(1);
    expect(container.textContent).not.toContain("click to enter");
  });
});
