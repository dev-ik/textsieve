import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const workspace = resolve(new URL("..", import.meta.url).pathname);
const pairs = [
  ["README.md", "README.ru.md"],
  ["CONTRIBUTING.md", "CONTRIBUTING.ru.md"],
  ["CHANGELOG.md", "CHANGELOG.ru.md"],
  ["packages/core/README.md", "packages/core/README.ru.md"],
  ["packages/en/README.md", "packages/en/README.ru.md"],
  ["packages/ru/README.md", "packages/ru/README.ru.md"],
  ["docs/README.md", "docs/README.ru.md"],
  ["docs/API.md", "docs/API.ru.md"],
  ["docs/DATA_PROVENANCE.md", "docs/DATA_PROVENANCE.ru.md"],
  ["docs/REGEX_AUDIT.md", "docs/REGEX_AUDIT.ru.md"],
  ["docs/RELEASING.md", "docs/RELEASING.ru.md"],
  ["docs/SPEC.md", "docs/SPEC.ru.md"],
  ["docs/adr/README.md", "docs/adr/README.ru.md"],
  ...Array.from({ length: 9 }, (_, index) => {
    const number = String(index + 1).padStart(4, "0");
    const names = [
      "package-architecture",
      "rule-interface",
      "scoring-model",
      "language-and-safety",
      "multi-pattern-matching",
      "adversarial-variants",
      "language-pack-composition",
      "text-representations-and-offsets",
      "runtime-and-module-format"
    ];
    const english = `docs/adr/${number}-${names[index]}.md`;
    return [english, english.replace(/\.md$/u, ".ru.md")];
  })
];

function checkLinks(relativePath) {
  const absolutePath = resolve(workspace, relativePath);
  const content = readFileSync(absolutePath, "utf8");
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
    const destination = match[1].split("#", 1)[0];
    if (!destination || /^(?:https?:|mailto:)/u.test(destination)) continue;
    const target = resolve(dirname(absolutePath), decodeURIComponent(destination));
    if (!existsSync(target)) throw new Error(`${relativePath}: broken link to ${destination}`);
  }
}

for (const [english, russian] of pairs) {
  if (!existsSync(resolve(workspace, english))) throw new Error(`Missing English document: ${english}`);
  if (!existsSync(resolve(workspace, russian))) throw new Error(`Missing Russian document: ${russian}`);
  checkLinks(english);
  checkLinks(russian);
}

console.log(`documentation check: ok (${pairs.length} EN/RU pairs)`);
