# ADR 0007 — Explicit language-pack composition

English | [Русский](0007-language-pack-composition.ru.md)

Status: accepted

## Context

The core package must not import concrete language packs, while inspection configuration refers to languages by locale.

## Decision

`createSieve()` receives immutable language-pack objects through `languagePacks`. `expectedLanguage` and every entry in `safetyLanguages` must have a corresponding registered pack when language-specific behavior is required.

```ts
createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"]
});
```

Language packages may import core types, but core never imports language packages. Registration is instance-local and has no global side effects.

## Consequences

- Consumers bundle only the packs they import.
- Configuration is deterministic and isolated per sieve instance.
- The public call is slightly more verbose than implicit global registration.
