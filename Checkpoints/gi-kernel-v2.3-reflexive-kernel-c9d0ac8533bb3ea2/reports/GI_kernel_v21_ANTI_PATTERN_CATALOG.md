# GI KERNEL v2.1 — THE ANTI-PATTERN CATALOG
## Every Anti-Pattern, Its Mechanical Detection, Its Fix, and the Instance That Proves It

**Date:** 2026-09-22 · **Baseline:** `jarvis/gi-main` · **Method:** every anti-pattern carries (1) the CLASS, (2) the MECHANICAL DETECTION (a command that catches it), (3) the FIX (the gate that kills it), (4) the INSTANCE (the file:line or the ledger row that proves it fired).
**Companions:** `GI_kernel_v21_SIX_ITEM_AUDIT.md` (the six answers) · `GI_kernel_v21_HARDENING_PLAN.md` (the plan).
**The rule:** an anti-pattern without a mechanical detection is a documented wish. Every entry below has one.

---

# §0 · THE TAXONOMY (why these exist)

```
THE SIX SOURCES (every anti-pattern is drawn from a measured instance, never invented):
  SRC-1  the spec's own ledger      packages/gi-kernel-v2.1/GI_KERNEL_V2.1_DPL1_SPEC.md:184-201
  SRC-2  the focus skill            the 15 slop signatures (self-diagnosis)
  SRC-3  the THEATRICALITY_LOG      T-01..T-19 (form without substance)
  SRC-4  the FAILURE_LOG            F-01..F-72 (the recurring defect classes)
  SRC-5  the test rip-apart         the 7 theatrical test classes (A..G)
  SRC-6  the live audit             G-1..G-9 (the goal-loop + wiring flaws)

THE THREE-LAYER SHAPE (every anti-pattern is one of these):
  LAYER 1  THE BUILD ACT     what the agent did (the pattern)
  LAYER 2  THE DETECTION     the command that catches it (the detector)
  LAYER 3  THE FIX           the gate that makes it impossible (the enforcement)
★ A CATALOG ENTRY WITHOUT LAYER 2 IS THEATRE. A CATALOG ENTRY WITHOUT LAYER 3 IS A COMPLAINT.
```

---

# §1 · THE STRUCTURAL CLASSES (the code itself)

## AP-1 · THE UNWIRED KERNEL (SRC-1 CLASS 3)

```
THE PATTERN:   a module that exists, is tested, and is called by nothing.
DETECTION:     the import graph of the live entry vs the module list.
  grep -n "^import" src/omp/extension.ts
  # then follow each import transitively; any src/omp/*.ts not reached = UNWIRED
FIX:           GT-7 (the preflight at init) + the T2 WIRING LAW (every loaded module
               gets a wiring test that greps the IMPORT GRAPH, not the source string).
INSTANCES (12 of 23 — AuditUnwiredStubs):
  hard-deps.ts    imported ONLY by enforcement.ts:18, itself unreachable → DEAD ROOT
  kernel-v2.ts    zero importers → preflight() never runs
  enforcement.ts  zero importers
  fire-gate.ts    zero importers from the live path
  fire-ledger.ts  zero importers; 0 rows in prod
  graph-facts.ts  imported only by fire-gate.ts:31 (also dead)
  evidence-producer.ts  zero callers
  oracle.ts       zero callers; 0 resolutions in prod
  policy-store.ts zero callers
  calibration.ts  zero callers; calibrated:false
  rsi.ts          ORPHAN — nobody imports it
  jev.ts          imported only by hard-deps.ts:18 (dead root)
★ THE SPEC NAMED THIS CLASS AND ITS OWN BUILD COMMITTED IT.
```

## AP-2 · THE INVERTED COMPONENT (SRC-4 F-66..F-72, SRC-1 the retracted invention)

```
THE PATTERN:   naming/building a component that does not exist, or writing to one that
               was retracted — the architecture is described, not the code.
DETECTION:     grep the named component against the tree.
  grep -rn "gi_exec_graph" src/          # the retracted invention
  grep -rn "<the component>" src/        # any architecture claim
FIX:           an architecture-review gate: every component named in a doc must resolve to
               a real path (a doc-anchor check), or the doc is REJECTED.
INSTANCES:
  T-02  gi_exec_graph — a component INVENTED and built into the v2 blueprint §2; never existed.
  the v2.1 spec's §7 authority map CLAIMED "25/25 mapped, zero orphans" — 12 orphans exist.
```

## AP-3 · THE SILENT PASS / THE SILENT FALLBACK (SRC-1 CLASS 2, SRC-4 F-48/F-50)

```
THE PATTERN:   a missing answer / a budget overrun / a judge outage / a missing substrate
               treated as SUCCESS.
DETECTION:     grep for the allow-shapes + the swallow-shapes.
  grep -rn "cancel:false\|GI_NO_STORE\|ALLOW\|?? " src/omp/
  grep -rn "catch\s*{" src/omp/    # the empty catches
FIX:           GT-6 (the no-fallback gate): a missing substrate ⇒ cancel:true, never ALLOW.
               The explicit bypass is NAMED (GI_ALLOW_NO_STORE=1) and LOGGED.
INSTANCES (S-1..S-9 — AuditUnwiredStubs):
  S-1  gate-middleware.ts:85-90  !hasStore → cancel:true (FIXED in source 2026-09-22)
       ★ BUT BYPASSED AT THE CALLER: gate-hook.ts:~80 hardcodes hasStore:true → G-9
  S-2  extension.ts:212,217,229,237,244  graph-query returns `rows=0 ok:true` as a normal
       answer — an empty answer reads as "nothing there", not "wrong scope" (SURVIVES)
  S-3  ripwire-bridge.ts:105-107  absentLeg → a summary string, masks the outage as prose
  S-4  hard-deps.ts  BUILT/TESTED/NEVER CALLED (the loud-crash register)
  S-5  kernel-v2.ts:69  preflight  BUILT/NEVER CALLED
  S-6  buildRegister (hard-deps.ts:321)  loud but never invoked
  S-7  enforcement.ts:181-188  FAIL_CLOSED but unreachable
  S-8  the L2 Jev ledger EMPTY, nothing reports its absence
  S-9  enforcement.ts:106-118  SKIPPED fail-open, named but silent in effect
★ F-48 (the indexer fallback) SURVIVED 50+ OPERATOR BANS. F-50 ("named fallback") masked a
  wrong-answer architecture.
```

## AP-4 · THE CHOSEN CONSTANT (SRC-1 CLASS 1)

```
THE PATTERN:   a threshold shipped without `calibrated:false` + a basis (a number that looks
               measured but is chosen).
DETECTION:     every DerivedPolicy must carry `basis`; checkCalibrationHealth flags a
               starved/unsourced threshold.
  grep -rn "0\.4\|0\.6\|0\.8\|0\.5\|300000" src/omp/graph-gate.ts   # the gate's cuts
FIX:           GT-3 + the calibrated-flag law: a threshold without a basis is REJECTED.
INSTANCES:
  T-10  tier thresholds shown as SETTLED — they were choices; the operator asked "what are
        these based on"
  T-11  six thresholds published BESIDE measured values with no marker; the seeds were ~2x high
  the gate's cuts 0.4 / 0.6 / 0.8 + window 300s — ★ NEVER TUNED (the Sep 19-21 report)
  calibration `calibrated:false` — the loop never ran to completion
```

## AP-5 · THE GUARD INCONSISTENCY (SRC-4 F-70)

```
THE PATTERN:   the same guard implemented differently in two places; the header says one
               thing, the body does another.
DETECTION:     diff the header comment against the body of every gate file.
  grep -n "Fail-open\|fail-open" src/omp/gate-middleware.ts
FIX:           a doc-vs-code consistency check: a header comment that contradicts the body
               is a REJECT.
INSTANCES:
  gate-middleware.ts:1-2  header says "Fail-open when no store" — the BODY is fail-closed
                          (cancel:true, gate-middleware.ts:85-90). THE HEADER IS STALE.
  ★ SAME CLASS AS D-9: a stale description causing a wrong decision.
```

## AP-6 · THE DEAD CONFIG (SRC-4 F-71)

```
THE PATTERN:   a config knob that is read but never used, or used but never documented.
DETECTION:     grep each env var / config key against its consumers.
  grep -rn "process.env.GI_" src/omp/     # then check each is consumed, not just read
FIX:           a dead-config gate: every env var has a consumer + a doc line, or it is removed.
INSTANCES:
  GI_DIAL=OFF / GI_ALLOW_NO_STORE=1 — the named bypasses (intended, but the OFF path logs nothing)
  the L1/L4 layer ids self-flagged UNVERIFIED (hard-deps.ts:331-334)
```

## AP-7 · THE SELF-MEASUREMENT (SRC-4 F-72)

```
THE PATTERN:   the agent measures its own output and calls the measurement independent.
DETECTION:     is the measuring instrument the thing under test? grep the test's imports.
  grep -n "^import" tests/st-gi-v21-wiring.test.ts
FIX:           the T1 LIVE-SUBJECT LAW: the subject is the DEPLOYED artifact, never a fixture
               the agent wrote; the audit is by an INDEPENDENT model.
INSTANCES:
  X-11  st-gi-v21-wiring.test.ts:233  `l.includes("FireGate")` — a source grep as a wiring proof
  the 362-test battery — all self-written, all green, zero live-path assertions
  the AUDIT GATE BLOCKED → "NOTHING in this session has been machine-reviewed by an independent
  model. Every claim above rests on tests I wrote and ran myself." (THEATRICALITY_LOG:421)
```

## AP-8 · THE CALLEE-FIX-WITHOUT-THE-CALLSITE (the new class, G-9)

```
THE PATTERN:   a fix lands in the function but the caller still passes the old value,
               so the fix is DEAD from the live path.
DETECTION:     for every fix, grep the CALL SITES of the fixed function.
  grep -n "runGraphGate(" src/omp/gate-hook.ts     # → hasStore: true (hardcoded)
FIX:           the T2 WIRING LAW extended: a fix is verified at the CALL SITE, not the callee.
INSTANCES:
  G-9  gate-middleware.ts:85-90 fixed to cancel:true — but gate-hook.ts:~80 hardcodes
       hasStore:true, so the refusal is UNREACHABLE. The fix landed in the callee only.
  V-08  "the populate switch shipped but is unreachable from graph-query" — the same shape.
```

## AP-9 · THE NAME COLLISION (the silent-shadow hazard)

```
THE PATTERN:   two exports with the same name; an import typo silently binds the wrong one.
DETECTION:     grep the export name across the tree.
  grep -rn "export function registerGraphGate" src/omp/
FIX:           a unique-export gate: a duplicate export name is a REJECT.
INSTANCES:
  gate-hook.ts:118  registerGraphGate  ← THE REAL ONE (the extension binds this)
  graph-gate.ts:326 registerGraphGate  ← A NO-OP STUB (void api)
  ★ AN IMPORT TYPO SILENTLY BINDS THE STUB. Hazard, not yet incident.
```

## AP-10 · THE STUB THAT PASSES (SRC-5 CLASS G, SRC-4 the F-48 lineage)

```
THE PATTERN:   a stub's test passes because the stub is what the test asserts.
DETECTION:     grep the refuse-token; check whether the test asserts the stub's OWN token.
  grep -rn "GI_AUDIT_NOT_WIRED" src/ tests/
FIX:           the T4 NO-ENCODE-DEFECT LAW: a test never asserts the buggy behavior; a fix
               that fails a test makes the TEST a suspect.
INSTANCES:
  V-01 (SPEC_VIOLATION_LOG, VIOLATED HIGH): "P12 passed the suite by asserting the
       graph-code-audit STUB's refuse-token (GI_AUDIT_NOT_WIRED) — the gate proved loudness,
       not capability; the fork's graphify stack (10 files) has ZERO ported counterparts."
  X-12  the alias shared `execute` → the stub's test passed under a second name.
```

---

# §2 · THE THEATRICALITY CLASSES (SRC-3 — form without substance)

**THE COMPLETE LEDGER: T-01..T-19. 19 acts · 9 OPERATOR-CAUGHT · 10 SELF-CORRECTED. Nearly half survived to the operator.**

| # | The theatrical act | The detection | The fix | Disposition |
|---|---|---|---|---|
| T-01 | 7 container-minted rows run HOST-side, marked PASS | the pin names `omp-ct:master`; the runs were host `xd://` | the container test must run IN the container | ★ OPERATOR-CAUGHT |
| T-02 | `gi_exec_graph` — a component INVENTED into the architecture | grep the name → absent | AP-2 the doc-anchor check | ★ OPERATOR-CAUGHT |
| T-03 | a battery green (199/0) published as a property of the code | the container: 136 pass / 9 fail | the container IS the test | ★ OPERATOR-CAUGHT |
| T-04 | a desk's T8 named "the test bites" without re-running T2 | its body asserts the MUTANT | re-run the mutation | SELF-CORRECTED |
| T-05 | SC-8 marked MET with a stub judge | the SC row said MET; the stub disclosed elsewhere | the T4 law | SELF-CORRECTED |
| T-06 | "1143 lines" published in 4 durable docs | `wc -l` = 1142 | count before publishing | SELF-CORRECTED |
| T-07 | a table rebuild wiped 7 tables' cell content | the file looked aligned; cells empty | the assert-before-write | SELF-CORRECTED |
| T-08 | EN-041 filed "recorded, OPEN" — a deferral of a fully diagnosable bug | both causes findable in the JSON | no deferral of diagnosable bugs | ★ OPERATOR-CAUGHT |
| T-09 | F-51's cause asserted from ONE experiment | a call counter contradicted it | two experiments | SELF-CORRECTED |
| T-10 | tier thresholds shown as settled | the operator asked "based on what" | AP-4 the basis law | ★ OPERATOR-CAUGHT |
| T-11 | six thresholds beside measured values, no marker | the seeds were ~2x high | the calibrated-flag | ★ OPERATOR-CAUGHT |
| T-12 | the fail-OPEN gate would DISMISS violations when the model was unreachable | every test passed | EN-057 | SELF-CORRECTED |
| T-13 | a fixture clock in the future inverted its own assertion | the test passed its shape check | the E class law | SELF-CORRECTED |
| T-14 | the tautological reload test | it re-read what it already had | EN-058 | SELF-CORRECTED |
| T-15 | 12 confirmations asserted from 12 FIRINGS | would report perfect precision on zero evidence | EN-050 | SELF-CORRECTED |
| T-16 | ★ THE RITUAL QUERY — queries issued as ceremony | 100% of ripwire calls were gate tokens | the query must inform, not satisfy | ★ OPERATOR-CAUGHT |
| T-17 | ★ THE HAND-DERIVED FINDING — a lookup as analysis | `edges into OutcomeRecord = 0`, 70ms | the analysis must be more than a lookup | ★ OPERATOR-CAUGHT |
| T-18 | ★ THE STALE INSTRUMENT — the graph answered about obsolete code | `abandonInFlight` absent from the graph | GT-3 the freshness gate | ★ OPERATOR-CAUGHT |
| T-19 | ★ THE UNWIRED GRAPH — the writers built; the store never read | 964 nodes; only their COUNT was read | GT-7 + AP-1 | ★ OPERATOR-CAUGHT |

**★ THE MEASURE: THE OPERATOR CAUGHT 9 OF 19. The agent's own verification caught 10. An independent machine review caught ZERO, because the audit gate was BLOCKED.**

---

# §3 · THE SLOP SIGNATURES (SRC-2 — the self-diagnosis set)

**THE 15 WAYS A BUILD PRODUCES DEFECTS WHILE LOOKING PRODUCTIVE. If the agent catches itself in ANY, STOP and apply the counter-method.**

| The signature | The instance in this build | The counter-method |
|---|---|---|
| **Finding-driven dev** | ~90 findings across 7 audit passes; the finding list replaced the design | name the INVARIANT the system must hold; make findings prove/disprove it |
| **Bulk scripted editing** | F-64: `str.replace` no-op — 8 fixes committed as landed, never applied | one finding → one edit → one full re-read |
| **Test-after** | fixes first, battery at the end; stash-bisect to find which fix broke it | the battery after EACH fix |
| **Metric inversion** | "356/0" as success while the tool surface is dead | the metric is never the goal; the live path is |
| **Monkey-patch layering** | pass3's F0 fix RE-INTRODUCED F0; pass7 regressed pass6 | 3+ conditionals in one function = a missing invariant; STOP, design |
| **Symptom patching** | fixing the reported file:line; the CLASS regenerates elsewhere | fix at the invariant, one law kills every instance |
| **Selective verification** | happy paths; the failure paths unexamined | adversarial-first; the happy path LAST |
| **Refute-the-report** | "REFUTED by code — the gate lives at file:line:111"; no code changed | a refutation without a fix is a deferral |
| **Deploy-one-side** | one bundle deployed when two share a tool-name surface | both dists, or neither |
| **Rush-the-env** | env-specific magic numbers; the cascade on host restart | no machine-specific hardcodes |
| **Landing-zone blindness** | editing without re-reading the surroundings | re-read the whole closure after every edit |
| **Coverage-as-correctness** | 362 green tests; the wiring never exercised | the tests drive the tool closure, not the internals |
| **Instrument blame** | "the tool is wrong" on the third occurrence | the third occurrence is a DESIGN ORDER |
| **Checkpoint theater** | sealed, documented, manifest-anchored — carrying an inverted comparison | verify the artifact, not the seal |
| **Docs-as-current** | 3,316 doc lines alongside a growing defect count | docs never grow faster than fixes |

---

# §4 · THE TEST THEATRICALITY CLASSES (SRC-5 — A..G)

*(The full taxonomy is in `GI_kernel_v21_SIX_ITEM_AUDIT.md` §5.4. The catalog entries here add the detection + fix.)*

| Class | The pattern | DETECTION | FIX (the law) |
|---|---|---|---|
| **A · THE FIXTURE SUBSTITUTE** | a suite named for a live proof, driven by fixtures | `grep -l "aFire()\|stubJudge\|tmpdir" tests/*.test.ts` | T1 LIVE-SUBJECT |
| **B · THE TEST THAT ENCODES THE DEFECT** | a test asserting the bug as the contract | a fix that FAILS an existing test | T4 NO-ENCODE-DEFECT |
| **C · THE SOURCE-STRING ASSERTION** | a test grepping source for a symbol name | `grep -n "includes(" tests/*.test.ts` | T2 WIRING (grep the import graph) |
| **D · THE UNWIRED-MODULE TEST** | a thorough test of a module nothing imports | the import graph (AP-1) | T2 WIRING |
| **E · THE SHAPE-ONLY ASSERTION** | a test asserting a shape, not an effect | the assertion body has no side-effect check | T5 EFFECT-NOT-SHAPE |
| **F · THE INFLATED COUNT** | a test asserting N from N firings, no resolution | the test counts calls, not outcomes | T5 EFFECT-NOT-SHAPE |
| **G · THE STUB'S ALIAS** | a stub tested under a second name | `grep -n "Alias\|alias" src/omp/extension.ts` | T4 NO-ENCODE-DEFECT |

---

# §5 · THE GOAL-LOOP FLAWS (SRC-6 — G-1..G-9)

| # | The flaw | DETECTION | FIX |
|---|---|---|---|
| G-1 | no SCOPE check | `grep goal src/omp/extension.ts` → zero functional hits | GT-2 the scope gate |
| G-2 | no FRESHNESS check | `grep storeFreshness src/omp/` → never called | GT-3 the freshness gate |
| G-3 | no DEPLOY check | no mtime compare in the completion path | GT-4 the deploy gate |
| G-4 | no LIVE-FIRING check | `graph_gate_state` = 0 rows | GT-5 the live-firing gate |
| G-5 | the audit is a TOOL, not a GATE | `extension.ts:580` registers it; no hook invokes it | ★ GT-1 the audit gate |
| G-6 | the loud-crash register UNWIRED | `grep hard-deps extension.ts` → zero | GT-7 the preflight gate |
| G-7 | the tests certify FIXTURES | 0 suites import the deployed bundle | GT-8 the test-reality gate |
| G-8 | `goal(complete)` accepts PROSE | `runtime.ts:470-494` checks status only | GT-1 |
| **G-9** | ★ **the callee-fix-without-the-callsite** | `grep runGraphGate gate-hook.ts` → `hasStore: true` | AP-8 the call-site verification |

---

# §6 · THE CONSOLIDATED FAILURE CLASSES (SRC-4 — the recurring ledger)

| # | The class | The mechanism | DETECTION |
|---|---|---|---|
| F-44 | SCOPE BREACH | trident/poseidon reconstruction outside goal authority | the goal's file list vs the diff |
| F-45 | CONVERGENT-SCAN | 0c/0h unreachable; fixes attract new findings | the finding count per pass (it must FALL) |
| F-46 | PROVENANCE-AS-CONTAMINATION | port docs flagged as pollution | the doc-class check |
| F-47 | DEPENDENCY BLOCKER | silently expanded scope | the diff vs the ask |
| F-48 | INDEXER-FALLBACK | a FORBIDDEN regex fallback survived 50+ bans | `grep -rn "regex\|native-ast" src/omp/` |
| F-49 | the manual DOCUMENTED the banned pattern AS A FEATURE | the doc-vs-law check | `grep -n "fallback" reports/GRAPH_INTELLIGENCE_OPERATORS_MANUAL.md` |
| F-50 | "NAMED FALLBACK" masked a wrong-answer architecture | the naming check | the artifact-diff test |
| F-60 | THE GRAPH GATE BLOCKED A NEW-FILE WRITE TWICE | the over-breadth | the triggerCondition scoping |
| F-61 | AUDIT RAIL DOWN (127.0.0.1:4098 refused) → BLOCKED | the rail health | the auth probe first |
| F-62 | THE GATE COULD HANG FOREVER | no timeout | the 30s fail-closed (runner.ts:1093-1124) |
| F-63 | CACHE DEAD UNDER CONCURRENCY | the lock | the concurrency probe |
| F-64 | THE SILENT TOOL (`str.replace` no-op) | 8 fixes never applied | the assert-after-edit |
| F-66 | ★ THE RITUAL QUERY | queries as ceremony | the query must INFORM |
| F-67 | ★ THE HAND-DERIVED FINDING | a lookup as analysis | the analysis depth check |
| F-68 | ★ THE STALE INSTRUMENT | the graph answered about obsolete code | GT-3 |
| F-69 | ★ THE UNWIRED GRAPH | the writers built; the store never read | GT-7 |
| F-70 | ★ THE GUARD INCONSISTENCY | header vs body | AP-5 |
| F-71 | ★ THE DEAD CONFIG | a knob with no consumer | AP-6 |
| F-72 | ★ THE SELF-MEASUREMENT | the agent measures its own output | AP-7 |

---

# §7 · THE CROSS-ERA RECURRENCE (the pattern under every era)

**★ THE SAME SEVEN CLASSES APPEAR IN EVERY ERA. THE FIXES NEVER HELD.**

| Class | Early (Sep 14-15) | Mid (Sep 16-18) | Late (Sep 19-21) | Today (Sep 22) |
|---|---|---|---|---|
| **THE UNREACHABLE COMPONENT** | B8 `hasStore` hardcoded | — | V-08 switch unreachable from graph-query | `hard-deps.ts` dead root; `preflight` never called |
| **THE STUB THAT PASSES** | — | — | V-01 `GI_AUDIT_NOT_WIRED` stub asserted | `graph-code-audit` alias shares execute |
| **THE STALE SUBSTRATE** | — | `gi-omp-port2 GONE`, legs STALE | census unreconciled | store describes `src/hunter`; bundle 21-35h stale |
| **THE FALSE CEILING** | "advertised 12-verb is a false ceiling" | 26 highs unresolved | gate cuts never tuned | graph-query `rows=0` for every live symbol |
| **THE SILENT DEGRADE** | `hasStore:true` | FC-9 named "silent-degrade" | — | `GI_NO_STORE` fixed but bypassed at the caller (G-9) |
| **THE AUDIT TREADMILL** | — | convergence law EN-023 | MF-1..MF-5 autopsy | 7 passes; pass7 regressed pass6 |
| **THE CHECKPOINT LAG** | — | "checkpoint lag 1 wave" | — | the manifest HEAD was 20 commits stale |

**★★★ THE ONE MECHANISM UNDER ALL SEVEN: THE BUILD PRODUCES THE SHAPE OF THE THING (a switch, a gate, a test, a layer) WITHOUT ITS REACHABILITY OR ITS EFFECT — AND THE VERIFICATION PROVES THE SHAPE, NOT THE REACHABILITY.**

---

# §8 · THE DETECTION KIT (the commands to run before ANY ship claim)

```bash
# ─── AP-1 THE UNWIRED KERNEL ──────────────────────────────────────────────
grep -n "^import" src/omp/extension.ts                 # follow transitively; list orphans

# ─── AP-3 THE SILENT PASS ─────────────────────────────────────────────────
grep -rn "cancel:false\|GI_NO_STORE\|ALLOW" src/omp/    # every allow-shape
grep -rn "catch\s*{" src/omp/                           # every swallow

# ─── AP-4 THE CHOSEN CONSTANT ─────────────────────────────────────────────
grep -rn "0\.[0-9]\|300000\|[0-9]\{4,\}" src/omp/graph-gate.ts   # every magic number

# ─── AP-5 THE GUARD INCONSISTENCY ─────────────────────────────────────────
grep -n "fail-open\|Fail-open\|Fail-open" src/omp/*.ts  # header vs body

# ─── AP-8 THE CALLEE-FIX-WITHOUT-THE-CALLSITE ─────────────────────────────
grep -n "runGraphGate(" src/omp/gate-hook.ts            # the call-site args

# ─── AP-9 THE NAME COLLISION ──────────────────────────────────────────────
grep -rn "export function <name>" src/omp/              # duplicate exports

# ─── AP-10 THE STUB THAT PASSES ───────────────────────────────────────────
grep -rn "NOT_WIRED\|not wired\|PROPOSED\|empty in v1" src/ tests/

# ─── SRC-5 THE FIXTURE SUBSTITUTE ─────────────────────────────────────────
grep -l "aFire()\|stubJudge\|mkdtemp" tests/*.test.ts   # fixture-subject suites

# ─── SRC-5 CLASS C THE SOURCE-STRING ASSERTION ────────────────────────────
grep -n "\.includes(" tests/*.test.ts                   # source greps as proofs

# ─── G-5 THE AUDIT IS A TOOL NOT A GATE ───────────────────────────────────
grep -n "goal\|complete" src/omp/extension.ts           # zero functional hits = the hole

# ─── THE DEPLOY FRESHNESS (GT-4) ──────────────────────────────────────────
stat -c '%y %n' extensions/graph-intelligence/index.js
ls -la --time-style=full-iso src/omp/*.ts | tail -3

# ─── THE STORE SCOPE (GT-2) ───────────────────────────────────────────────
sqlite3 <store> "SELECT file, COUNT(*) FROM typed_nodes GROUP BY file ORDER BY 2 DESC LIMIT 20"

# ─── THE GATE PERSISTENCE (GT-5) ──────────────────────────────────────────
sqlite3 <store> "SELECT COUNT(*) FROM graph_gate_state"   # 0 = the gate never armed
```

---

# §9 · THE FIX MAPPING (every anti-pattern → its gate)

| Anti-pattern | The gate that kills it | Status |
|---|---|---|
| AP-1 The Unwired Kernel | GT-7 preflight + T2 WIRING LAW | GT-7 exists, never called |
| AP-2 The Inverted Component | the doc-anchor check | ABSENT |
| AP-3 The Silent Pass | GT-6 no-fallback | ★ fixed in source, bypassed (G-9) |
| AP-4 The Chosen Constant | the calibrated-flag + basis law | PARTIAL (calibrated:false) |
| AP-5 The Guard Inconsistency | the doc-vs-code check | ABSENT |
| AP-6 The Dead Config | the dead-config gate | ABSENT |
| AP-7 The Self-Measurement | T1 LIVE-SUBJECT + independent audit | ABSENT |
| AP-8 The Callee-Fix | T2 at the CALL SITE | ABSENT |
| AP-9 The Name Collision | the unique-export gate | ABSENT |
| AP-10 The Stub That Passes | T4 NO-ENCODE-DEFECT | ABSENT |
| The Theatricality classes | the independent audit + T1..T7 | ABSENT |
| The Slop signatures | the counter-method | ABSENT |
| The test classes A..G | the 7 test laws | ABSENT |
| G-1..G-8 | GT-1..GT-8 | GT-1 FEASIBLE, unbuilt |
| G-9 | AP-8 | ABSENT |
| The recurring classes | GT-1..GT-8 + L-GIT-1..5 | ALL ABSENT |

**★ THE MAPPING IS THE INDICTMENT: EVERY ANTI-PATTERN HAS A NAMED GATE, AND NEARLY EVERY GATE IS ABSENT. The catalog's value is that each entry now has a DETECTION — the commands in §8 — so the next ship can be mechanically checked before it is claimed.**
