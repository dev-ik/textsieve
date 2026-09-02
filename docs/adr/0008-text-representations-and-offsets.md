# ADR 0008 — Derived text representations and raw offsets

English | [Русский](0008-text-representations-and-offsets.ru.md)

Status: accepted

## Context

Unicode normalization, control-character removal and whitespace collapsing can change string length. Issues still need meaningful source positions.

## Decision

The engine keeps raw input unchanged and creates mapped derived buffers for normalized and sanitized text. Every derived UTF-16 code unit maps to a half-open range in the raw input. Public `Issue.start` and `Issue.end` always refer to raw-input UTF-16 offsets.

Normalization uses per-grapheme NFKC and lowercase conversion. Sanitization removes zero-width, bidi and unsafe control characters and collapses whitespace without mutating the normalized representation.

## Consequences

- Consumers can highlight the exact source span that caused an issue.
- Pipeline stages carry a small mapping overhead.
- Normalization and sanitization remain inspectable rather than silently replacing input.
