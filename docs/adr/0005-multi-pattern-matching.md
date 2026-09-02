# ADR 0005 — Multi-pattern safety matching

English | [Русский](0005-multi-pattern-matching.ru.md)

Status: proposed

Large static profanity/insult dictionaries should use a compiled multi-pattern matcher.

Primary candidate: Aho–Corasick.

Reasons:
- deterministic;
- well suited to matching many patterns in one input;
- avoids N full-string scans;
- suitable for synchronous form/chat filtering.

Benchmark against a simpler implementation before committing. Keep matcher internal so implementation can change without public API breakage.

Pattern metadata must preserve canonical word, locale, rule/severity and exception information.
