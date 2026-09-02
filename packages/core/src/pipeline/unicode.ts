import type { Issue, Token } from "../types.js";
import { isBidiControl, isUnsafeControl, isZeroWidth } from "./mapped-text.js";

export interface UnicodeInspection {
  readonly issues: readonly Issue[];
  readonly signal: number;
}

export function inspectUnicode(input: string, tokens: readonly Token[]): UnicodeInspection {
  const issues: Issue[] = [];

  function appendIssue(next: Issue): void {
    const previous = issues.at(-1);
    if (previous?.code === next.code && previous.end === next.start && previous.start !== undefined && next.end !== undefined) {
      const count = typeof previous.metadata?.["count"] === "number" ? previous.metadata["count"] + 1 : 2;
      issues[issues.length - 1] = {
        ...previous,
        end: next.end,
        matched: input.slice(previous.start, next.end),
        metadata: { ...previous.metadata, count }
      };
      return;
    }
    issues.push(next);
  }

  for (let index = 0; index < input.length; ) {
    const codePoint = input.codePointAt(index);
    if (codePoint === undefined) break;
    const width = codePoint > 0xffff ? 2 : 1;

    if (isZeroWidth(codePoint)) {
      appendIssue({
        code: "ZERO_WIDTH_CHARACTERS",
        rule: "unicode-safety",
        severity: "medium",
        score: 0.7,
        start: index,
        end: index + width,
        matched: input.slice(index, index + width),
        metadata: { codePoint: `U+${codePoint.toString(16).toUpperCase()}` }
      });
    } else if (isBidiControl(codePoint) || isUnsafeControl(codePoint)) {
      appendIssue({
        code: "SUSPICIOUS_UNICODE",
        rule: "unicode-safety",
        severity: "high",
        score: 0.9,
        start: index,
        end: index + width,
        matched: input.slice(index, index + width),
        metadata: { codePoint: `U+${codePoint.toString(16).toUpperCase()}` }
      });
    }
    index += width;
  }

  for (const token of tokens) {
    if (token.script !== "mixed") continue;
    issues.push({
      code: "MIXED_SCRIPT_TOKEN",
      rule: "unicode-safety",
      severity: "medium",
      score: 0.75,
      start: token.start,
      end: token.end,
      matched: input.slice(token.start, token.end)
    });
  }

  return Object.freeze({
    issues: Object.freeze(issues),
    signal: issues.reduce((maximum, issue) => Math.max(maximum, issue.score ?? 0), 0)
  });
}
