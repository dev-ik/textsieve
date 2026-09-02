# Regular-expression safety audit

English | [Русский](REGEX_AUDIT.ru.md)

Audit date: 2026-09-02

TextSieve limits default inspected input to 10,000 UTF-16 code units. The username and strict presets use smaller limits. Over-limit text is rejected before normalization or regular-expression evaluation.

## Runtime expressions

| Area | Shape | Risk assessment |
| --- | --- | --- |
| Tokenization | Unicode letter/number runs separated by one punctuation character | Linear scan; no nested ambiguous quantifiers |
| URLs | Fixed protocol prefix followed by a negated character class | Linear scan |
| Emails | Local/domain character classes and final letter suffix | Bounded by input limit; no alternation inside repetitions |
| Phones | Optional plus and a flat digit/space/punctuation class | Linear scan |
| Punctuation runs | One fixed punctuation class | Linear scan |
| Language sampling | Same bounded URL/email/token forms | Same bounds as the primary statistics pass |
| Joined-token gaps | Anchored flat whitespace/symbol class | Applied only to short token windows |

No runtime expression uses backreferences, lookbehind, nested `.*`, repeated alternation or user-provided expression source.

## Adversarial verification

Tests exercise maximum-length non-matching emails, repeated URL prefixes, phone-like digits, punctuation and obfuscation separators. Token variants are capped per token, issues are capped per result and consecutive Unicode issues are coalesced.

Any new or changed runtime expression requires a maximum-length adversarial test and another audit of its backtracking structure.
