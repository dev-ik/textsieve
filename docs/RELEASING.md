# Releasing TextSieve

English | [Русский](RELEASING.ru.md)

TextSieve publishes `@textsieve/core`, `@textsieve/en`, `@textsieve/ru` and the `textsieve` convenience package from one GitHub Release through npm Trusted Publishing. Packages are published in dependency order, with core first and the convenience package last.

## One-time npm configuration

Configure the following Trusted Publisher on each existing package under **Settings → Trusted publishing**:

- provider: GitHub Actions;
- organization or user: `dev-ik`;
- repository: `textsieve`;
- workflow filename: `publish.yml`;
- allowed action: `npm publish`.

Do not add an npm token to GitHub secrets. The workflow uses a short-lived OIDC identity and requires `id-token: write`.

After one successful Trusted Publishing release, set each package's publishing access to require 2FA and disallow traditional tokens. Keep account and organization 2FA enabled.

An npm package must exist before its Trusted Publisher can be configured. For the first `textsieve` release only, configure the three existing scoped packages before creating the GitHub Release. The workflow will publish those packages and skip the not-yet-created convenience package. After the workflow succeeds, bootstrap it from the repository root:

```bash
npm whoami
npm view @textsieve/core version
npm view @textsieve/en version
npm view @textsieve/ru version
npm publish --workspace=textsieve --access public
```

Then configure the same Trusted Publisher for `textsieve`. From the next release onward, the workflow publishes all four packages automatically. Do not manually publish `textsieve` until its three exact dependencies are available in npm.

## Preparing a release

1. Update all four published package versions together. Keep the language packs' exact development dependency on the new core version and the convenience package's exact dependencies on all three scoped packages.
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
npm view textsieve version
```

Also verify the public consumer path in a temporary directory:

```bash
npm install textsieve
node --input-type=module -e 'import { createSieve, en, ru } from "textsieve"; console.log(createSieve({ languagePacks: [ru, en] }).inspect("hello").decision)'
```

Confirm that npm displays the GitHub repository and provenance information. Provenance requires both the package and source repository to be public.
