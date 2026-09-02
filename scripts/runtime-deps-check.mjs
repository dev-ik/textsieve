import { readFileSync } from "node:fs";

const manifests = ["core", "ru", "en"].map((name) => ({
  name,
  value: JSON.parse(readFileSync(new URL(`../packages/${name}/package.json`, import.meta.url), "utf8"))
}));

for (const manifest of manifests) {
  const dependencies = Object.keys(manifest.value.dependencies ?? {});
  if (dependencies.length > 0) {
    throw new Error(`@textsieve/${manifest.name} has runtime dependencies: ${dependencies.join(", ")}`);
  }
}

const aggregate = JSON.parse(
  readFileSync(new URL("../packages/textsieve/package.json", import.meta.url), "utf8")
);
const expected = ["@textsieve/core", "@textsieve/en", "@textsieve/ru"];
const actual = Object.keys(aggregate.dependencies ?? {}).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`textsieve aggregate dependencies differ: ${actual.join(", ")}`);
}

console.log("runtime dependency check: ok (modular packages: 0; textsieve aggregate: 3)");
