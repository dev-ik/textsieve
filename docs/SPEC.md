# TextSieve — Implementation Specification

English | [Русский](SPEC.ru.md)

## Product
**TextSieve** is a deterministic text quality & safety firewall for JavaScript/TypeScript.

Headline:
> Catch profanity, explicit insults, gibberish, spam, malformed input and obvious abuse without AI, APIs or network requests.

Target runtimes: browser, Node.js 20+, Bun, Edge/Workers; Deno where feasible.

## Public API

```ts
import { createSieve, en, ru } from "textsieve";

const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: {
    enabled: true,
    targets: ["ru"]
  },
  preset: "public-form"
});

const result = sieve.inspect("ах ты bitch");
```

```ts
type Decision = "allow" | "review" | "reject";

interface InspectionResult {
  decision: Decision;
  score: number; // 0..100; 100 = clean/high-quality
  input: string;
  normalized: string;
  sanitized: string;
  signals: Record<string, number>; // each 0..1
  issues: Issue[];
  meta: InspectionMeta;
}
```

Convenience methods:
```ts
sieve.inspect(text);
sieve.check(text);
sieve.normalize(text);
sieve.sanitize(text);
```

## Language model

Do not use a single `locale` for all behavior.

```ts
interface LanguageOptions {
  languagePacks?: readonly LanguagePack[];
  expectedLanguage?: string;
  safetyLanguages?: readonly string[];
  transliteration?: {
    enabled: boolean;
    targets?: readonly string[];
  };
}
```

### `expectedLanguage`
Checks whether the overall text is appropriate for the expected field language.

For `ru`:
- `Привет, всё отлично` -> normal
- `React разработчик` -> normal
- `Hello how are you today` -> mismatch signal

### `safetyLanguages`
Controls which profanity/insult packs run, regardless of expected language.

`ах ты bitch` must be caught by EN safety rules even in a RU-only form.

### Transliteration and variants
Never transliterate the entire input destructively.

Tokens can have variants:
```ts
interface TokenVariant {
  value: string;
  source: "normalized" | "deobfuscated" | "translit-ru" | "leet" | "joined";
}
```

Examples:
- `suka` -> `сука`
- `cyka` -> `сука`
- `blyat` -> `блять`
- `nahui` -> `нахуй`

## Processing pipeline

```text
raw input
  -> Unicode inspection
  -> normalization
  -> sanitization
  -> tokenization
  -> candidate/token variants
  -> text statistics
  -> generic rules
  -> language safety rules
  -> gibberish signals
  -> aggregate scoring
  -> policy
  -> allow/review/reject
```

Keep stages modular.

## Rule interface

```ts
interface TextRule {
  readonly id: string;
  inspect(context: RuleContext): RuleResult | null;
}

interface RuleContext {
  input: string;
  normalized: string;
  sanitized: string;
  tokens: readonly Token[];
  stats: TextStats;
  expectedLanguage?: string;
  safetyLanguages: readonly string[];
}

interface RuleResult {
  rule: string;
  score: number;
  issues?: Issue[];
  metadata?: Record<string, unknown>;
}
```

Rules must not mutate shared context.

## Issue model

```ts
interface Issue {
  code: IssueCode;
  rule: string;
  severity: "info" | "low" | "medium" | "high";
  score?: number;
  start?: number;
  end?: number;
  locale?: string;
  matched?: string;
  metadata?: Record<string, unknown>;
}
```

Initial issue codes:
- `PROFANITY`
- `INSULT`
- `GIBBERISH_HIGH`
- `CHAR_REPETITION`
- `WORD_REPETITION`
- `KEYBOARD_SMASH`
- `EXCESSIVE_CAPS`
- `EXCESSIVE_PUNCTUATION`
- `TOO_MANY_URLS`
- `TOO_MANY_EMAILS`
- `TOO_MANY_PHONES`
- `SUSPICIOUS_UNICODE`
- `ZERO_WIDTH_CHARACTERS`
- `MIXED_SCRIPT_TOKEN`
- `LANGUAGE_MISMATCH`
- `EMPTY_AFTER_NORMALIZATION`
- `INPUT_TOO_LONG`

## Profanity / insult matching

Keep profanity and explicit insults as separate signals.

Support conservatively:
- token boundaries
- Unicode normalization
- inserted separators/spaces
- repeated characters
- common leetspeak
- transliteration variants
- mixed-script/homoglyph candidates where safe
- allow-list exceptions

Examples:
`блять`, `бл*ть`, `б л я т ь`, `бл@ть`, `бляяяять`, `bitch`, `b!tch`, `suka`, `cyka`, `blyat`.

### Fast dictionary matcher
For many known words/patterns, implement or evaluate a compiled **Aho–Corasick** matcher (or an equivalently efficient deterministic multi-pattern matcher). Do not run N independent `includes()` scans over the whole input.

Compile static dictionaries when a sieve/language pack is created, not on every inspection.

Maintain pattern metadata so matches retain:
- rule
- language
- canonical form
- severity
- exceptions

### Adversarial bypass normalization
Use dedicated candidate generation for known bypass families:
- spaces inserted inside words
- visually similar symbols/digits
- duplicated characters
- transliteration
- conservative word-gluing recovery

Do not perform unconstrained typo correction. Broad fuzzy matching is too false-positive-prone.

## Gibberish

This is a key differentiator.

Do not define gibberish as “not in dictionary”.

Combine:
- char repetition
- token repetition
- keyboard sequence likelihood
- vowel/consonant balance
- script distribution
- token length
- lexical diversity
- entropy
- punctuation density
- compact character n-gram plausibility
- known-word ratio only as a weak signal

Examples:
- `купил товар, всё отлично` -> low
- `ывпавфыапфыва` -> high
- `asdfghjkl` -> very high
- `React TypeScript SDK` -> low

Ship compact RU/EN n-gram statistics in language packs; no inference runtime.

## Unicode safety

Detect:
- zero-width chars
- bidi controls
- suspicious controls
- invisible repetition
- mixed scripts inside a token
- simple homoglyph abuse

`React разработчик` is legitimate mixed-language text.
`pаypal` with mixed Latin/Cyrillic inside one token is suspicious.

## Spam/quality rules

MVP:
- repeated chars
- repeated words/phrases
- keyboard smashing
- excessive caps
- excessive punctuation
- excessive/repeated URLs
- excessive emails/phones
- low lexical diversity

## Presets
- `lenient`
- `public-form`
- `comment`
- `username`
- `strict`

Presets must be exported plain configuration, not hidden magic.

## Package layout

```text
packages/
  core/
  ru/
  en/
  textsieve/
benchmarks/
fixtures/
docs/adr/
examples/
```

Target packages:
- `textsieve` (convenience entry point)
- `@textsieve/core`
- `@textsieve/ru`
- `@textsieve/en`

Postpone React/Vue/Express/Fastify/Nest integrations.

## Performance
Typical short form text should remain synchronous.

Benchmark:
20, 100, 500, 2,000 and 10,000 chars.

Track:
- mean
- p95
- ops/sec
- bundle size
- language-pack size

Review user-controlled regex paths for ReDoS.

## Testing

Every rule requires:
- positive
- negative
- false-positive
- boundary
- obfuscation where relevant
- Unicode where relevant

False-positive corpus must include at least:
`TypeScript`, `Next.js`, `PostgreSQL`, `OAuth2`, `OpenAPI`, `npm`, `pnpm`,
`dev-ik`, `React/Node.js разработчик`, realistic names/companies/addresses/products.

Prefer semantic assertions over snapshot-only tests.

## MVP v0.1.0

Include:
- core engine
- typed config
- normalization
- tokenization
- token variants
- policy/scoring
- RU safety
- EN safety
- multilingual orchestration
- transliteration-aware matching
- profanity
- insults
- repetition
- keyboard smash
- basic gibberish
- punctuation/caps/URLs
- Unicode safety
- presets
- explainable issues
- fixtures/tests/benchmarks/docs

Postpone:
framework integrations, CLI, cloud service, AI fallback, dashboard, remote dictionaries, WASM/Rust.

## Security model
Frontend checks are UX only. Documentation must explicitly require repeating enforcement server-side.

## Privacy
No network requests. No telemetry. User text never leaves the host application through TextSieve.
