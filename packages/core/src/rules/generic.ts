import type { Issue, LanguagePack, RuleContext, RuleResult, TextRule, Token } from "../types.js";

const LANGUAGE_URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>{}\[\]]+/giu;
const LANGUAGE_EMAIL_PATTERN = /\b[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}\b/giu;
const LANGUAGE_WORD_PATTERN = /[\p{L}\p{N}]+(?:[.'’_-][\p{L}\p{N}]+)*/gu;

function result(rule: string, score: number, issues: readonly Issue[]): RuleResult | null {
  if (issues.length === 0 || score <= 0) return null;
  return Object.freeze({ rule, score: Math.min(1, Math.max(0, score)), issues: Object.freeze([...issues]) });
}

function issue(
  code: Issue["code"],
  rule: string,
  severity: Issue["severity"],
  score: number,
  token?: Token,
  metadata?: Readonly<Record<string, unknown>>
): Issue {
  return Object.freeze({
    code,
    rule,
    severity,
    score,
    ...(token ? { start: token.start, end: token.end, matched: token.value } : {}),
    ...(metadata ? { metadata } : {})
  });
}

const emptyContentRule: TextRule = {
  id: "empty-content",
  inspect(context) {
    if (context.sanitized.length > 0) return null;
    return result(this.id, 1, [issue("EMPTY_AFTER_NORMALIZATION", this.id, "high", 1)]);
  }
};

function longestRun(value: string): { readonly character: string; readonly length: number } {
  let bestCharacter = "";
  let bestLength = 0;
  let currentCharacter = "";
  let currentLength = 0;
  for (const character of value) {
    if (character === currentCharacter) currentLength += 1;
    else {
      currentCharacter = character;
      currentLength = 1;
    }
    if (currentLength > bestLength) {
      bestCharacter = character;
      bestLength = currentLength;
    }
  }
  return { character: bestCharacter, length: bestLength };
}

const charRepetitionRule: TextRule = {
  id: "char-repetition",
  inspect(context) {
    const issues: Issue[] = [];
    let maximum = 0;
    for (const token of context.tokens) {
      const run = longestRun(token.value);
      if (run.length < 4) continue;
      const score = Math.min(1, (run.length - 3) / 6);
      maximum = Math.max(maximum, score);
      issues.push(issue("CHAR_REPETITION", this.id, score >= 0.7 ? "medium" : "low", score, token, run));
    }
    return result(this.id, maximum, issues);
  }
};

const wordRepetitionRule: TextRule = {
  id: "word-repetition",
  inspect(context) {
    if (context.tokens.length < 3) return null;
    const issues: Issue[] = [];
    let maximum = 0;
    let longest = 1;
    let current = 1;
    let repeatedToken: Token | undefined;
    for (let index = 1; index < context.tokens.length; index += 1) {
      const previous = context.tokens[index - 1];
      const token = context.tokens[index];
      if (!previous || !token) continue;
      if (previous.value === token.value) {
        current += 1;
        if (current > longest) {
          longest = current;
          repeatedToken = token;
        }
      } else current = 1;
    }
    if (longest >= 3 && repeatedToken) {
      const score = Math.min(1, (longest - 2) / 4);
      maximum = Math.max(maximum, score);
      issues.push(
        issue("WORD_REPETITION", this.id, score >= 0.7 ? "medium" : "low", score, repeatedToken, {
          kind: "consecutive-word",
          repetitions: longest
        })
      );
    }

    if (context.tokens.length >= 6 && context.stats.uniqueTokenRatio < 0.5) {
      const score = Math.min(1, (0.55 - context.stats.uniqueTokenRatio) * 2.5);
      maximum = Math.max(maximum, score);
      issues.push(
        issue("WORD_REPETITION", this.id, "medium", score, undefined, {
          kind: "low-lexical-diversity",
          uniqueTokenRatio: context.stats.uniqueTokenRatio
        })
      );
    }

    if (context.tokens.length >= 6) {
      for (const size of [2, 3]) {
        const counts = new Map<string, { count: number; token: Token }>();
        for (let index = 0; index + size <= context.tokens.length; index += 1) {
          const window = context.tokens.slice(index, index + size);
          const first = window[0];
          if (!first) continue;
          const key = window.map((token) => token.value).join("\u0000");
          const previous = counts.get(key);
          counts.set(key, { count: (previous?.count ?? 0) + 1, token: first });
        }
        const repeated = [...counts.values()].find((entry) => entry.count >= 3);
        if (!repeated) continue;
        const score = Math.min(1, repeated.count / 4);
        maximum = Math.max(maximum, score);
        issues.push(
          issue("WORD_REPETITION", this.id, "medium", score, repeated.token, {
            kind: "repeated-phrase",
            phraseLength: size,
            repetitions: repeated.count
          })
        );
        break;
      }
    }

    return result(this.id, maximum, issues);
  }
};

const capsRule: TextRule = {
  id: "excessive-caps",
  inspect(context) {
    if (context.stats.letters < 6) return null;
    const ratio = context.stats.uppercaseLetters / context.stats.letters;
    if (ratio < 0.75) return null;
    const score = Math.min(1, (ratio - 0.6) / 0.4);
    return result(this.id, score, [
      issue("EXCESSIVE_CAPS", this.id, ratio >= 0.95 ? "medium" : "low", score, undefined, { ratio })
    ]);
  }
};

const punctuationRule: TextRule = {
  id: "excessive-punctuation",
  inspect(context) {
    if (context.input.length < 4) return null;
    const ratio = context.stats.punctuation / Math.max(1, Array.from(context.input).length);
    const punctuationRuns = context.input.match(/[!?.,;:]{4,}/gu) ?? [];
    if (ratio < 0.3 && punctuationRuns.length === 0) return null;
    const longest = punctuationRuns.reduce((maximum, run) => Math.max(maximum, run.length), 0);
    const score = Math.min(1, Math.max(ratio * 1.5, longest / 12));
    return result(this.id, score, [
      issue("EXCESSIVE_PUNCTUATION", this.id, score >= 0.7 ? "medium" : "low", score, undefined, {
        ratio,
        longestRun: longest
      })
    ]);
  }
};

const contactDensityRule: TextRule = {
  id: "contact-density",
  inspect(context) {
    const issues: Issue[] = [];
    let score = 0;
    if (context.stats.urlCount > 2) {
      const value = Math.min(1, (context.stats.urlCount - 1) / 4);
      score = Math.max(score, value);
      issues.push(issue("TOO_MANY_URLS", this.id, "medium", value, undefined, { count: context.stats.urlCount }));
    }
    if (context.stats.emailCount > 2) {
      const value = Math.min(1, (context.stats.emailCount - 1) / 4);
      score = Math.max(score, value);
      issues.push(issue("TOO_MANY_EMAILS", this.id, "medium", value, undefined, { count: context.stats.emailCount }));
    }
    if (context.stats.phoneCount > 2) {
      const value = Math.min(1, (context.stats.phoneCount - 1) / 4);
      score = Math.max(score, value);
      issues.push(issue("TOO_MANY_PHONES", this.id, "medium", value, undefined, { count: context.stats.phoneCount }));
    }
    return result(this.id, score, issues);
  }
};

function includesKeyboardSequence(value: string, rows: readonly string[]): boolean {
  if (Array.from(value).length < 6) return false;
  const characters = Array.from(value);
  for (const row of rows) {
    const rowCharacters = new Set(Array.from(row));
    const concentration = characters.filter((character) => rowCharacters.has(character)).length / characters.length;
    if (characters.length >= 9 && concentration >= 0.9) return true;
    const reverse = Array.from(row).reverse().join("");
    for (let length = Math.min(Array.from(value).length, row.length); length >= 6; length -= 1) {
      for (let start = 0; start + length <= value.length; start += 1) {
        const part = value.slice(start, start + length);
        if (row.includes(part) || reverse.includes(part)) return true;
      }
    }
  }
  return false;
}

const keyboardSmashRule: TextRule = {
  id: "keyboard-smash",
  inspect(context) {
    const rows = context.languagePacks.flatMap((pack) => pack.keyboardRows ?? []);
    const issues: Issue[] = [];
    for (const token of context.tokens) {
      if (!includesKeyboardSequence(token.value, rows)) continue;
      issues.push(issue("KEYBOARD_SMASH", this.id, "high", 0.95, token));
    }
    return result(this.id, issues.length > 0 ? 0.95 : 0, issues);
  }
};

function packForToken(token: Token, packs: readonly LanguagePack[]): LanguagePack | undefined {
  if (token.script === "cyrillic") return packs.find((pack) => pack.locale === "ru");
  if (token.script === "latin") return packs.find((pack) => pack.locale === "en");
  return undefined;
}

function ngramRatio(value: string, ngrams: readonly string[]): number {
  const characters = Array.from(value);
  if (characters.length < 2) return 1;
  const known = new Set(ngrams);
  let hits = 0;
  for (let index = 0; index < characters.length - 1; index += 1) {
    if (known.has(`${characters[index]}${characters[index + 1]}`)) hits += 1;
  }
  return hits / (characters.length - 1);
}

function keyboardRowConcentration(value: string, rows: readonly string[]): number {
  const characters = Array.from(value);
  if (characters.length === 0) return 0;
  return rows.reduce((maximum, row) => {
    const rowCharacters = new Set(Array.from(row));
    const ratio = characters.filter((character) => rowCharacters.has(character)).length / characters.length;
    return Math.max(maximum, ratio);
  }, 0);
}

const gibberishRule: TextRule = {
  id: "gibberish",
  inspect(context) {
    const issues: Issue[] = [];
    let maximum = 0;
    for (const token of context.tokens) {
      const length = Array.from(token.value).length;
      if (length < 9) continue;
      if (/[\d._-]/u.test(token.value)) continue;
      const pack = packForToken(token, context.languagePacks);
      if (!pack) continue;
      const allowlist = new Set(pack.technicalAllowlist ?? []);
      if (allowlist.has(token.value)) continue;

      const uniqueRatio = new Set(Array.from(token.value)).size / length;
      const vowels = new Set(Array.from(pack.vowels ?? ""));
      const vowelRatio = Array.from(token.value).filter((character) => vowels.has(character)).length / length;
      const plausibleNgrams = ngramRatio(token.value, pack.commonNgrams ?? []);
      const keyboardConcentration = keyboardRowConcentration(token.value, pack.keyboardRows ?? []);
      const suspicious =
        vowelRatio === 0 ||
        uniqueRatio < 0.3 ||
        keyboardConcentration >= 0.9 ||
        (length >= 15 && (pack.commonNgrams?.length ?? 0) > 0 && plausibleNgrams < 0.18);
      if (!suspicious) continue;
      const score = Math.min(1, Math.max(0.65, (0.25 - plausibleNgrams) * 2.5));
      maximum = Math.max(maximum, score);
      issues.push(
        issue("GIBBERISH_HIGH", this.id, score >= 0.8 ? "high" : "medium", score, token, {
          uniqueRatio,
          vowelRatio,
          plausibleNgrams,
          keyboardConcentration
        })
      );
    }
    return result(this.id, maximum, issues);
  }
};

const languageMismatchRule: TextRule = {
  id: "language-mismatch",
  inspect(context) {
    const expected = context.expectedLanguage;
    if (!expected || context.stats.letters < 8 || context.tokens.length < 2) return null;
    const pack = context.languagePacks.find((candidate) => candidate.locale === expected);
    if (!pack) return null;
    const allowlist = new Set(pack.technicalAllowlist ?? []);
    const languageSample = context.sanitized
      .replace(LANGUAGE_URL_PATTERN, " ")
      .replace(LANGUAGE_EMAIL_PATTERN, " ");
    const words = Array.from(languageSample.matchAll(LANGUAGE_WORD_PATTERN), (match) => match[0]);
    const meaningful = words.filter((word) => !allowlist.has(word) && !/[\d._-]/u.test(word));
    if (meaningful.length < 2) return null;

    let letters = 0;
    let latinLetters = 0;
    let cyrillicLetters = 0;
    for (const character of languageSample) {
      if (!/\p{L}/u.test(character)) continue;
      letters += 1;
      if (/\p{Script=Latin}/u.test(character)) latinLetters += 1;
      if (/\p{Script=Cyrillic}/u.test(character)) cyrillicLetters += 1;
    }
    if (letters < 8) return null;

    const latinRatio = latinLetters / letters;
    const cyrillicRatio = cyrillicLetters / letters;
    const mismatch =
      expected === "ru" ? latinRatio >= 0.8 && cyrillicRatio < 0.2 : expected === "en" ? cyrillicRatio >= 0.8 : false;
    if (!mismatch) return null;
    const score = expected === "ru" ? latinRatio : cyrillicRatio;
    return result(this.id, score, [
      issue("LANGUAGE_MISMATCH", this.id, "medium", score, undefined, {
        expectedLanguage: expected,
        latinRatio,
        cyrillicRatio
      })
    ]);
  }
};

export const genericRules: readonly TextRule[] = Object.freeze([
  emptyContentRule,
  charRepetitionRule,
  wordRepetitionRule,
  capsRule,
  punctuationRule,
  contactDensityRule,
  keyboardSmashRule,
  gibberishRule,
  languageMismatchRule
]);
