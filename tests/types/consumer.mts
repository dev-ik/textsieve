import {
  createSieve,
  en,
  presets,
  ru,
  type InspectionResult,
  type LanguagePack,
  type TextRule
} from "textsieve";

const packs: readonly LanguagePack[] = [ru, en];
const customRule: TextRule = {
  id: "consumer-rule",
  inspect: () => null
};

const sieve = createSieve({
  languagePacks: packs,
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] },
  preset: "public-form",
  rules: [customRule],
  policy: { reviewBelow: presets["public-form"].policy.reviewBelow }
});

const result: InspectionResult = sieve.inspect("Проверка TypeScript");
const allowed: boolean = sieve.check(result.input);
const normalized: string = sieve.normalize(result.input);
const sanitized: string = sieve.sanitize(result.input);

void [allowed, normalized, sanitized];

// @ts-expect-error Decision is a closed public union.
const invalidDecision: InspectionResult["decision"] = "maybe";
void invalidDecision;
