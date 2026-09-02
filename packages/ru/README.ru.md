# @textsieve/ru

[English](README.md) | Русский

Консервативные русскоязычные данные безопасности, варианты транслитерации и текстовая статистика для TextSieve.

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

В версии 0.1.0 словарь намеренно консервативен. Требуется Node.js 20 или новее и ESM.
