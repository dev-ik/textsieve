# @textsieve/ru

English | [Русский](https://github.com/dev-ik/textsieve/blob/main/packages/ru/README.ru.md)

Conservative Russian safety data, transliteration aliases and text statistics for TextSieve.

```bash
npm install @textsieve/core @textsieve/ru
```

```ts
import { createSieve } from "@textsieve/core";
import { ru } from "@textsieve/ru";

const sieve = createSieve({
  languagePacks: [ru],
  expectedLanguage: "ru",
  safetyLanguages: ["ru"],
  transliteration: { enabled: true, targets: ["ru"] }
});
```

The dictionary is deliberately conservative in v0.1.0. Requires Node.js 20+ and ESM.
