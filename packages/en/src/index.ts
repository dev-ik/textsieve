import type { LanguagePack } from "@textsieve/core";

const patterns = Object.freeze([
  { value: "fuck", canonical: "fuck", category: "profanity", severity: "high" },
  { value: "fck", canonical: "fuck", category: "profanity", severity: "high" },
  { value: "fucks", canonical: "fuck", category: "profanity", severity: "high" },
  { value: "fucked", canonical: "fuck", category: "profanity", severity: "high" },
  { value: "fucking", canonical: "fuck", category: "profanity", severity: "high" },
  { value: "fucker", canonical: "fuck", category: "profanity", severity: "high" },
  { value: "motherfucker", canonical: "motherfucker", category: "insult", severity: "high" },
  { value: "shit", canonical: "shit", category: "profanity", severity: "high" },
  { value: "shitty", canonical: "shit", category: "profanity", severity: "high" },
  { value: "bullshit", canonical: "bullshit", category: "profanity", severity: "high" },
  { value: "bitch", canonical: "bitch", category: "insult", severity: "high" },
  { value: "bich", canonical: "bitch", category: "insult", severity: "high" },
  { value: "bitches", canonical: "bitch", category: "insult", severity: "high" },
  { value: "asshole", canonical: "asshole", category: "insult", severity: "high" },
  { value: "assholes", canonical: "asshole", category: "insult", severity: "high" },
  { value: "bastard", canonical: "bastard", category: "insult", severity: "high" },
  { value: "dumbass", canonical: "dumbass", category: "insult", severity: "high" },
  { value: "dickhead", canonical: "dickhead", category: "insult", severity: "high" },
  { value: "fuckface", canonical: "fuckface", category: "insult", severity: "high" },
  { value: "cunt", canonical: "cunt", category: "insult", severity: "high" },
  { value: "twat", canonical: "twat", category: "insult", severity: "high" },
  { value: "wanker", canonical: "wanker", category: "insult", severity: "high" },
  { value: "idiot", canonical: "idiot", category: "insult", severity: "medium" },
  { value: "idiots", canonical: "idiot", category: "insult", severity: "medium" },
  { value: "moron", canonical: "moron", category: "insult", severity: "medium" },
  { value: "morons", canonical: "moron", category: "insult", severity: "medium" },
  { value: "stupid", canonical: "stupid", category: "insult", severity: "medium" },
  { value: "cretin", canonical: "cretin", category: "insult", severity: "medium" },
  { value: "imbecile", canonical: "imbecile", category: "insult", severity: "medium" }
] as const);

export const en = Object.freeze({
  locale: "en",
  patterns,
  vowels: "aeiouy",
  commonWords: Object.freeze(["the", "and", "you", "this", "that", "for", "with", "are", "how", "today"]),
  commonNgrams: Object.freeze([
    "th", "he", "in", "er", "an", "re", "on", "at", "en", "nd", "ti", "es", "or", "te", "of", "ed",
    "is", "it", "al", "ar", "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le", "ve", "co",
    "me", "de", "hi", "ri", "ro", "ic", "ne", "ea", "ra", "ce", "li", "ch", "ll", "be", "ma", "si"
  ]),
  technicalAllowlist: Object.freeze([
    "react",
    "typescript",
    "javascript",
    "node.js",
    "next.js",
    "postgresql",
    "oauth2",
    "openapi",
    "npm",
    "pnpm",
    "sdk",
    "api",
    "dev-ik"
  ]),
  keyboardRows: Object.freeze(["qwertyuiop", "asdfghjkl", "zxcvbnm"]),
  insultPrefixes: Object.freeze(["you", "your"]),
  contextualInsults: Object.freeze([])
} as const satisfies LanguagePack);

export default en;
