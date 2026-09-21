# SUGGESTED IMPROVEMENTS — GI Kernel v2.1 build

**Method:** each proposal names the problem it solves (with the entry), why it is worth
tokens, how it works, the implementation steps, the downstream benefits, and what it costs
if wrong. Density bar: engineering-report-full-density — no padding, real analysis.

---

## I-1 · THE ASSERTING EDIT HELPER (kills the silent-tool class)

**Problem:** EN-064/EN-065 — eight fixes committed as landed that had never applied,
because `str.replace` no-ops on a missing pattern. Cost measured: two full audit rounds
chasing phantoms + one false report committed.
**Why worth tokens:** one helper, ~15 lines, eliminates the session's single most
expensive process failure. Every scripted edit in every future wave uses it.
**How it works:**
```
┌────────────────────────────────────┐
│ sub(path, old, new, tag)           │
│   read file                        │
│   if old not in file               │
│     RAISE (refuse the claim)       │
│   write file.replace(old, new, 1)  │
│   VERIFY: grep the new text        │
└────────────────────────────────────┘
```
**Steps:** 1) add `scripts/sub.py` (the helper). 2) grep the tree for bare
`str.replace` in scripts and convert. 3) the wave contract requires it.
**Downstream:** EN-064-class failures become impossible; the re-verify pass gets cheaper.
**If wrong:** the helper raises on a legitimate multi-match — mitigated by the count=1
default plus an explicit `replace_all` flag.

## I-2 · THE RE-VERIFY PASS AS A WAVE GATE (kills described-but-unfixed)

**Problem:** EN-075 — a defect described in a commit message whose fix list omitted it;
pass 6 found it again. Cost: one full audit pass.
**Why worth tokens:** the pass already exists (the audit loop); this only makes it a GATE:
no wave closes while the same instrument still finds the described defect.
**How it works:**
```
┌─────────────────────────────────────────┐
│ wave closes ONLY when:                  │
│   battery green AND tsc clean AND       │
│   the SAME scan that found the defect   │
│   no longer finds it                    │
└─────────────────────────────────────────┘
```
**Steps:** 1) record the finding instrument per fix (which scan, which file). 2) re-run
that instrument before the wave-close commit. 3) the commit message cites the re-run.
**Downstream:** EN-075-class false reports become structurally impossible.
**If wrong:** doubles scan cost per wave — acceptable against one wasted audit round.

## I-3 · THE GRAPH-FACT RUNG AS THE DEFAULT (kills the ritual query)

**Problem:** D-1/T-16 — 100% of graph calls were gate tokens; the graph held answers
(OutcomeRecord: 0 producers, 70ms) nobody asked it for.
**Why worth tokens:** the rung EXISTS (graph-facts.ts, 12/12 tests). Making it the FIRST
rung of every judgment converts every future fire into a graph consult — the ritual
becomes the mechanism.
**How it works:**
```
┌─────────────────────────────────────────────────┐
│ FireGate.judge:                                 │
│   1 graphFacts (the $0 rung — ALREADY WIRED)    │
│   2 mpsePreFilter                               │
│   3 cache (QUESTION_VERSION:key)                │
│   4 JevJudge                                    │
│ EVERY fire consults the graph, or the row says  │
│ WHY NOT (graph:UNAVAILABLE / UNOBSERVED)        │
└─────────────────────────────────────────────────┘
```
**Steps:** already wired (fire-gate.ts:415). Remaining: P4's extractor gap (types, fields,
consts, closures now emitted by structural-extract.py — 3 of 4 derailments settle).
**Downstream:** the ritual-query class dies by construction; every fire carries graph
evidence or its named absence.
**If wrong:** a stale store could refuse real fires — mitigated by M-GRAPH-3 (freshness
gates everything) plus the provenance-in-transaction fix.

## I-4 · CROSS-SESSION BAN PROPAGATION (kills the F-48 class)

**Problem:** F-48 — the regex fallback survived 50+ operator bans because the bans lived
in OTHER projects' failure logs; this project's log had ZERO entries about it.
**Why worth tokens:** the operator's bans are project-independent ("they apply
everywhere"). One propagation mechanism prevents every future resurrection.
**How it works:**
```
┌──────────────────────────────────────────────┐
│ ~/.omp/agent/bans/  (one file per ban)       │
│   id · pattern · scope: ALL · source entry   │
│ wave preflight greps the tree for patterns   │
│ a HIT blocks the wave until ruled            │
└──────────────────────────────────────────────┘
```
**Steps:** 1) extract bans from all projects' failure logs (regex-fallback, silent
substitute, scope inference). 2) one dir, one file per ban. 3) preflight grep per wave.
**Downstream:** F-48/F-49/F-50-class resurrections become preflight failures, not
operator discoveries.
**If wrong:** false positives on historical comments — mitigated by scoping the grep to
live code paths (the F-48 resolution already distinguishes the two historical lines).

## I-5 · THE STANDING AUDIT (kills the treadmill)

**Problem:** F-20, F-45, the v2.1 19/19/19 — the 0c/0h target assumes scan determinism,
never validated. Each fix wave adds lines = new scan surface.
**Why worth tokens:** the treadmill consumed the most session budget of any pattern here
(seven passes, ~90 findings, no zero). A bounded process converts unbounded cost to fixed.
**How it works:**
```
┌──────────────────────────────────────────────────┐
│ PER WAVE: scan the CHANGED files only (delta)    │
│ PER RELEASE: one full pass, findings TRIAGED     │
│   (fix-now-bounded vs accepted-debt, operator    │
│   rules the debt set) — never "fix everything"   │
│ CONVERGENCE TRACKER: findings on UNCHANGED code  │
│   across rounds → the treadmill signature; stop  │
│   and rule instead of fixing                     │
└──────────────────────────────────────────────────┘
```
**Steps:** 1) delta-scan script (git diff --name-only → ocr scan). 2) the triage table
format (refuted-by-code / accepted-debt / accepted-fixable — the F-11 precedent). 3) the
convergence tracker (overlap count across rounds; 0 overlap = treadmill, stop).
**Downstream:** audit cost becomes O(changed files) per wave + O(1) triage per release.
**If wrong:** a debt ruling could accept a real defect — mitigated by the operator ruling
the debt set (never the agent).

## I-6 · THE ORGANIC-RESOLUTION LOOP (closes T-3)

**Problem:** every oracle resolution this session was synthetic (W6 labels; hot-seat
hand-built edits). A precision from labels measures the labels.
**Why worth tokens:** T-3 ("laterTruth resolved by the oracle") is otherwise uncloseable —
it needs evidence, not an engine.
**How it works:**
```
┌──────────────────────────────────────────────────┐
│ P2 BUILT: src/omp/evidence-producer.ts          │
│   session tool events → OutcomeRecords           │
│   persisted as NDJSON beside the ledger          │
│   resolveFromSession: ONE call resolves EVERY    │
│   unresolved row, reporting noSubject/noEvidence │
│ NEXT: wire the producer into the session loop    │
│   so EVERY session leaves its own evidence       │
└──────────────────────────────────────────────────┘
```
**Steps:** built (11/0/40 tests, the ORGANIC GATE met). Remaining: the session-loop
wiring + the graph-derived edit as a fallback source.
**Downstream:** M1's organic form and M10's resolution rate become measurable; the
calibration loop closes on real outcomes.
**If wrong:** an event misclassified as evidence (a test run that was not a verification)
— mitigated by the DECLARED command shape (never a guess) plus the `passed`-absent rule.

## I-7 · THE SHADOW-DIST GUARD (kills F-15/F-18)

**Problem:** a stale baked dist shadowed the fresh bundle for a full relaunch cycle
(trident `98549248` won the tool-name race; GI-only rebuilds left the shadow).
**Why worth tokens:** two full relaunch cycles burned; the class recurs (F-15, F-18).
**How it works:**
```
┌──────────────────────────────────────────────────┐
│ every deploy writes (path → sha) into a manifest │
│ every TUI proof reads the manifest FIRST and     │
│ asserts the live bundle's sha BEFORE the leg     │
│ a mismatch = the shadow, named, before ANY leg   │
└──────────────────────────────────────────────────┘
```
**Steps:** 1) deploy-manifest.json per rig. 2) the TUI proof's step 0 is the sha assert.
**Downstream:** shadow cycles become step-0 failures, never full-leg wastes.
**If wrong:** manifest drift (a manual deploy bypassing the script) — mitigated by the
script being the ONLY deploy path.
