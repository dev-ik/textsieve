# ADR 0002 — Rules

English | [Русский](0002-rule-interface.ru.md)

Status: proposed

Rules are deterministic, side-effect-free inspectors over an immutable RuleContext.

Each rule returns a normalized 0..1 signal plus explainable Issue entries.

Rules do not directly decide UI behavior. Policy maps signals/issues to allow/review/reject.
