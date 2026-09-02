# @textsieve/en

English | [Русский](https://github.com/dev-ik/textsieve/blob/main/packages/en/README.ru.md)

Conservative English safety data and text statistics for TextSieve.

```bash
npm install @textsieve/core @textsieve/en
```

```ts
import { createSieve } from "@textsieve/core";
import { en } from "@textsieve/en";

const sieve = createSieve({
  languagePacks: [en],
  expectedLanguage: "en",
  safetyLanguages: ["en"]
});
```

The dictionary is deliberately conservative in v0.1.0. Requires Node.js 20+ and ESM.
