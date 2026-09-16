# DEBUG_LOG — omp-code-intel (append-only)

## EN-1 — Rename verification: brand-only diff, gates green (2026-09-16)

- **THE FINDING:** post-rename `diff src/index.ts + src/ast.ts` non-brand lines = 0 (empty = pure brand).
- **THE ROOT CAUSE:** N/A (verification, not a bug).
- **THE FIX:** N/A.
- **THE VERIFICATION:** `bun x tsc --noEmit` exit 0; `bun run tests/st/run.ts` --- 79/79 passed exit 0, this turn, in this repo.
- **THE LESSON:** ordered longest-first replacement prevents partial-token corruption (mimo-code-intel before mimo-intel etc.).
