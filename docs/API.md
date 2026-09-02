# TextSieve API

English | [Русский](API.ru.md)

## `createSieve(options)`

Creates an isolated deterministic inspector. Language packs are registered explicitly and snapshotted at creation time.

```ts
const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] },
  preset: "public-form"
});
```

`expectedLanguage` affects only language-quality checks. `safetyLanguages` selects independently applied safety packs.

## Methods

### `inspect(text)`

Returns `decision`, quality `score`, raw and derived text, normalized problem `signals`, explainable `issues` and deterministic metadata. Issue offsets are half-open UTF-16 positions in the raw input.

### `check(text)`

Returns `true` only when `inspect(text).decision` is `allow`.

### `normalize(text)`

Returns the per-grapheme NFKC and lowercase representation. It does not remove suspicious characters.

### `sanitize(text)`

Returns a separate derived representation with unsafe controls removed and whitespace collapsed.

## Presets

`lenient`, `public-form`, `comment`, `username` and `strict` are exported as plain frozen configuration through `presets`.

## Input limits

The selected preset supplies a maximum UTF-16 input length. Over-limit input is rejected with `INPUT_TOO_LONG` and is not partially inspected.

Presets also cap reported issues and token variants. `meta.totalIssueCount` retains the pre-cap count and `meta.issuesTruncated` reports whether the public issue list was shortened.

## Custom rules

Custom rules must be deterministic, side-effect-free, have a unique non-empty ID and return a finite problem score from 0 through 1. Rules receive an immutable `RuleContext` and do not directly choose the final decision.
