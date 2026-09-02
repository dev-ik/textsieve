import { createSieve } from "@textsieve/core";
import { en } from "@textsieve/en";
import { ru } from "@textsieve/ru";

const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] }
});

export const browserSmokeResult = sieve.inspect("ах ты b!tch");
