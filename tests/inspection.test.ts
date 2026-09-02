import { describe, expect, it } from "vitest";
import { createSieve, presets } from "../packages/core/src/index.js";
import { en } from "../packages/en/src/index.js";
import { ru } from "../packages/ru/src/index.js";

function configured(overrides: Parameters<typeof createSieve>[0] = {}) {
  return createSieve({
    languagePacks: [ru, en],
    expectedLanguage: "ru",
    safetyLanguages: ["ru", "en"],
    transliteration: { enabled: true, targets: ["ru"] },
    ...overrides
  });
}

describe("TextSieve integration", () => {
  it.each([
    "Я использую React и TypeScript",
    "React/Node.js разработчик",
    "PostgreSQL и OpenAPI",
    "ООО Ромашка",
    "нужно застраховать автомобиль",
    "достопримечательность производительность ответственность",
    "https://example.com/documentation/getting-started?id=123",
    "customer_external_identifier_2026",
    "TypeScript Next.js PostgreSQL OAuth2 OpenAPI pnpm dev-ik"
  ])("allows clean false-positive fixture: %s", (text) => {
    const result = configured().inspect(text);
    expect(result.decision).toBe("allow");
    expect(result.issues.filter((issue) => issue.code === "PROFANITY" || issue.code === "INSULT")).toEqual([]);
  });

  it("keeps expected language separate from safety languages", () => {
    const result = configured().inspect("ах ты bitch");
    expect(result.decision).toBe("reject");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "INSULT", locale: "en", matched: "bitch" })
    );

    const ruSafetyOnly = configured({ safetyLanguages: ["ru"] }).inspect("ах ты bitch");
    expect(ruSafetyOnly.issues.some((issue) => issue.code === "INSULT")).toBe(false);
  });

  it("reports a language mismatch without rejecting Latin fragments in Russian", () => {
    const mismatch = configured().inspect("Hello how are you today");
    expect(mismatch.decision).toBe("review");
    expect(mismatch.issues).toContainEqual(expect.objectContaining({ code: "LANGUAGE_MISMATCH" }));

    const mixed = configured().inspect("Я использую React и TypeScript");
    expect(mixed.issues.some((issue) => issue.code === "LANGUAGE_MISMATCH")).toBe(false);
  });

  it.each([
    ["suka", "сука"],
    ["ты cyka", "сука"],
    ["blyat", "блять"],
    ["nahui", "нахуй"]
  ])("matches transliterated Russian abuse: %s", (text, canonical) => {
    const result = configured().inspect(text);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "PROFANITY",
        locale: "ru",
        metadata: expect.objectContaining({ canonical, source: "translit-ru" })
      })
    );
  });

  it("adds contextual insult evidence without replacing profanity evidence", () => {
    const result = configured().inspect("ты cyka");
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["PROFANITY", "INSULT"]));
  });

  it.each(["тысука", "youbitch"])("recovers a conservative glued insult prefix: %s", (text) => {
    const result = configured().inspect(text);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "INSULT",
        metadata: expect.objectContaining({ recovery: "glued-insult-prefix" })
      })
    );
  });

  it("reviews medium-severity insults and rejects high-severity safety matches", () => {
    expect(configured().inspect("idiot").decision).toBe("review");
    expect(configured().inspect("bitch").decision).toBe("reject");
  });

  it.each(["b i t c h", "b!tch", "bi4ch", "biiiitch", "bich"])(
    "matches bounded English obfuscation: %s",
    (text) => {
      const result = configured().inspect(text);
      expect(result.issues).toContainEqual(expect.objectContaining({ code: "INSULT", locale: "en" }));
    }
  );

  it.each(["б л я т ь", "бл@ть", "бл*ть", "бляяяять"])(
    "matches bounded Russian obfuscation: %s",
    (text) => {
      const result = configured().inspect(text);
      expect(result.issues).toContainEqual(expect.objectContaining({ code: "PROFANITY", locale: "ru" }));
    }
  );

  it("preserves raw input and maps issues back to raw offsets", () => {
    const input = "АХ ТЫ B!TCH";
    const result = configured().inspect(input);
    expect(result.input).toBe(input);
    expect(result.normalized).toBe("ах ты b!tch");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "INSULT", start: 6, end: 11, matched: "B!TCH" })
    );
  });

  it("keeps normalization and sanitization independently visible", () => {
    const result = configured().inspect("  Ｈi\u200B  ");
    expect(result.input).toBe("  Ｈi\u200B  ");
    expect(result.normalized).toBe("  hi\u200B  ");
    expect(result.sanitized).toBe("hi");
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "ZERO_WIDTH_CHARACTERS" }));
  });

  it("flags mixed scripts only inside a token", () => {
    const suspicious = configured().inspect("pаypal");
    expect(suspicious.issues).toContainEqual(
      expect.objectContaining({ code: "MIXED_SCRIPT_TOKEN", start: 0, end: 6 })
    );

    const ordinary = configured().inspect("React разработчик");
    expect(ordinary.issues.some((issue) => issue.code === "MIXED_SCRIPT_TOKEN")).toBe(false);
  });

  it("detects repetition, keyboard smashing and basic gibberish", () => {
    expect(configured().inspect("привееееееет").issues).toContainEqual(
      expect.objectContaining({ code: "CHAR_REPETITION" })
    );
    expect(configured().inspect("hello hello hello hello").issues).toContainEqual(
      expect.objectContaining({ code: "WORD_REPETITION" })
    );
    expect(configured().inspect("asdfghjkl").issues).toContainEqual(expect.objectContaining({ code: "KEYBOARD_SMASH" }));
    expect(configured().inspect("ывпавфыапфыва").issues).toContainEqual(
      expect.objectContaining({ code: "GIBBERISH_HIGH" })
    );
    expect(configured().inspect("купи сейчас купи сейчас купи сейчас").issues).toContainEqual(
      expect.objectContaining({
        code: "WORD_REPETITION",
        metadata: expect.objectContaining({ kind: "repeated-phrase" })
      })
    );
  });

  it.each(["HELLO WORLD", "!!!!!!!!!!", "привет привет привет привет"])(
    "reviews obvious quality abuse: %s",
    (input) => {
      expect(configured().inspect(input).decision).toBe("review");
    }
  );

  it("handles adversarial maximum-length input without unbounded variant growth", () => {
    const input = `${"b!".repeat(4_999)}b`;
    const result = configured().inspect(input);
    expect(result.input).toBe(input);
    expect(result.meta.variantCount).toBeLessThanOrEqual(result.meta.tokenCount * 24);
  });

  it.each([
    "a".repeat(9_990) + "@invalid",
    "http://".repeat(1_400),
    "1".repeat(10_000),
    "!".repeat(10_000),
    "a.a.a.a.a.a.a.a.a.a.".repeat(450)
  ])("handles a maximum-length regex adversary", (input) => {
    const bounded = input.slice(0, 10_000);
    const result = configured().inspect(bounded);
    expect(result.input).toBe(bounded);
    expect(result.issues.length).toBeLessThanOrEqual(100);
  });

  it("caps reported issues without changing the decision", () => {
    const input = Array.from({ length: 40 }, () => "pаypal").join(" ");
    const uncapped = configured({ limits: { maxIssues: 100 } }).inspect(input);
    const result = configured({ limits: { maxIssues: 10 } }).inspect(input);
    expect(result.decision).toBe(uncapped.decision);
    expect(result.issues).toHaveLength(10);
    expect(result.meta.totalIssueCount).toBeGreaterThan(10);
    expect(result.meta.issuesTruncated).toBe(true);
  });

  it("preserves decisive safety evidence when issues are capped", () => {
    const prefix = Array.from({ length: 20 }, () => "pаypal").join(" ");
    const result = configured({ limits: { maxIssues: 1 } }).inspect(`${prefix} bitch`);
    expect(result.decision).toBe("reject");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ code: "INSULT", severity: "high" });
    expect(result.meta.issuesTruncated).toBe(true);
  });

  it("coalesces consecutive unsafe Unicode characters", () => {
    const result = configured().inspect("\u200B".repeat(500));
    const zeroWidth = result.issues.filter((issue) => issue.code === "ZERO_WIDTH_CHARACTERS");
    expect(zeroWidth).toHaveLength(1);
    expect(zeroWidth[0]).toMatchObject({ start: 0, end: 500, metadata: { count: 500 } });
  });

  it("makes lenient high-severity safety matches reviewable", () => {
    const result = configured({ preset: "lenient" }).inspect("bitch");
    expect(result.decision).toBe("review");
  });

  it("rejects over-limit input without partially inspecting it", () => {
    const input = "a".repeat(17);
    const result = configured({ limits: { maxInputLength: 16 } }).inspect(input);
    expect(result).toMatchObject({ decision: "reject", score: 0, input, normalized: "", sanitized: "" });
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "INPUT_TOO_LONG" }));
    expect(Object.isFrozen(result.issues[0]?.metadata)).toBe(true);
    expect(result.meta.truncated).toBe(true);
  });

  it.each(["", "  \n\t", "\u200B\u2066"])("rejects content that is empty after sanitization", (input) => {
    const result = configured().inspect(input);
    expect(result.decision).toBe("reject");
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "EMPTY_AFTER_NORMALIZATION" }));
  });

  it("is deterministic and exposes frozen presets", () => {
    const sieve = configured();
    const first = sieve.inspect("ты cyka");
    expect(first).toEqual(sieve.inspect("ты cyka"));
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.issues)).toBe(true);
    expect(Object.isFrozen(first.issues[0])).toBe(true);
    expect(Object.isFrozen(first.issues[0]?.metadata)).toBe(true);
    expect(Object.isFrozen(presets)).toBe(true);
    expect(Object.isFrozen(presets["public-form"].policy)).toBe(true);
  });

  it("validates missing language packs and thresholds", () => {
    expect(() => createSieve({ safetyLanguages: ["ru"] })).toThrow(/Missing language pack/);
    expect(() => configured({ policy: { rejectBelow: 90, reviewBelow: 20 } })).toThrow(/thresholds/);
    expect(() => configured({ transliteration: { enabled: true, targets: ["de"] } })).toThrow(/transliteration/);
    expect(() =>
      configured({
        rules: [{ id: "gibberish", inspect: () => null }]
      })
    ).toThrow(/unique/);
  });

  it("rejects invalid custom rule output", () => {
    const sieve = configured({
      rules: [{ id: "invalid-score", inspect: () => ({ rule: "invalid-score", score: 2 }) }]
    });
    expect(() => sieve.inspect("ordinary text")).toThrow(/outside 0\.\.1/);
  });

  it("provides deterministic entropy to custom rules", () => {
    let entropy = -1;
    const sieve = configured({
      rules: [
        {
          id: "read-stats",
          inspect(context) {
            entropy = context.stats.entropy;
            return null;
          }
        }
      ]
    });
    sieve.inspect("abab");
    expect(entropy).toBe(1);
  });

  it("snapshots language-pack data when the sieve is created", () => {
    const mutablePack = {
      locale: "xx",
      patterns: [] as Array<{
        value: string;
        canonical: string;
        category: "profanity";
        severity: "high";
      }>,
      technicalAllowlist: ["stable"]
    };
    const sieve = createSieve({ languagePacks: [mutablePack], safetyLanguages: ["xx"] });
    mutablePack.patterns.push({
      value: "later",
      canonical: "later",
      category: "profanity",
      severity: "high"
    });
    mutablePack.technicalAllowlist.push("changed");
    expect(sieve.inspect("later").issues.some((issue) => issue.code === "PROFANITY")).toBe(false);
  });
});
