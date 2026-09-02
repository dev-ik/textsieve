# ADR 0003 — Scoring

English | [Русский](0003-scoring-model.ru.md)

Status: proposed

Each signal is 0..1. The aggregate quality score is 0..100 where 100 means clean/high quality.

Do not calibrate weights by intuition alone. Build fixtures first, record expected bands, then calibrate deterministic weights and thresholds.

A single severe exact safety match may trigger policy rejection without requiring a low aggregate quality score.
