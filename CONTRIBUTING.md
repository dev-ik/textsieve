# Contributing to TextSieve

English | [Русский](CONTRIBUTING.ru.md)

TextSieve is an OSS project licensed under MIT. Contributions should preserve deterministic, local-only inspection and conservative false-positive behavior.

## Development

Use Node.js 24 LTS and npm:

```bash
nvm use
npm install
npm run release:check
npm run benchmark
```

Runtime compatibility starts at Node.js 20. Do not introduce runtime dependencies, network requests, telemetry or nondeterministic behavior.

## Rules and language data

Every detector or dictionary addition needs:

- a positive case;
- a negative case;
- a boundary case;
- a realistic false-positive case;
- an obfuscation or Unicode case when relevant.

Do not copy external dictionaries or corpora without a compatible license and documented provenance in [`docs/DATA_PROVENANCE.md`](docs/DATA_PROVENANCE.md). Prefer small reviewed additions over broad stems, global fuzzy matching or destructive transliteration.

## Pull requests

Keep changes focused and describe behavior, false-positive risk and verification. Run `npm run release:check` before requesting review.
