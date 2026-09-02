import { AhoCorasick } from "../matching/aho-corasick.js";
import type { Issue, LanguagePack, RuleResult, SafetyPattern, Token } from "../types.js";

interface CompiledPattern {
  readonly locale: string;
  readonly pattern: SafetyPattern;
}

const severitySignal = Object.freeze({
  info: 0.2,
  low: 0.35,
  medium: 0.65,
  high: 1
});

export class SafetyInspector {
  readonly id = "safety-match";
  readonly #matcher: AhoCorasick<CompiledPattern>;
  readonly #packs: ReadonlyMap<string, LanguagePack>;

  constructor(packs: readonly LanguagePack[]) {
    this.#packs = new Map(packs.map((pack) => [pack.locale, pack]));
    this.#matcher = new AhoCorasick(
      packs.flatMap((pack) =>
        pack.patterns.map((pattern) => ({
          pattern: pattern.value,
          metadata: { locale: pack.locale, pattern }
        }))
      )
    );
  }

  inspect(input: string, tokens: readonly Token[]): RuleResult | null {
    const issues: Issue[] = [];
    const seen = new Set<string>();
    let maximum = 0;

    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      const token = tokens[tokenIndex];
      if (!token) continue;
      for (const variant of token.variants) {
        for (const match of this.#matcher.search(variant.value)) {
          const { locale, pattern } = match.metadata;
          const pack = this.#packs.get(locale);
          const exactToken = match.start === 0 && match.end === variant.value.length;
          const gluedPrefix = variant.value.slice(0, match.start);
          const recoveredGluedPrefix =
            match.start > 0 &&
            match.end === variant.value.length &&
            (pack?.insultPrefixes?.includes(gluedPrefix) ?? false);
          if (!exactToken && !recoveredGluedPrefix) continue;
          if (pattern.exceptions?.includes(token.value)) continue;
          const confidence = variant.source === "normalized" ? 1 : 0.9;
          const issueScore = confidence * severitySignal[pattern.severity];
          const code = pattern.category === "profanity" ? "PROFANITY" : "INSULT";
          const key = `${code}:${variant.start}:${variant.end}:${locale}:${pattern.canonical}`;
          if (!seen.has(key)) {
            seen.add(key);
            maximum = Math.max(maximum, issueScore);
            issues.push({
              code,
              rule: this.id,
              severity: pattern.severity,
              score: issueScore,
              start: variant.start,
              end: variant.end,
              locale,
              matched: input.slice(variant.start, variant.end),
              metadata: {
                canonical: pattern.canonical,
                candidate: variant.value,
                source: variant.source,
                ...(recoveredGluedPrefix ? { recovery: "glued-insult-prefix", prefix: gluedPrefix } : {})
              }
            });
          }

          const contextual = pack?.contextualInsults?.includes(pattern.canonical) ?? false;
          const prefixes = new Set(pack?.insultPrefixes ?? []);
          const previous = tokens.slice(Math.max(0, tokenIndex - 2), tokenIndex);
          if (
            code === "PROFANITY" &&
            contextual &&
            (recoveredGluedPrefix || previous.some((candidate) => prefixes.has(candidate.value)))
          ) {
            const insultKey = `INSULT:${variant.start}:${variant.end}:${locale}:${pattern.canonical}`;
            if (!seen.has(insultKey)) {
              seen.add(insultKey);
              issues.push({
                code: "INSULT",
                rule: this.id,
                severity: pattern.severity,
                score: issueScore,
                start: variant.start,
                end: variant.end,
                locale,
                matched: input.slice(variant.start, variant.end),
                metadata: {
                  canonical: pattern.canonical,
                  candidate: variant.value,
                  source: variant.source,
                  contextual: true,
                  ...(recoveredGluedPrefix ? { recovery: "glued-insult-prefix", prefix: gluedPrefix } : {})
                }
              });
            }
          }
        }
      }
    }

    if (issues.length === 0) return null;
    return Object.freeze({ rule: this.id, score: maximum, issues: Object.freeze(issues) });
  }
}
