# ADR 0004 — Expected language vs safety language

English | [Русский](0004-language-and-safety.ru.md)

Status: accepted design constraint

`expectedLanguage` and `safetyLanguages` are independent.

A Russian field can accept technical English terms while still detecting English profanity.

Transliteration creates match candidates per token; it never overwrites the original/normalized text.

This avoids treating normal multilingual technical text as invalid while still catching cross-language abuse.
