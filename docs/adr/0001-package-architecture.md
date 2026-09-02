# ADR 0001 — Package architecture

English | [Русский](0001-package-architecture.ru.md)

Status: accepted

Use npm workspaces with a runtime-agnostic core and separate language packs.

- `@textsieve/core`: engine, types, normalization interfaces, generic rules, policy.
- `@textsieve/ru`: Russian safety dictionary, transliteration metadata, RU language statistics.
- `@textsieve/en`: English safety dictionary and EN language statistics.

Core must not import language packs. This preserves tree-shaking and prevents consumers from bundling unused dictionaries.

Language packs are passed explicitly to `createSieve()`. The workspace uses npm only; a root `package-lock.json` is committed for reproducible development and CI installs.
