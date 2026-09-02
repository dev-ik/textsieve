# @textsieve/en

[English](https://github.com/dev-ik/textsieve/blob/main/packages/en/README.md) | Русский

Консервативные данные безопасности и текстовая статистика английского языка для TextSieve.

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

В версии 0.1.0 словарь намеренно консервативен. Требуется Node.js 20 или новее и ESM.
