export type Decision = "allow" | "review" | "reject";

export type IssueSeverity = "info" | "low" | "medium" | "high";

export type IssueCode =
  | "PROFANITY"
  | "INSULT"
  | "GIBBERISH_HIGH"
  | "CHAR_REPETITION"
  | "WORD_REPETITION"
  | "KEYBOARD_SMASH"
  | "EXCESSIVE_CAPS"
  | "EXCESSIVE_PUNCTUATION"
  | "TOO_MANY_URLS"
  | "TOO_MANY_EMAILS"
  | "TOO_MANY_PHONES"
  | "SUSPICIOUS_UNICODE"
  | "ZERO_WIDTH_CHARACTERS"
  | "MIXED_SCRIPT_TOKEN"
  | "LANGUAGE_MISMATCH"
  | "EMPTY_AFTER_NORMALIZATION"
  | "INPUT_TOO_LONG";

export interface Issue {
  readonly code: IssueCode;
  readonly rule: string;
  readonly severity: IssueSeverity;
  readonly score?: number;
  /** Half-open UTF-16 offset in the original input. */
  readonly start?: number;
  /** Half-open UTF-16 offset in the original input. */
  readonly end?: number;
  readonly locale?: string;
  readonly matched?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type TokenVariantSource =
  | "normalized"
  | "deobfuscated"
  | "translit-ru"
  | "translit-en"
  | "leet"
  | "joined";

export interface TokenVariant {
  readonly value: string;
  readonly source: TokenVariantSource;
  readonly start: number;
  readonly end: number;
}

export type ScriptName = "cyrillic" | "latin" | "digit" | "mixed" | "other";

export interface Token {
  readonly value: string;
  readonly start: number;
  readonly end: number;
  readonly normalizedStart: number;
  readonly normalizedEnd: number;
  readonly script: ScriptName;
  readonly variants: readonly TokenVariant[];
}

export interface TextStats {
  readonly length: number;
  readonly letters: number;
  readonly uppercaseLetters: number;
  readonly punctuation: number;
  readonly digits: number;
  readonly whitespace: number;
  readonly tokenCount: number;
  readonly uniqueTokenRatio: number;
  /** Shannon entropy in bits per non-whitespace character. */
  readonly entropy: number;
  readonly latinLetters: number;
  readonly cyrillicLetters: number;
  readonly urlCount: number;
  readonly emailCount: number;
  readonly phoneCount: number;
}

export interface RuleContext {
  readonly input: string;
  readonly normalized: string;
  readonly sanitized: string;
  readonly tokens: readonly Token[];
  readonly stats: TextStats;
  readonly expectedLanguage?: string;
  readonly safetyLanguages: readonly string[];
  readonly languagePacks: readonly LanguagePack[];
}

export interface RuleResult {
  readonly rule: string;
  /** Problem signal: 0 means absent, 1 means strongest. */
  readonly score: number;
  readonly issues?: readonly Issue[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface TextRule {
  readonly id: string;
  inspect(context: RuleContext): RuleResult | null;
}

export type SafetyCategory = "profanity" | "insult";

export interface SafetyPattern {
  readonly value: string;
  readonly canonical: string;
  readonly category: SafetyCategory;
  readonly severity: IssueSeverity;
  readonly exceptions?: readonly string[];
}

export interface LanguagePack {
  readonly locale: string;
  readonly patterns: readonly SafetyPattern[];
  readonly transliteration?: Readonly<Record<string, string>>;
  readonly vowels?: string;
  readonly commonWords?: readonly string[];
  readonly commonNgrams?: readonly string[];
  readonly technicalAllowlist?: readonly string[];
  readonly keyboardRows?: readonly string[];
  readonly insultPrefixes?: readonly string[];
  readonly contextualInsults?: readonly string[];
}

export interface TransliterationOptions {
  readonly enabled: boolean;
  readonly targets?: readonly string[];
}

export interface SieveLimits {
  readonly maxInputLength: number;
  readonly maxVariantsPerToken: number;
  readonly maxJoinedTokens: number;
  readonly maxIssues: number;
}

export interface PolicyConfig {
  readonly reviewBelow: number;
  readonly rejectBelow: number;
  readonly rejectHighSeveritySafety: boolean;
}

export interface PresetConfig {
  readonly policy: PolicyConfig;
  readonly signalWeights: Readonly<Record<string, number>>;
  readonly limits: SieveLimits;
}

export type PresetName = "lenient" | "public-form" | "comment" | "username" | "strict";

export interface SieveOptions {
  readonly languagePacks?: readonly LanguagePack[];
  readonly expectedLanguage?: string;
  readonly safetyLanguages?: readonly string[];
  readonly transliteration?: TransliterationOptions;
  readonly preset?: PresetName;
  readonly rules?: readonly TextRule[];
  readonly policy?: Partial<PolicyConfig>;
  readonly limits?: Partial<SieveLimits>;
}

export interface InspectionMeta {
  readonly inputLength: number;
  readonly tokenCount: number;
  readonly variantCount: number;
  readonly totalIssueCount: number;
  readonly issuesTruncated: boolean;
  readonly appliedRules: readonly string[];
  readonly truncated: boolean;
}

export interface InspectionResult {
  readonly decision: Decision;
  readonly score: number;
  readonly input: string;
  readonly normalized: string;
  readonly sanitized: string;
  readonly signals: Readonly<Record<string, number>>;
  readonly issues: readonly Issue[];
  readonly meta: InspectionMeta;
}

export interface TextSieve {
  inspect(text: string): InspectionResult;
  check(text: string): boolean;
  normalize(text: string): string;
  sanitize(text: string): string;
}
