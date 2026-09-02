# @textsieve/core

English | [Русский](https://github.com/dev-ik/textsieve/blob/main/packages/core/README.ru.md)

Deterministic, runtime-agnostic text quality and safety engine. It has no runtime dependencies, network requests, telemetry or AI inference.

```bash
npm install @textsieve/core @textsieve/ru @textsieve/en
```

```ts
import { createSieve } from "@textsieve/core";
import { en } from "@textsieve/en";
import { ru } from "@textsieve/ru";

const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] }
});

const result = sieve.inspect("ах ты bitch");
```

Requires Node.js 20+ and uses ESM exports. Use browser-side checks only for user experience; repeat enforcement on a trusted server.
