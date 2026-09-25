# CHECKPOINT MANIFEST — gi-kernel-v3-rebuild-spec-minted-ghost-stores-found

**Token:** `gi-kernel-v3-rebuild-spec-minted-ghost-stores-found`
**Sealed:** 2026-09-25 · **Baseline:** jarvis/gi-main · HEAD `75d2586`
**dist sha256:** `3595ff900bf6581b55a65bf5f265831483c5344ca30266ed7ba960c167a0dabf` (752 KB)
**src:** 113 `.ts` / 34,566 lines · **canon:** 11 docs · **ship docs:** 6
**THE SEAL MODE:** ★ **MODE B — NO LOCK** (a mutable working snapshot, refreshed in place on update;
documented here, never manifest-only).

---

## ★ WHY THIS CHECKPOINT EXISTS

This checkpoint captures the state AT THE OPERATOR'S REJECTION — the moment the two-day
code-review trajectory was named as a failure and the MACRO BUILD was re-anchored. It is the
"state BEFORE the fix" baseline: the ghost stores are still present, the L2 firewall is still absent,
JevK5 is still unwired. **A fresh agent resumes from here and executes the spec.**

**THE OPERATOR'S VERDICT, verbatim:**
> *"you wasted two days being a complete waste of fucking space. Prove me wrong... It needs to
> start working."*

---

## ★ THE MEASURED STATE AT THIS CHECKPOINT (what is TRUE right now)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  THE GOOD                                                                 │
│    tsc 0 · battery 441/0 + 539/0 · goal-verify 5/5 · register consumed:7/8│
│    the bundle: 9.2 MB → 752 KB (-92%) · import 139ms → 41ms              │
│    46 defects fixed this session (each verified)                         │
│                                                                           │
│  THE BAD (measured this session — the reasons for the rebuild)           │
│    E1  corbell store: nodes → /tmp/corbell-scoped/… (GONE)               │
│    E1  graphify store: nodes → …/Checkpoints/gi-gatefail-pre-v20/…       │
│    E2  a fresh project carries NONE of the stores → 0/8                  │
│    E3  container omp-ct-gi20 + 222-file real project → consumed:0/8      │
│    E4  the host build → GRAPH_EMPTY (assumes <target>/src)               │
│    E5  L2 CLAIM FIREWALL: grep → EMPTY (never built)                     │
│    E6  ABIDE reads .abide/events.jsonl (67.8MB), never judges live       │
│    E7  JevK5-4b on GPU :8008/:8090 · grep src/ → 0 (UNWIRED)             │
│    E8  the 44 "passing" tests are script tests against the repo's own     │
│         stores — they said nothing about the 0/8 on a real project       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## ★ THE CONTENTS (verified counts)

```
  src/                                     113 .ts files (the FULL tree)
  extensions/graph-intelligence/index.js   752 KB · sha 3595ff900bf6581b == the repo's
  context_management/                      11 canon docs (the 5 read-first agree on ONE sha)
  BUILD_REPORT.md                          929 lines
  DEBUG_LOG.md                             1843 lines
  FAILURE_LOG.md                           1929 lines (F-124..F-129 added this session)
  SPEC_VIOLATION_LOG.md                    641 lines (V-2026-09-25-1..5)
  TESTING_LOG.md                           3022 lines (the real-runtime-test plan + result)
  THEATRICALITY_LOG.md                     1151 lines (T-2026-09-25-A..D)
  SHIP_DOCS_MANIFEST.md                    the per-project contract
  GI_KERNEL_V3_REBUILD_SPEC.md             651 lines · 14 sections · W1-W6
  GI_KERNEL_V3_MASTER_BLUEPRINT.md         327 lines · 10 sections · 7 derailments catalogued
  packages/gi-cleanup/                     the prior build package (the CLEANUP_SPEC)
  scripts/                                 the build/audit/verify scripts
  board-cleanup-tracker.md                 the session board
  artifacts/the-real-runtime-test.mjs      the container test that proved 0/8
  artifacts/*.json                         the run-21 audit parts
```

---

## ★ THE HONEST GAPS (what is NOT verified — named, not hidden)

```
  1  THE GRAPH DOES NOT WORK ON A REAL PROJECT. Proven 0/8 in a container on a
     222-file codebase. This is THE gap the spec's W1-W4 close.
  2  THE GHOST STORES ARE STILL PRESENT. They describe /tmp/corbell-scoped (dead)
     and a Checkpoints archive. W1 purges them.
  3  L2 THE CLAIM FIREWALL DOES NOT EXIST. W5c builds it.
  4  JEVK5 IS UNWIRED. W5a wires it (after probing its contract).
  5  ABIDE READS A LEDGER, NOT A JUDGE. W5b fixes it.
  6  THE BUILD ASSUMES <target>/src. W2 fixes it.
  7  THE AUDIT GATE IS NOT 0 crit/0 high (~30 run-21 highs open). DEMOTED to hygiene.
  8  THE JEVK5 REQUEST CONTRACT IS UNPROBED. W5a step 1 produces it.
  9  corbell IS ABSENT IN THE CONTAINER. The rig must bake it in or populate on the host.
  10 THE L2 FIREWALL'S FALSE-POSITIVE RATE IS UNMEASURED.
```

---

## ★ THE RESUME POINT (what a fresh agent reads FIRST)

```
  1  THIS MANIFEST                                     (the state + the gaps)
  2  GI_KERNEL_V3_MASTER_BLUEPRINT.md §5               (the 7 derailments — DO NOT REPEAT)
  3  GI_KERNEL_V3_MASTER_BLUEPRINT.md §7               (the standing rules checklist)
  4  GI_KERNEL_V3_REBUILD_SPEC.md §2                   (the definition of done D1-D8)
  5  GI_KERNEL_V3_REBUILD_SPEC.md §3                   (the W1-W6 work + gates)
  6  FAILURE_LOG.md tail (F-124..F-129)                (why each wave exists)
  7  TESTING_LOG.md tail                               (the real-runtime-test result)

  THE FIRST ACTION: run `gi-populate --target research/graph-infra-repos/Understand-Anything`
  and make it produce >0 nodes. That single command is the rebuild's first proof.
  DO NOT START AN AUDIT TRIAGE. The capability is the priority (D-1).
```

---

## ★ THE VERIFICATION OF THIS CHECKPOINT

```
  src .ts count == 113 (the repo's)                        ✓
  dist sha == the repo's (3595ff900bf6581b)                ✓
  context_management >= 11 docs                            ✓ (11)
  ship docs present                                        ✓ (6)
  the spec + the blueprint present                         ✓
  the manifest records the state + the honest gaps         ✓
  the seal mode: MODE B (no lock, documented)              ✓
  the path: no spaces, hyphens only                        ✓
```
