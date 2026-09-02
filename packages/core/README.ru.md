# @textsieve/core

[English](https://github.com/dev-ik/textsieve/blob/main/packages/core/README.md) | Русский

Детерминированное, независимое от среды выполнения ядро проверки качества и безопасности текста. В нём нет runtime-зависимостей, сетевых запросов, телеметрии и AI-инференса.

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

Требуется Node.js 20 или новее; пакет использует ESM-экспорт. Применяйте проверку в браузере только для удобства пользователя и повторяйте принудительную проверку на доверенном сервере.
