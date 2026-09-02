import type { MappedText } from "./mapped-text.js";
import { rawSpanForRange } from "./mapped-text.js";
import type { ScriptName, Token } from "../types.js";

const TOKEN_PATTERN = /[\p{L}\p{N}]+(?:[.'’_-][\p{L}\p{N}]+)*/gu;
const LATIN = /\p{Script=Latin}/u;
const CYRILLIC = /\p{Script=Cyrillic}/u;
const DIGIT = /\p{N}/u;

export function detectScript(value: string): ScriptName {
  let latin = false;
  let cyrillic = false;
  let digit = false;
  let other = false;

  for (const character of value) {
    if (LATIN.test(character)) latin = true;
    else if (CYRILLIC.test(character)) cyrillic = true;
    else if (DIGIT.test(character)) digit = true;
    else if (/\p{L}/u.test(character)) other = true;
  }

  const scripts = Number(latin) + Number(cyrillic) + Number(other);
  if (scripts > 1) return "mixed";
  if (latin) return "latin";
  if (cyrillic) return "cyrillic";
  if (digit) return "digit";
  return "other";
}

export function tokenize(mapped: MappedText): Token[] {
  const tokens: Token[] = [];
  TOKEN_PATTERN.lastIndex = 0;

  for (const match of mapped.value.matchAll(TOKEN_PATTERN)) {
    const normalizedStart = match.index;
    const normalizedEnd = normalizedStart + match[0].length;
    const raw = rawSpanForRange(mapped, normalizedStart, normalizedEnd);
    tokens.push(
      Object.freeze({
        value: match[0],
        start: raw.start,
        end: raw.end,
        normalizedStart,
        normalizedEnd,
        script: detectScript(match[0]),
        variants: Object.freeze([])
      })
    );
  }

  return tokens;
}
