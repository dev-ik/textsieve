# textsieve

English | [Русский](https://github.com/dev-ik/textsieve/blob/main/packages/textsieve/README.ru.md)

One-package installation of the deterministic TextSieve engine with Russian and English language packs. No AI, remote APIs or telemetry.

```bash
npm install textsieve
```

```ts
import { createSieve, en, ru } from "textsieve";

const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] }
});

const result = sieve.inspect("ах ты bitch");
```

Requires Node.js 20+ and uses ESM. For a smaller installation, use the modular `@textsieve/core`, `@textsieve/ru` and `@textsieve/en` packages directly.
