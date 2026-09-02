# ADR 0010 — Convenience package

English | [Русский](0010-convenience-package.ru.md)

## Context

Using both bundled language packs previously required installing and importing three scoped packages. That explicit composition is useful for small bundles, but it adds friction to the default RU/EN setup.

## Decision

Publish an unscoped `textsieve` package that depends on exact matching versions of `@textsieve/core`, `@textsieve/en` and `@textsieve/ru`. It contains no engine or language data of its own and only re-exports the public core API, types and both language packs.

The scoped packages remain canonical and independently installable. The convenience package follows the same version as all workspace packages and supports Node.js 20 or newer.

## Consequences

- The common setup becomes `npm install textsieve` and one import.
- Consumers can still install only the scoped packages they need.
- Exact dependency versions keep the aggregate package reproducible.
- A release is complete only when all four packages have the same version.
- The first publication of `textsieve` must be bootstrapped manually before npm Trusted Publishing can be configured for it.
