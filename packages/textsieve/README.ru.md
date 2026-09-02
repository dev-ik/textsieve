# textsieve

[English](https://github.com/dev-ik/textsieve/blob/main/packages/textsieve/README.md) | Русский

Установка детерминированного движка TextSieve с русским и английским языковыми пакетами одним пакетом. Без ИИ, удалённых API и телеметрии.

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

Требуется Node.js 20 или новее; пакет использует ESM. Если важен минимальный состав установки, подключайте модульные пакеты `@textsieve/core`, `@textsieve/ru` и `@textsieve/en` напрямую.
