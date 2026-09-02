# Releasing TextSieve

English | [Русский](RELEASING.ru.md)

TextSieve publishes `@textsieve/core`, `@textsieve/en` and `@textsieve/ru` from one GitHub Release through npm Trusted Publishing. The core package is always published first.

## One-time npm configuration

Configure the following Trusted Publisher on each package under **Settings → Trusted publishing**:

- provider: GitHub Actions;
- organization or user: `dev-ik`;
- repository: `textsieve`;
- workflow filename: `publish.yml`;
- allowed action: `npm publish`.

Do not add an npm token to GitHub secrets. The workflow uses a short-lived OIDC identity and requires `id-token: write`.

After one successful Trusted Publishing release, set each package's publishing access to require 2FA and disallow traditional tokens. Keep account and organization 2FA enabled.

## Preparing a release

1. Update all four package versions together. Keep the language packs' exact development dependency on the new core version.
2. Update `CHANGELOG.md` and `CHANGELOG.ru.md`.
3. Run:

   ```bash
   npm install --package-lock-only
   npm run release:version-check -- --tag v0.1.1
   npm run release:check
   npm run benchmark
   ```

4. Commit and push the release changes to `main`.
5. On GitHub, create and publish a release whose tag is exactly `v<package version>`.

Publishing the GitHub Release starts `.github/workflows/publish.yml`. The workflow validates the tag, repeats every release check and publishes the packages in dependency order. A retry skips a package version that is already present in npm, so a partial publication can continue safely.

## Verification

After the workflow succeeds, verify:

```bash
npm view @textsieve/core version
npm view @textsieve/en version
npm view @textsieve/ru version
```

Confirm that npm displays the GitHub repository and provenance information. Provenance requires both the package and source repository to be public.
