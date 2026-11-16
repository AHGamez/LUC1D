import { describe, expect, it } from "vitest";
import { filterOptions, mentionState, ownedTags, splitMentions } from "./chat-mentions";

describe("@t opens the tag list, plain @ opens the member list", () => {
  it("treats @t as a tag search", () => {
    expect(mentionState("@t", 2)).toMatchObject({ mode: "tags", query: "", start: 0 });
    expect(mentionState("hey @tga", 9)).toMatchObject({ mode: "tags", query: "ga", start: 4 });
  });

  it("treats a plain @ as a member search", () => {
    expect(mentionState("@sa", 3)).toMatchObject({ mode: "members", query: "sa", start: 0 });
  });

  it("stops after a space so @everyone still types out", () => {
    expect(mentionState("@everyone there", 15)).toBeNull();
    expect(mentionState("hi there", 8)).toBeNull();
  });
});

describe("people can only wear tags they already own", () => {
  it("lists only the chat tags they own", () => {
    expect(ownedTags(["tag-gamer", "ring-nebula", "tag-whale"]).map((t) => t.id)).toEqual(["tag-gamer", "tag-whale"]);
    expect(ownedTags([])).toEqual([]);
    expect(ownedTags(["tag-legend"]).map((t) => t.name)).toEqual(["Legend"]);
  });

  it("never offers a tag the person does not own", () => {
    expect(filterOptions(ownedTags(["tag-chirpy"]), "", "tags").map((o) => o.id)).toEqual(["tag-chirpy"]);
  });
});

describe("mentions are highlighted in sent messages", () => {
  it("marks @name segments that match a member", () => {
    expect(splitMentions("yo @st4x check this", ["st4x"])).toEqual([
      { text: "yo ", mention: false },
      { text: "@st4x", mention: true },
      { text: " check this", mention: false },
    ]);
  });

  it("leaves messages without mentions alone", () => {
    expect(splitMentions("nothing here", ["st4x"])).toEqual([{ text: "nothing here", mention: false }]);
  });
});
