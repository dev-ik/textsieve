import type { PresetConfig, PresetName } from "./types.js";

const baseWeights = Object.freeze({
  "input-length": 100,
  "empty-content": 100,
  "safety-match": 65,
  "unicode-safety": 30,
  "char-repetition": 20,
  "word-repetition": 30,
  "excessive-caps": 18,
  "excessive-punctuation": 20,
  "contact-density": 30,
  "keyboard-smash": 30,
  gibberish: 35,
  "language-mismatch": 15
});

function preset(
  reviewBelow: number,
  rejectBelow: number,
  rejectHighSeveritySafety: boolean,
  maxInputLength: number
): PresetConfig {
  return Object.freeze({
    policy: Object.freeze({ reviewBelow, rejectBelow, rejectHighSeveritySafety }),
    signalWeights: baseWeights,
    limits: Object.freeze({
      maxInputLength,
      maxVariantsPerToken: 24,
      maxJoinedTokens: 8,
      maxIssues: 100
    })
  });
}

export const presets: Readonly<Record<PresetName, PresetConfig>> = Object.freeze({
  lenient: preset(65, 25, false, 20_000),
  "public-form": preset(85, 45, true, 10_000),
  comment: preset(80, 40, true, 20_000),
  username: preset(90, 55, true, 256),
  strict: preset(92, 60, true, 5_000)
});
