# Выпуск TextSieve

[English](RELEASING.md) | Русский

TextSieve публикует `@textsieve/core`, `@textsieve/en`, `@textsieve/ru` и единый пакет `textsieve` из одного GitHub Release через npm Trusted Publishing. Пакеты публикуются в порядке зависимостей: core первым, а единый пакет последним.

## Однократная настройка npm

Для каждого существующего пакета откройте **Settings → Trusted publishing** и настройте Trusted Publisher:

- provider: GitHub Actions;
- organization or user: `dev-ik`;
- repository: `textsieve`;
- workflow filename: `publish.yml`;
- allowed action: `npm publish`.

Не добавляйте npm-токен в GitHub Secrets. Workflow использует краткоживущую OIDC-идентификацию с правом `id-token: write`.

После первого успешного выпуска через Trusted Publishing настройте для каждого пакета обязательную 2FA и запрет обычных токенов. Оставьте 2FA включённой для аккаунта и организации.

Trusted Publisher можно настроить только для уже существующего npm-пакета. Только для первого выпуска `textsieve` сначала настройте три существующих scoped-пакета и создайте GitHub Release. Workflow опубликует их и пропустит ещё не созданный единый пакет. После успешного workflow выполните из корня репозитория:

```bash
npm whoami
npm view @textsieve/core version
npm view @textsieve/en version
npm view @textsieve/ru version
npm publish --workspace=textsieve --access public
```

Затем настройте такой же Trusted Publisher для `textsieve`. Со следующего релиза workflow будет автоматически публиковать все четыре пакета. Не публикуйте `textsieve` вручную, пока все три его точные зависимости не появились в npm.

## Подготовка релиза

1. Одновременно обновите версии всех четырёх публикуемых пакетов. В языковых пакетах сохраните точную development-зависимость от новой версии core, а в едином пакете — точные зависимости на все три scoped-пакета.
2. Обновите `CHANGELOG.md` и `CHANGELOG.ru.md`.
3. Выполните:

   ```bash
   npm install --package-lock-only
   npm run release:version-check -- --tag v0.1.1
   npm run release:check
   npm run benchmark
   ```

4. Зафиксируйте изменения и отправьте их в `main`.
5. Создайте и опубликуйте GitHub Release с тегом, точно равным `v<версии пакета>`.

Публикация GitHub Release запускает `.github/workflows/publish.yml`. Workflow проверяет тег, повторяет все релизные проверки и публикует пакеты в порядке зависимостей. При повторном запуске уже существующая в npm версия пакета пропускается, поэтому частично выполненную публикацию можно безопасно продолжить.

## Проверка

После успешного выполнения workflow проверьте:

```bash
npm view @textsieve/core version
npm view @textsieve/en version
npm view @textsieve/ru version
npm view textsieve version
```

Также проверьте публичную установку в отдельной временной директории:

```bash
npm install textsieve
node --input-type=module -e 'import { createSieve, en, ru } from "textsieve"; console.log(createSieve({ languagePacks: [ru, en] }).inspect("hello").decision)'
```

Убедитесь, что npm показывает GitHub-репозиторий и сведения provenance. Для provenance и пакет, и репозиторий с исходным кодом должны быть публичными.
