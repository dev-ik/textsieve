import { describe, expect, it } from "vitest";
import { createSieve, en, ru } from "../packages/textsieve/src/index.js";

describe("textsieve convenience package", () => {
  it("re-exports the engine and both language packs", () => {
    const sieve = createSieve({
      languagePacks: [ru, en],
      safetyLanguages: ["ru", "en"],
      transliteration: { enabled: true, targets: ["ru"] },
      preset: "public-form"
    });

    expect(sieve.inspect("ты cyka").decision).toBe("reject");
  });
});
