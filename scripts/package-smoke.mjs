import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const workspace = resolve(new URL("..", import.meta.url).pathname);
const temporary = mkdtempSync(join(tmpdir(), "textsieve-package-smoke-"));
const consumer = join(temporary, "consumer");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const cache = join(workspace, ".cache", "npm");

function run(args, cwd = workspace) {
  return execFileSync(npm, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, npm_config_cache: cache, npm_config_audit: "false", npm_config_fund: "false" }
  });
}

function packageTarball(relativeManifestPath) {
  const manifest = JSON.parse(readFileSync(join(workspace, relativeManifestPath), "utf8"));
  const filename = `${manifest.name.replace(/^@/u, "").replace("/", "-")}-${manifest.version}.tgz`;
  return join(temporary, filename);
}

try {
  run(["pack", "--workspace=@textsieve/core", "--pack-destination", temporary]);
  run(["pack", "--workspace=@textsieve/en", "--pack-destination", temporary]);
  run(["pack", "--workspace=@textsieve/ru", "--pack-destination", temporary]);
  run(["pack", "--workspace=textsieve", "--pack-destination", temporary]);

  mkdirSync(consumer);
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({ name: "textsieve-package-smoke", private: true, type: "module" })
  );
  writeFileSync(
    join(consumer, "smoke.mjs"),
    `import { createSieve, en, ru } from "textsieve";
const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] }
});
const result = sieve.inspect("ты cyka");
if (result.decision !== "reject" || !result.issues.some((issue) => issue.code === "INSULT")) {
  throw new Error(JSON.stringify(result));
}
`
  );

  run(
    [
      "install",
      packageTarball("packages/core/package.json"),
      packageTarball("packages/en/package.json"),
      packageTarball("packages/ru/package.json"),
      packageTarball("packages/textsieve/package.json"),
      "--ignore-scripts",
      "--offline"
    ],
    consumer
  );
  execFileSync(process.execPath, ["smoke.mjs"], { cwd: consumer, stdio: "pipe" });
  console.log("packed npm aggregate consumer smoke: ok");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
