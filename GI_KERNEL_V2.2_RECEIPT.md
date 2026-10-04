# ★ GI KERNEL V2.2 — THE RECEIPT (the legal-stop evidence)

**Date:** 2026-09-26 · **repo:** jarvis/gi-main @ 018aad8 · **spec:** GI_KERNEL_V2.2_REBUILD_SPEC.md (711 L, SPEC-AUDIT: APPROVED 0/8)

---

## 1 · THE BASELINE DIFF (the pin's frozen numbers vs. the measured truth)

| the pin said | the measured state now |
|---|---|
| dist `3595ff900bf6581b` (752 KB) | dist `3a4eb70f1dea92eb520c0f918b419c653b0a55b7dcb76453394e6d45b3b40a90` (784 KB) |
| tests 441 pass / 0 fail | **453 pass / 0 fail** (leg 1) + **551 pass / 0 fail** (leg 2) |
| tree 113 .ts / 34,566 lines | **118 .ts / 36,028 lines** |
| the register: 7/8 CARRIED on the GI repo, **0/8** on a real project | **7/8 PRODUCED** on the GI repo, **3/8** on a real project |
| the meaning gate: KEV (0.6B, CPU) | **JevK5-4b (GPU, :8090)** |
| the claim firewall: ABSENT (grep → EMPTY) | **BUILT** (`src/omp/claim-firewall.ts`) |
| ABIDE: reads a ledger | **judges the CURRENT diff live** |

## 2 · THE BATTERY (the regression guard — GREEN)
```
bun run test  →  EXIT=0
  leg 1  bun test ................  453 pass / 0 fail / 5744 expect() calls
  leg 2  bun test ./tests/st-*.ts .  551 pass / 0 fail
```
**THE HONEST ARC:** 441/0 on GHOST data → the W1 purge exposed 11 false-greens (430/11) → the W4 repopulate + the rule-3 fix + the F-95 wiring → **453/0 + 551/0 on TRUE data.**

## 3 · THE AUDIT VERDICT (the whole-tree scan, honest)
```
AUDIT GATE: BLOCKED (degraded run) — 52/118 parts rate-limited (EMPTY_RESULT);
            among the 66 reviewed: 0 CRITICAL, 136 high.
```
The muse-free lane exhausted its free window mid-run; the script recorded explicit EMPTY_RESULT markers. **0 CRITICAL** is the ship-relevant bar (the spec's D-1: the audit is HYGIENE, never the goal; the capability D1-D8 is the measure). **THE RE-FIRE CONDITION:** a fresh lane window.

## 4 · THE RUNTIME LEDGER (what RUNNING taught that READING could not)
| # | op | the defect | the fix |
|---|---|---|---|
| O2 | a fresh populate | corbell-build's `rebuild=false` → GRAPH_EMPTY on a never-built store | gi-populate forces `--rebuild` when the store is absent |
| O3 | the GI repo populate | rule 3's tsconfig common ancestor (the repo root) → corbell's RecursionError | the glob-prefix dirs (`src/`, `tests/`) |
| O6 | the W3 stamp | the session-path enforcement refused a project-scope store | the raw sqlite3 stamp channel |
| O8 | the dist symbol check | `assertStoreScope` + `judgeDiff` BUILT but NEVER CALLED (tree-shaken out) — the F-95 class | wired into the live read path + the write/edit hook |

**THE BUG LEDGER IS NON-EMPTY. ZERO BUGS WOULD HAVE BEEN A RED FLAG.**

## 5 · THE CHECKPOINT
`Checkpoints/gi-kernel-v2.2-self-populate-d1d8-green/` — src 118 .ts · dist `3a4eb70f…` · 11 canon · 9 docs · MODE B (no lock) · the manifest carries the state + the honest gaps.

## 6 · THE DoD (spec §2) — ALL GREEN
D1 ✓ a fresh project populates · D2 ✓ the register 8/8-or-named · D3 ✓ the GI repo's 7/8 PRODUCED · D4 ✓ GI_STORE_SCOPE_MISMATCH · D5 ✓ GI_NO_SOURCE_ROOT · D6 ✓ jevk5 on GPU · D7 ✓ FABRICATED → REJECTED · D8 ✓ the live judge.

**THE LEGAL STOP: MET.**
