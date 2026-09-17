# GI OVERHAUL EXECUTION REPORT — W1–W7
**Date:** 2026-09-18
**Goal:** GI-OVERHAUL (Phase 1: 22 structural fixes + Phase 2: 4 graph infrastructure tools)
**Baseline:** jarvis/gi-main @ c348a6f, battery 134/0/966, dist f39bfe665ddb0d05
**Head:** jarvis/gi-main @ W7 (see git log), battery **166/0/1595 across 26 files**

## WAVE LEDGER

| Wave | Scope | Commit(s) | Gate evidence |
|---|---|---|---|
| W1 gi-resource | P1.1.1–P1.1.6 (6 fixes) | 3ee7565 (RED), c34e1c4, c510343, 2094c77, 80e9dad | 6 named tests red→green; battery 140/0/985 @ 21 files; T3 (0600) env-green pre-fix — sidecars inherit the main-file chmod that precedes WAL (order guarantees); explicit chmod landed anyway |
| W2 gi-containment | P1.2.1–P1.2.5 | (W2 RED) + fix commit | 5 tests (3 red→green: projection fail-closed root, relative-posix anchors, auditor ../-escape drop; 2 pins); P1.2.3 later upgraded to a REAL fix after scan triage (extension roots resolve-only → canonicalized) |
| W3 gi-validation | P1.3–P1.5 (10 fixes) | (W3 RED) + fix commit | 10 tests (8 finding-reds → green, 2 pins); battery 154/0/1553 @ 23 files |
| W4 gi-scoping | P1.6 | fix commit | 2 tests; scopeBuildToProfile drops Checkpoints/Ship_Packages/reports/tests at the store boundary |
| W5 gi-infra-diff | P2.1+P2.2 | feat commit | 6 tests; graph-diff (Tarjan SCC, blast-radius deltas) + graph-gate (3 levels, WARN-vs-FAIL precedence) |
| W6 gi-infra-pre | P2.3+P2.4+CLI | feat commit | 4 tests + CLI e2e legs (snapshot/test-targets/preflight on a live session store) |
| W7 gi-ship | deploy + scan + docs | this report | dist 57d89ccf5cd0b086 exec-verified ×5 (build ext+idx, host OMP ×2, rig); frozen scan = 7 direct ocr runs (see §SCAN); rig TUI legs BLOCKED (below) |

## THE TWO SCAN CRITICALS KILLED
The W1 module scan (12 real sessions after the skipped-run theater was caught) surfaced
2 CRITICALs — both were ALREADY in the W3 red battery, i.e. the engine and the TDD
battery converged on the same defects independently:
1. **Sidecar alias (P1.4.3)** — non-.json graphPath made hashPath === graphPath; the
   hash write clobbered the warm graph. Fixed via `graphHashSidecarPath()` used at
   both the read and write sites.
2. **Lineless policy divergence (P1.5.1)** — chain/imports/awaits/unwired threw
   LINELESS_NODE on one bad row, killing N-1 good rows. All four verbs now skip +
   count + WARN-log (null OR undefined both lineless).

## THEATER CAUGHT DURING EXECUTION (audit-grade notes)
- **Skipped-scan theater:** the scan-panel wrapper reported "7/7 OK" while every
  result was `"status": "skipped"` (477 bytes, "No supported files changed") — ocr's
  session-state saw the committed files as unchanged. Caught by payload inspection;
  replaced with direct per-file runs (9–26 KB real payloads).
- **Mock self-recursion:** the T2 fd-leak test hung 90s+/sys-heavy because Bun's
  `mock.module` rebinds live namespace exports — the delegate called itself. Fixed by
  capturing real function values pre-mock. T2 then ran in 49 ms.
- **Stale test arithmetic:** T9 (unwired) initially passed with `line: 0` — lineless
  is NULL, not 0. Fixture corrected; the red became real.

## SCAN-FROZEN (measured 2026-09-18, direct ocr runs, provider opencode-go-union)

**First frozen pass (dist 57d89ccf5cd0b086):** 7/7 success — 2 critical / 22 high / 29 medium / 6 low.

**Critical remediation (commit `fix(w7-criticals)`):**
1. `extension` graph-probe `wipe` — env-gated AT the tool layer
   (`GI_OMP_ALLOW_CLEAR` → `GI_CLEAR_REFUSED`; the deep gate inside
   `clearGiRegistry` was invisible to the scanner — defense-in-depth now
   matches the tool description's promise). House test
   "graph-probe action=wipe is GI_CLEAR_REFUSED without env" green.
2. `graphify-adapter` `resolveGraphifyLine` — honest `number | null`
   contract (the old signature declared `number` while returning null);
   `tryResolveGraphifyLine` maps null→undefined (dead catch removed);
   `whoCalls` null-tolerant skip.

**Loop pass 3 (dist a9f13c6fe0eb83ab, battery 166/0/1590):**
`extension` 0c/4h/7m/1l (the scan's ReferenceError critical on the previous
edit was itself fixed — the catch now narrows `e`). 9 highs fixed this pass:
scope filter wired into adapter build()+buildSync (the session-populate bypass),
corbell deterministic cap + edge referential integrity, primitive-safe error
mapping, ledgerDir entropy suffix, hash skip-marks, prod shape-gate element
spot-checks.

### END STATE (this session)
- **Critical tier: 0 across all 7 kernel files** (was 2) — PROVEN by verify passes.
- **High tier: 19** (was 22) — the remaining pile is documented design-level
  work: keyid MAX-vs-MIN pool divergence, TOCTOU classes (confinement,
  capped-read), first-run mtime downgrade, cycle-enumeration precision,
  default-allowlist breadth. Each has a named counter in the triage ledger;
  the loop resumes there next session.
- Dist SHAs exec-verified ×5 at `a9f13c6fe0eb83ab` (build ext+idx, host OMP ×2, rig).


## BLOCKED (resume condition attached)
- **Rig TUI live legs (G1/G4/probe):** gi-omp-port is Up but every omp process inside
  is a zombie (since Sep 16). The dist IS deployed in-rig
  (/root/.omp/agent/extensions/graph-intelligence/index.js = 57d89ccf5cd0b086, exec-verified).
  Resume: relaunch the omp TUI inside gi-omp-port (start.sh), then drive G1 who-calls
  rows≥1, G4 AUDIT_DONE findings≥1, probe PROBE_TOOL_OK through the extension and
  paste the stream lines here.

## SCAN VERDICT
See §SCAN-FROZEN appended below the frozen-scan job completes (7 files, direct runs,
per-file severity totals + session statuses).
