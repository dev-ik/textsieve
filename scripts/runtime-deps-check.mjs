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

console.log("runtime dependency check: ok (0 runtime dependencies)");
