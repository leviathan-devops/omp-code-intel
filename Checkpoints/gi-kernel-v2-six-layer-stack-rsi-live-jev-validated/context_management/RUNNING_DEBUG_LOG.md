
## [2026-09-20T12:00:00] — container angles caught 2 defects unit tests missed
- SYMPTOM: angle4 (2 blind edits) threw T2; angle5 (10 comment edits) reached T2
- ROOT CAUSE: (1) single-edit drift=1.0 ≥ 0.6 cut — sample-size artifact; (2) symbol-less edits weighted MEDIUM in full
- FIX: T2 requires ≥3 consecutive (gate-gate.ts:223); symbol-less comment edits carry ZERO drift (gate-gate.ts:164)
- LESSON: container angles on the wired path catch what unit tests on the math miss
- EVIDENCE: ALL-6-PASS post-fix; 230/0 ×3 stable; commit 60fe3e4
