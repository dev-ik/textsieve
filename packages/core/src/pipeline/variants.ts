import type {
  LanguagePack,
  SieveLimits,
  Token,
  TokenVariant,
  TokenVariantSource,
  TransliterationOptions
} from "../types.js";

const LEET_MAP: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "0": ["o", "о"],
  "1": ["i", "l", "и"],
  "3": ["e", "е"],
  "4": ["a", "t", "а", "т"],
  "5": ["s", "с"],
  "6": ["b", "б"],
  "7": ["t", "т"],
  "8": ["b", "в"],
  "9": ["я"]
});

const TO_LATIN: Readonly<Record<string, string>> = Object.freeze({
  а: "a",
  в: "b",
  е: "e",
  і: "i",
  к: "k",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  т: "t",
  у: "y",
  х: "x"
});

const TO_CYRILLIC: Readonly<Record<string, string>> = Object.freeze({
  a: "а",
  b: "в",
  c: "с",
  e: "е",
  h: "н",
  i: "і",
  k: "к",
  m: "м",
  o: "о",
  p: "р",
  t: "т",
  x: "х",
  y: "у"
});

function collapseRepeated(value: string): string {
  const characters = Array.from(value);
  const result: string[] = [];
  for (let index = 0; index < characters.length; ) {
    const character = characters[index];
    if (character === undefined) break;
    let end = index + 1;
    while (characters[end] === character) end += 1;
    result.push(character);
    index = end - index >= 3 ? end : index + 1;
  }
  return result.join("");
}

function replaceMapped(value: string, mapping: Readonly<Record<string, string>>): string {
  return Array.from(value, (character) => mapping[character] ?? character).join("");
}

function leetCandidates(value: string, cap: number): string[] {
  let candidates = [""];
  for (const character of value) {
    const replacements = LEET_MAP[character] ?? [character];
    const next: string[] = [];
    for (const prefix of candidates) {
      for (const replacement of replacements) {
        next.push(prefix + replacement);
        if (next.length >= cap) break;
      }
      if (next.length >= cap) break;
    }
    candidates = next;
  }
  return candidates.filter((candidate) => candidate !== value);
}

function addVariant(
  variants: TokenVariant[],
  seen: Set<string>,
  value: string,
  source: TokenVariantSource,
  start: number,
  end: number,
  cap: number
): void {
  if (!value || seen.has(value) || variants.length >= cap) return;
  seen.add(value);
  variants.push(Object.freeze({ value, source, start, end }));
}

function shouldJoin(tokens: readonly Token[], sanitized: string): boolean {
  if (tokens.length < 2) return false;
  const allSingleCharacters = tokens.every((token) => Array.from(token.value).length === 1);
  let hasObfuscatingSymbol = false;

  for (let index = 1; index < tokens.length; index += 1) {
    const previous = tokens[index - 1];
    const current = tokens[index];
    if (!previous || !current) return false;
    const gap = sanitized.slice(previous.normalizedEnd, current.normalizedStart);
    if (!/^[\s*._@!\-]+$/u.test(gap)) return false;
    if (/[*._@!\-]/u.test(gap)) hasObfuscatingSymbol = true;
  }

  return allSingleCharacters || hasObfuscatingSymbol;
}

function joinedCandidates(tokens: readonly Token[], sanitized: string, cap: number): string[] {
  const first = tokens[0];
  if (!first) return [];
  let candidates = [first.value];
  const gapReplacements: Readonly<Record<string, readonly string[]>> = {
    "!": ["", "i", "и"],
    "@": ["", "a", "я"],
    "*": [""]
  };

  for (let index = 1; index < tokens.length; index += 1) {
    const previous = tokens[index - 1];
    const token = tokens[index];
    if (!previous || !token) break;
    const gap = sanitized.slice(previous.normalizedEnd, token.normalizedStart);
    let separators = [""];
    for (const character of gap) {
      const replacements = gapReplacements[character];
      if (!replacements) continue;
      const next: string[] = [];
      for (const prefix of separators) {
        for (const replacement of replacements) {
          next.push(prefix + replacement);
          if (next.length >= cap) break;
        }
        if (next.length >= cap) break;
      }
      separators = next;
    }

    const nextCandidates: string[] = [];
    for (const prefix of candidates) {
      for (const separator of separators) {
        nextCandidates.push(prefix + separator + token.value);
        if (nextCandidates.length >= cap) break;
      }
      if (nextCandidates.length >= cap) break;
    }
    candidates = nextCandidates;
  }
  return candidates;
}

function transliterationSource(locale: string): TokenVariantSource | undefined {
  if (locale === "ru") return "translit-ru";
  if (locale === "en") return "translit-en";
  return undefined;
}

export function generateTokenVariants(
  tokens: readonly Token[],
  sanitized: string,
  languagePacks: readonly LanguagePack[],
  transliteration: TransliterationOptions,
  limits: SieveLimits
): Token[] {
  const result = tokens.map((token) => {
    const variants: TokenVariant[] = [];
    const seen = new Set<string>();
    addVariant(variants, seen, token.value, "normalized", token.start, token.end, limits.maxVariantsPerToken);

    const collapsed = collapseRepeated(token.value);
    if (collapsed !== token.value) {
      addVariant(variants, seen, collapsed, "deobfuscated", token.start, token.end, limits.maxVariantsPerToken);
    }

    for (const candidate of leetCandidates(token.value, limits.maxVariantsPerToken)) {
      addVariant(variants, seen, candidate, "leet", token.start, token.end, limits.maxVariantsPerToken);
    }

    if (token.script === "mixed") {
      addVariant(
        variants,
        seen,
        replaceMapped(token.value, TO_LATIN),
        "deobfuscated",
        token.start,
        token.end,
        limits.maxVariantsPerToken
      );
      addVariant(
        variants,
        seen,
        replaceMapped(token.value, TO_CYRILLIC),
        "deobfuscated",
        token.start,
        token.end,
        limits.maxVariantsPerToken
      );
    }

    return { token, variants, seen };
  });

  for (let start = 0; start < tokens.length; start += 1) {
    for (let count = 2; count <= limits.maxJoinedTokens && start + count <= tokens.length; count += 1) {
      const window = tokens.slice(start, start + count);
      if (!shouldJoin(window, sanitized)) continue;
      const first = window[0];
      const last = window.at(-1);
      const target = result[start];
      if (!first || !last || !target) continue;
      for (const value of joinedCandidates(window, sanitized, limits.maxVariantsPerToken)) {
        if (Array.from(value).length > 32) continue;
        addVariant(
          target.variants,
          target.seen,
          value,
          "joined",
          first.start,
          last.end,
          limits.maxVariantsPerToken
        );
      }
    }
  }

  if (transliteration.enabled) {
    const targets = new Set(transliteration.targets ?? languagePacks.map((pack) => pack.locale));
    for (const entry of result) {
      const current = [...entry.variants];
      for (const pack of languagePacks) {
        if (!targets.has(pack.locale) || !pack.transliteration) continue;
        const source = transliterationSource(pack.locale);
        if (!source) continue;
        for (const variant of current) {
          const translated = pack.transliteration[variant.value];
          if (!translated) continue;
          addVariant(
            entry.variants,
            entry.seen,
            translated,
            source,
            variant.start,
            variant.end,
            limits.maxVariantsPerToken
          );
        }
      }
    }
  }

  return result.map(({ token, variants }) =>
    Object.freeze({
      ...token,
      variants: Object.freeze(variants)
    })
  );
}
