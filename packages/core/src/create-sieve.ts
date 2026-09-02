import { normalizeMapped, sanitizeMapped } from "./pipeline/mapped-text.js";
import { computeStats } from "./pipeline/stats.js";
import { tokenize } from "./pipeline/tokenize.js";
import { inspectUnicode } from "./pipeline/unicode.js";
import { generateTokenVariants } from "./pipeline/variants.js";
import { presets } from "./presets.js";
import { genericRules } from "./rules/generic.js";
import { SafetyInspector } from "./rules/safety.js";
import type {
  InspectionResult,
  Issue,
  LanguagePack,
  PolicyConfig,
  PresetConfig,
  RuleContext,
  RuleResult,
  SieveLimits,
  SieveOptions,
  TextRule,
  TextSieve,
  TransliterationOptions
} from "./types.js";

interface ResolvedConfig {
  readonly languagePacks: readonly LanguagePack[];
  readonly expectedLanguage?: string;
  readonly safetyLanguages: readonly string[];
  readonly transliteration: TransliterationOptions;
  readonly policy: PolicyConfig;
  readonly limits: SieveLimits;
  readonly signalWeights: Readonly<Record<string, number>>;
  readonly rules: readonly TextRule[];
}

function snapshotLanguagePack(pack: LanguagePack): LanguagePack {
  return Object.freeze({
    locale: pack.locale,
    patterns: Object.freeze(
      pack.patterns.map((pattern) =>
        Object.freeze({
          ...pattern,
          ...(pattern.exceptions ? { exceptions: Object.freeze([...pattern.exceptions]) } : {})
        })
      )
    ),
    ...(pack.transliteration ? { transliteration: Object.freeze({ ...pack.transliteration }) } : {}),
    ...(pack.vowels ? { vowels: pack.vowels } : {}),
    ...(pack.commonWords ? { commonWords: Object.freeze([...pack.commonWords]) } : {}),
    ...(pack.commonNgrams ? { commonNgrams: Object.freeze([...pack.commonNgrams]) } : {}),
    ...(pack.technicalAllowlist ? { technicalAllowlist: Object.freeze([...pack.technicalAllowlist]) } : {}),
    ...(pack.keyboardRows ? { keyboardRows: Object.freeze([...pack.keyboardRows]) } : {}),
    ...(pack.insultPrefixes ? { insultPrefixes: Object.freeze([...pack.insultPrefixes]) } : {}),
    ...(pack.contextualInsults ? { contextualInsults: Object.freeze([...pack.contextualInsults]) } : {})
  });
}

function validateLanguagePacks(packs: readonly LanguagePack[]): void {
  const locales = new Set<string>();
  for (const pack of packs) {
    if (!pack.locale || locales.has(pack.locale)) {
      throw new TypeError(`Language pack locale must be non-empty and unique: ${pack.locale || "<empty>"}`);
    }
    locales.add(pack.locale);
    const patterns = new Set<string>();
    for (const pattern of pack.patterns) {
      if (!pattern.value || pattern.value !== pattern.value.normalize("NFKC").toLocaleLowerCase("und")) {
        throw new TypeError(`Safety pattern must be normalized and lowercase: ${pattern.value}`);
      }
      const key = `${pattern.category}:${pattern.value}`;
      if (patterns.has(key)) throw new TypeError(`Duplicate safety pattern in ${pack.locale}: ${key}`);
      patterns.add(key);
    }
  }
}

function resolveConfig(options: SieveOptions): ResolvedConfig {
  const selectedPreset: PresetConfig = presets[options.preset ?? "public-form"];
  const languagePacks = Object.freeze((options.languagePacks ?? []).map(snapshotLanguagePack));
  validateLanguagePacks(languagePacks);
  const locales = new Set(languagePacks.map((pack) => pack.locale));
  const safetyLanguages = Object.freeze([...(options.safetyLanguages ?? languagePacks.map((pack) => pack.locale))]);

  if (new Set(safetyLanguages).size !== safetyLanguages.length) {
    throw new TypeError("Safety languages must be unique");
  }
  for (const locale of safetyLanguages) {
    if (!locales.has(locale)) throw new TypeError(`Missing language pack for safety language: ${locale}`);
  }
  if (options.expectedLanguage && !locales.has(options.expectedLanguage)) {
    throw new TypeError(`Missing language pack for expected language: ${options.expectedLanguage}`);
  }
  for (const locale of options.transliteration?.targets ?? []) {
    if (!locales.has(locale)) throw new TypeError(`Missing language pack for transliteration target: ${locale}`);
  }

  const limits = Object.freeze({ ...selectedPreset.limits, ...options.limits });
  if (
    !Number.isSafeInteger(limits.maxInputLength) ||
    limits.maxInputLength <= 0 ||
    !Number.isSafeInteger(limits.maxVariantsPerToken) ||
    limits.maxVariantsPerToken < 1 ||
    !Number.isSafeInteger(limits.maxJoinedTokens) ||
    limits.maxJoinedTokens < 2 ||
    !Number.isSafeInteger(limits.maxIssues) ||
    limits.maxIssues < 1
  ) {
    throw new RangeError("Sieve limits must be positive safe integers");
  }

  const policy = Object.freeze({ ...selectedPreset.policy, ...options.policy });
  if (
    !Number.isFinite(policy.rejectBelow) ||
    !Number.isFinite(policy.reviewBelow) ||
    policy.rejectBelow < 0 ||
    policy.rejectBelow > 100 ||
    policy.reviewBelow < 0 ||
    policy.reviewBelow > 100 ||
    policy.rejectBelow > policy.reviewBelow
  ) {
    throw new RangeError("Policy thresholds must satisfy 0 <= rejectBelow <= reviewBelow <= 100");
  }

  const rules = [...genericRules, ...(options.rules ?? [])];
  const ruleIds = new Set<string>();
  for (const rule of rules) {
    if (!rule.id || ruleIds.has(rule.id)) throw new TypeError(`Rule id must be non-empty and unique: ${rule.id || "<empty>"}`);
    ruleIds.add(rule.id);
  }

  return Object.freeze({
    languagePacks,
    ...(options.expectedLanguage ? { expectedLanguage: options.expectedLanguage } : {}),
    safetyLanguages,
    transliteration: Object.freeze({
      enabled: options.transliteration?.enabled ?? false,
      ...(options.transliteration?.targets
        ? { targets: Object.freeze([...options.transliteration.targets]) }
        : {})
    }),
    policy,
    limits,
    signalWeights: selectedPreset.signalWeights,
    rules: Object.freeze(rules)
  });
}

function validateRuleResult(rule: TextRule, result: RuleResult): void {
  if (result.rule !== rule.id) {
    throw new TypeError(`Rule ${rule.id} returned a result for ${result.rule}`);
  }
  if (!Number.isFinite(result.score) || result.score < 0 || result.score > 1) {
    throw new RangeError(`Rule ${rule.id} returned a score outside 0..1`);
  }
}

function qualityScore(results: readonly RuleResult[], weights: Readonly<Record<string, number>>): number {
  const penalty = results.reduce((sum, ruleResult) => sum + ruleResult.score * (weights[ruleResult.rule] ?? 10), 0);
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function decide(score: number, issues: readonly Issue[], policy: PolicyConfig): InspectionResult["decision"] {
  const severeSafety = issues.some(
    (issue) => issue.rule === "safety-match" && issue.severity === "high" && (issue.score ?? 0) >= 0.85
  );
  if (policy.rejectHighSeveritySafety && severeSafety) return "reject";
  if (score <= policy.rejectBelow) return "reject";
  if (score <= policy.reviewBelow) return "review";
  return "allow";
}

function sortIssues(issues: readonly Issue[]): Issue[] {
  return issues
    .map((issue) =>
      Object.freeze({
        ...issue,
        ...(issue.metadata ? { metadata: Object.freeze({ ...issue.metadata }) } : {})
      })
    )
    .sort(
      (left, right) =>
        (left.start ?? Number.MAX_SAFE_INTEGER) - (right.start ?? Number.MAX_SAFE_INTEGER) ||
        (left.end ?? Number.MAX_SAFE_INTEGER) - (right.end ?? Number.MAX_SAFE_INTEGER) ||
        left.code.localeCompare(right.code)
    );
}

function issuePriority(issue: Issue): number {
  const severity = { info: 1, low: 2, medium: 3, high: 4 }[issue.severity];
  const decisionEvidence =
    issue.rule === "safety-match" && issue.severity === "high"
      ? 100
      : issue.code === "INPUT_TOO_LONG" || issue.code === "EMPTY_AFTER_NORMALIZATION"
        ? 90
        : 0;
  return decisionEvidence + severity * 10 + (issue.score ?? 0);
}

function limitIssues(issues: readonly Issue[], maximum: number): readonly Issue[] {
  if (issues.length <= maximum) return Object.freeze([...issues]);
  const selected = [...issues]
    .sort(
      (left, right) =>
        issuePriority(right) - issuePriority(left) ||
        (left.start ?? Number.MAX_SAFE_INTEGER) - (right.start ?? Number.MAX_SAFE_INTEGER)
    )
    .slice(0, maximum);
  return Object.freeze(sortIssues(selected));
}

function inputTooLong(input: string, limit: number): InspectionResult {
  const issue: Issue = Object.freeze({
    code: "INPUT_TOO_LONG",
    rule: "input-length",
    severity: "high",
    score: 1,
    start: limit,
    end: input.length,
    metadata: Object.freeze({ actualLength: input.length, maxInputLength: limit })
  });
  return Object.freeze({
    decision: "reject",
    score: 0,
    input,
    normalized: "",
    sanitized: "",
    signals: Object.freeze({ "input-length": 1 }),
    issues: Object.freeze([issue]),
    meta: Object.freeze({
      inputLength: input.length,
      tokenCount: 0,
      variantCount: 0,
      totalIssueCount: 1,
      issuesTruncated: false,
      appliedRules: Object.freeze(["input-length"]),
      truncated: true
    })
  });
}

export function createSieve(options: SieveOptions = {}): TextSieve {
  const config = resolveConfig(options);
  const activeSafetyPacks = config.languagePacks.filter((pack) => config.safetyLanguages.includes(pack.locale));
  const safetyInspector = new SafetyInspector(activeSafetyPacks);

  function normalize(text: string): string {
    if (typeof text !== "string") throw new TypeError("TextSieve input must be a string");
    return normalizeMapped(text).value;
  }

  function sanitize(text: string): string {
    if (typeof text !== "string") throw new TypeError("TextSieve input must be a string");
    return sanitizeMapped(normalizeMapped(text)).value;
  }

  function inspect(text: string): InspectionResult {
    if (typeof text !== "string") throw new TypeError("TextSieve input must be a string");
    if (text.length > config.limits.maxInputLength) return inputTooLong(text, config.limits.maxInputLength);

    const normalized = normalizeMapped(text);
    const sanitized = sanitizeMapped(normalized);
    const bareTokens = tokenize(sanitized);
    const tokens = generateTokenVariants(
      bareTokens,
      sanitized.value,
      config.languagePacks,
      config.transliteration,
      config.limits
    );
    const stats = computeStats(text, sanitized.value, tokens);
    const context: RuleContext = Object.freeze({
      input: text,
      normalized: normalized.value,
      sanitized: sanitized.value,
      tokens: Object.freeze(tokens),
      stats,
      ...(config.expectedLanguage ? { expectedLanguage: config.expectedLanguage } : {}),
      safetyLanguages: config.safetyLanguages,
      languagePacks: config.languagePacks
    });

    const results: RuleResult[] = [];
    const unicode = inspectUnicode(text, tokens);
    if (unicode.issues.length > 0) {
      results.push({ rule: "unicode-safety", score: unicode.signal, issues: unicode.issues });
    }
    const safety = safetyInspector.inspect(text, tokens);
    if (safety) results.push(safety);
    for (const rule of config.rules) {
      const ruleResult = rule.inspect(context);
      if (ruleResult) {
        validateRuleResult(rule, ruleResult);
        results.push(ruleResult);
      }
    }

    const signals: Record<string, number> = {};
    for (const ruleResult of results) {
      signals[ruleResult.rule] = Math.max(signals[ruleResult.rule] ?? 0, ruleResult.score);
    }
    const score = qualityScore(results, config.signalWeights);
    const allIssues = sortIssues(results.flatMap((ruleResult) => ruleResult.issues ?? []));
    const issuesTruncated = allIssues.length > config.limits.maxIssues;
    const issues = limitIssues(allIssues, config.limits.maxIssues);
    const appliedRules = Object.freeze([
      "unicode-safety",
      "safety-match",
      ...config.rules.map((rule) => rule.id)
    ]);

    return Object.freeze({
      decision: decide(score, allIssues, config.policy),
      score,
      input: text,
      normalized: normalized.value,
      sanitized: sanitized.value,
      signals: Object.freeze(signals),
      issues,
      meta: Object.freeze({
        inputLength: text.length,
        tokenCount: tokens.length,
        variantCount: tokens.reduce((sum, token) => sum + token.variants.length, 0),
        totalIssueCount: allIssues.length,
        issuesTruncated,
        appliedRules,
        truncated: false
      })
    });
  }

  return Object.freeze({
    inspect,
    check(text: string) {
      return inspect(text).decision === "allow";
    },
    normalize,
    sanitize
  });
}
