import { describe, expect, it } from "vitest";
import { AhoCorasick } from "../src/matching/aho-corasick.js";

describe("AhoCorasick", () => {
  it("finds overlapping patterns and preserves metadata", () => {
    const matcher = new AhoCorasick([
      { pattern: "he", metadata: "he" },
      { pattern: "she", metadata: "she" },
      { pattern: "hers", metadata: "hers" }
    ]);

    expect(matcher.search("ushers")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pattern: "she", metadata: "she" }),
        expect.objectContaining({ pattern: "he", metadata: "he" }),
        expect.objectContaining({ pattern: "hers", metadata: "hers" })
      ])
    );
  });

  it("handles an empty pattern set", () => {
    expect(new AhoCorasick([]).search("anything")).toEqual([]);
  });
});
