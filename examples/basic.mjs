import { createSieve, en, ru } from "textsieve";

const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] },
  preset: "public-form"
});

console.log(JSON.stringify(sieve.inspect("ах ты bitch"), null, 2));
