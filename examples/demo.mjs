import { createSieve, en, ru } from "textsieve";

const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] },
  preset: "public-form"
});

const samples = [
  ["Я использую React и TypeScript"],
  ["Hello how are you today", "LANGUAGE_MISMATCH"],
  ["ах ты bitch", "INSULT"],
  ["ты cyka", "PROFANITY"]
];

for (const [text, highlightedCode] of samples) {
  const result = sieve.inspect(text);
  const issue = result.issues.find(({ code }) => code === highlightedCode);
  const reason = issue ? ` · ${issue.code}${issue.locale ? ` (${issue.locale})` : ""}` : "";
  console.log(`${result.decision.toUpperCase().padEnd(6)}  ${text}${reason}`);
}
