import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const limits = Object.freeze({ core: 60_000, ru: 8_000, en: 6_000 });

function javascriptBytes(path) {
  return readdirSync(path, { withFileTypes: true }).reduce((total, entry) => {
    const target = join(path, entry.name);
    if (entry.isDirectory()) return total + javascriptBytes(target);
    return total + (target.endsWith(".js") ? statSync(target).size : 0);
  }, 0);
}

for (const [name, limit] of Object.entries(limits)) {
  const path = fileURLToPath(new URL(`../packages/${name}/dist`, import.meta.url));
  const bytes = javascriptBytes(path);
  if (bytes > limit) throw new Error(`@textsieve/${name} runtime JS exceeds ${limit} bytes: ${bytes}`);
  console.log(`@textsieve/${name} runtime JS: ${bytes}/${limit} bytes`);
}
