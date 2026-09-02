import type { TextStats, Token } from "../types.js";

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>{}\[\]]+/giu;
const EMAIL_PATTERN = /\b[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}\b/giu;
const PHONE_PATTERN = /(?:\+?\d[\d ()-]{7,}\d)/gu;

function countMatches(value: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  return Array.from(value.matchAll(pattern)).length;
}

function computeEntropy(value: string): number {
  const characters = Array.from(value).filter((character) => !/\s/u.test(character));
  if (characters.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const character of characters) counts.set(character, (counts.get(character) ?? 0) + 1);
  return [...counts.values()].reduce((entropy, count) => {
    const probability = count / characters.length;
    return entropy - probability * Math.log2(probability);
  }, 0);
}

export function computeStats(input: string, sanitized: string, tokens: readonly Token[]): TextStats {
  let letters = 0;
  let uppercaseLetters = 0;
  let punctuation = 0;
  let digits = 0;
  let whitespace = 0;
  let latinLetters = 0;
  let cyrillicLetters = 0;

  for (const character of input) {
    if (/\p{L}/u.test(character)) {
      letters += 1;
      if (character === character.toLocaleUpperCase("und") && character !== character.toLocaleLowerCase("und")) {
        uppercaseLetters += 1;
      }
      if (/\p{Script=Latin}/u.test(character)) latinLetters += 1;
      if (/\p{Script=Cyrillic}/u.test(character)) cyrillicLetters += 1;
    } else if (/\p{P}/u.test(character)) punctuation += 1;
    else if (/\p{N}/u.test(character)) digits += 1;
    else if (/\s/u.test(character)) whitespace += 1;
  }

  const uniqueTokens = new Set(tokens.map((token) => token.value));

  return Object.freeze({
    length: input.length,
    letters,
    uppercaseLetters,
    punctuation,
    digits,
    whitespace,
    tokenCount: tokens.length,
    uniqueTokenRatio: tokens.length === 0 ? 1 : uniqueTokens.size / tokens.length,
    entropy: computeEntropy(sanitized),
    latinLetters,
    cyrillicLetters,
    urlCount: countMatches(sanitized, URL_PATTERN),
    emailCount: countMatches(sanitized, EMAIL_PATTERN),
    phoneCount: countMatches(sanitized, PHONE_PATTERN)
  });
}
