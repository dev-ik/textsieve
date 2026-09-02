# ADR 0006 — Adversarial text variants

English | [Русский](0006-adversarial-variants.ru.md)

Status: proposed

Users bypass word filters with:
- typos;
- digit/symbol substitutions;
- spaces between letters;
- repeated letters;
- glued words;
- transliteration.

TextSieve handles only deterministic conservative variants.

Pipeline:
raw token -> normalized token -> deobfuscated candidates -> transliteration candidates -> matcher.

Do not use unconstrained fuzzy edit distance. False-positive safety is a first-class requirement.
