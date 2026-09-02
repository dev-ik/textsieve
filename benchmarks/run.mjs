import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSieve } from "../packages/core/dist/index.js";
import { AhoCorasick } from "../packages/core/dist/matching/aho-corasick.js";
import { en } from "../packages/en/dist/index.js";
import { ru } from "../packages/ru/dist/index.js";

const sieve = createSieve({
  languagePacks: [ru, en],
  expectedLanguage: "ru",
  safetyLanguages: ["ru", "en"],
  transliteration: { enabled: true, targets: ["ru"] }
});

function quantile(sorted, value) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] ?? 0;
}

function benchmark(length) {
  const seed = "Проверка текста React TypeScript прошла успешно. ";
  const input = seed.repeat(Math.ceil(length / seed.length)).slice(0, length);
  const iterations = length <= 500 ? 2_000 : length <= 2_000 ? 500 : 100;
  const samples = [];

  for (let index = 0; index < 50; index += 1) sieve.inspect(input);
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    const before = performance.now();
    sieve.inspect(input);
    samples.push(performance.now() - before);
  }
  const elapsed = performance.now() - started;
  samples.sort((left, right) => left - right);

  return {
    length,
    iterations,
    meanMs: Number((elapsed / iterations).toFixed(4)),
    p95Ms: Number(quantile(samples, 0.95).toFixed(4)),
    opsPerSecond: Math.round((iterations / elapsed) * 1_000)
  };
}

function directoryBytes(path, include = () => true) {
  return readdirSync(path, { withFileTypes: true }).reduce((total, entry) => {
    const target = join(path, entry.name);
    return total + (entry.isDirectory() ? directoryBytes(target, include) : include(target) ? statSync(target).size : 0);
  }, 0);
}

const lengths = [20, 100, 500, 2_000, 10_000];
const performanceThresholds = new Map([
  [20, 2],
  [100, 3],
  [500, 10],
  [2_000, 30],
  [10_000, 100]
]);
const performanceResults = lengths.map(benchmark);
console.table(performanceResults);
for (const result of performanceResults) {
  const threshold = performanceThresholds.get(result.length);
  if (threshold !== undefined && result.p95Ms > threshold) {
    throw new Error(`p95 for ${result.length} characters exceeds ${threshold}ms: ${result.p95Ms}ms`);
  }
}
console.table(
  ["core", "ru", "en"].map((name) => {
    const path = fileURLToPath(new URL(`../packages/${name}/dist`, import.meta.url));
    return {
      package: `@textsieve/${name}`,
      runtimeJsBytes: directoryBytes(path, (file) => file.endsWith(".js")),
      completeDistBytes: directoryBytes(path)
    };
  })
);

function matcherBenchmark(patternCount) {
  const entries = Array.from({ length: patternCount }, (_, index) => ({
    pattern: `pattern-${index.toString().padStart(5, "0")}`,
    metadata: index
  }));
  const input = `prefix ${entries.at(-1).pattern} suffix`;
  const matcher = new AhoCorasick(entries);
  const iterations = 2_000;
  let ahoMatches = 0;
  let naiveMatches = 0;

  const ahoStarted = performance.now();
  for (let index = 0; index < iterations; index += 1) ahoMatches += matcher.search(input).length;
  const ahoMs = performance.now() - ahoStarted;

  const naiveStarted = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    for (const entry of entries) {
      if (input.includes(entry.pattern)) naiveMatches += 1;
    }
  }
  const naiveMs = performance.now() - naiveStarted;

  return {
    patternCount,
    ahoMs: Number(ahoMs.toFixed(2)),
    naiveMs: Number(naiveMs.toFixed(2)),
    matchesAgree: ahoMatches === naiveMatches,
    faster: ahoMs < naiveMs ? "aho-corasick" : "naive"
  };
}

console.table([100, 1_000].map(matcherBenchmark));
