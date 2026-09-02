import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSieve, type IssueCode } from "../packages/core/src/index.js";
import { en } from "../packages/en/src/index.js";
import { ru } from "../packages/ru/src/index.js";

const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] }
});

const englishSieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "en",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] }
});

function fixture<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(`../fixtures/${path}`, import.meta.url), "utf8")) as T;
}

describe("checked-in fixtures", () => {
  it("allows every clean seed", () => {
    const entries = fixture<readonly { readonly text: string; readonly expected: string }[]>("clean/examples.json");
    for (const entry of entries) expect(sieve.inspect(entry.text).decision, entry.text).toBe(entry.expected);
  });

  it("allows every English clean seed", () => {
    const entries = fixture<readonly { readonly text: string; readonly expected: string }[]>("clean/en.json");
    for (const entry of entries) expect(englishSieve.inspect(entry.text).decision, entry.text).toBe(entry.expected);
  });

  it("detects the expected abuse issue", () => {
    for (const path of ["abuse/examples.json", "abuse/obfuscation.json"]) {
      const entries = fixture<readonly { readonly text: string; readonly expectedIssue: IssueCode }[]>(path);
      for (const entry of entries) {
        expect(
          sieve.inspect(entry.text).issues.some((issue) => issue.code === entry.expectedIssue),
          entry.text
        ).toBe(true);
      }
    }
  });

  it("allows every boundary and substring false positive", () => {
    const entries = fixture<
      readonly { readonly locale: "ru" | "en"; readonly text: string; readonly expected: string }[]
    >("boundary/examples.json");
    for (const entry of entries) {
      const configuredSieve = entry.locale === "ru" ? sieve : englishSieve;
      expect(configuredSieve.inspect(entry.text).decision, entry.text).toBe(entry.expected);
    }
  });

  it("creates the expected transliteration candidate", () => {
    const entries = fixture<readonly { readonly raw: string; readonly candidate: string }[]>(
      "transliteration/examples.json"
    );
    for (const entry of entries) {
      expect(
        sieve.inspect(entry.raw).issues.some((issue) => issue.metadata?.["candidate"] === entry.candidate),
        entry.raw
      ).toBe(true);
    }
  });

  it.each(["gibberish/examples.json", "unicode/examples.json"])("detects issues from %s", (path) => {
    const entries = fixture<readonly { readonly text: string; readonly expectedIssue: IssueCode }[]>(path);
    for (const entry of entries) {
      expect(
        sieve.inspect(entry.text).issues.some((issue) => issue.code === entry.expectedIssue),
        entry.text
      ).toBe(true);
    }
  });
});
