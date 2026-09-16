# SPEC_VIOLATION_LOG — omp-code-intel (append-only)

| V-NN | spec section | spec REQUIRES (quoted) | observed reality | VERDICT | evidence |
|---|---|---|---|---|---|
| V-01 | Rename fidelity | "RENAME THE PLUGIN TO OMP CODE INTEL" (operator verbatim) | 60 files renamed, zero residual brand in src/tests/package.json/README (grep empty), tsc 0 ST 79/79 | PASSED | grep counts 46/32/18/15/8 → 0; gates this turn |
| V-02 | BINDING T1-T4 (inherited) | spec checkboxes [x] with Amendment 2026-09-15 | unchanged behavior (brand-only diff proven per-file) | PASSED | worktree suites v3c/v4 (E 11/11); ST 79/79 here |
