import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPaths = ["package.json", "packages/core/package.json", "packages/en/package.json", "packages/ru/package.json"];
const manifests = manifestPaths.map((relativePath) => ({
  relativePath,
  value: JSON.parse(readFileSync(resolve(workspace, relativePath), "utf8"))
}));
const versions = new Set(manifests.map(({ value }) => value.version));

if (versions.size !== 1) {
  throw new Error(`Workspace versions differ: ${manifests.map(({ relativePath, value }) => `${relativePath}=${value.version}`).join(", ")}`);
}

const [version] = versions;
if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
  throw new Error(`Invalid release version: ${String(version)}`);
}

for (const { relativePath, value } of manifests.slice(1)) {
  const expectedUrl = "git+https://github.com/dev-ik/textsieve.git";
  if (value.repository?.url !== expectedUrl || value.homepage !== "https://github.com/dev-ik/textsieve#readme") {
    throw new Error(`Incomplete repository metadata in ${relativePath}`);
  }
}

const tagArgument = process.argv.indexOf("--tag");
if (tagArgument !== -1) {
  const tag = process.argv[tagArgument + 1];
  if (tag !== `v${version}`) throw new Error(`Release tag ${String(tag)} does not match package version v${version}`);
}

console.log(`release version check: ok (v${version})`);
