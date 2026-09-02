# Выпуск TextSieve

[English](RELEASING.md) | Русский

TextSieve публикует `@textsieve/core`, `@textsieve/en` и `@textsieve/ru` из одного GitHub Release через npm Trusted Publishing. Основной пакет всегда публикуется первым.

## Однократная настройка npm

Для каждого пакета откройте **Settings → Trusted publishing** и настройте Trusted Publisher:

- provider: GitHub Actions;
- organization or user: `dev-ik`;
- repository: `textsieve`;
- workflow filename: `publish.yml`;
- allowed action: `npm publish`.

Не добавляйте npm-токен в GitHub Secrets. Workflow использует краткоживущую OIDC-идентификацию с правом `id-token: write`.

После первого успешного выпуска через Trusted Publishing настройте для каждого пакета обязательную 2FA и запрет обычных токенов. Оставьте 2FA включённой для аккаунта и организации.

## Подготовка релиза

1. Одновременно обновите версии во всех четырёх `package.json`. В языковых пакетах сохраните точную development-зависимость от новой версии core.
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
```

Убедитесь, что npm показывает GitHub-репозиторий и сведения provenance. Для provenance и пакет, и репозиторий с исходным кодом должны быть публичными.
