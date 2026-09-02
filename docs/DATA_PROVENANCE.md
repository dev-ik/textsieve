# Language data provenance

English | [Русский](DATA_PROVENANCE.ru.md)

## Initial v0.1.0 data

The Russian and English safety patterns, transliteration aliases, allowlists, common-word samples, n-grams and checked-in fixtures in this repository were created specifically for TextSieve with AI-assisted development and maintainer review. They were not copied or mechanically derived from an external dictionary, corpus or moderation list.

These project-authored data files are distributed under the same MIT License as the source code.

Covered locations:

- `packages/ru/src/index.ts`
- `packages/en/src/index.ts`
- `fixtures/**/*.json`

The lists are intentionally small. They are testable release seeds, not a claim of complete coverage of Russian or English abuse.

## Adding external data

Before importing or deriving data from an external source, document:

- source name and canonical URL;
- exact version or retrieval date;
- copyright holder and license;
- whether modification and redistribution in an npm package are permitted;
- attribution or notice requirements;
- which generated files contain the derived data;
- a reproducible transformation process when applicable.

Do not add data with an unknown, incompatible or non-redistributable license. Publicly accessible data is not automatically public domain. Keep third-party notices with the distributed package whenever its license requires them.

## Review requirements

Every language-data change needs positive, negative, boundary and realistic false-positive fixtures. Severity and cultural context should be reviewed by a fluent speaker before a release claims broader language coverage.
