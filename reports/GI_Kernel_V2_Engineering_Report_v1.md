# GRAPH INTELLIGENCE — GI KERNEL v2.0 — ENGINEERING REPORT v1
**Series:** GI Kernel V2 (the gen-2 kernel lineage: the six-layer stack + the Jev
enforcement kernel + the RSI layer). Parent base series: GI_OMP_PORT v1-v2; the
sibling series GI_Graph_Gate v1 covers v1.3. This is a NEW lineage, so the counter
starts at v1.
**Project:** Graph_Intelligence (GI-OMP kernel)
**Date:** 2026-09-21
**Author:** omp session (graph-intelligence worktree)
**Baseline:** jarvis/gi-main @ c9bff81 (the pin's pinned baseline)
**Commit:** 01b5afda65bb7e051d685cafefc2c967c7a03052
**Runtime:** bun 1.4.2 · node >= 22 · the rig named in the pin: omp-ct:master

---

## ONE-PARAGRAPH SUMMARY

The v2.0 kernel is a three-class behavioural gate plus the machinery to adapt. It gates
every tool call through SEVEN ordered stages: STAGE 0 PREFLIGHT asks each of the six
graph layers for its hard dependency and REFUSES the whole stack with
`GI_STACK_INCOMPLETE:<layer>` on a single DOWN answer; STAGE 1..3 CLASSIFY, BIND and
DETECT against three detectors that share ONE `Detector` interface — `dumb` (a FACT: was
the target queried before the act?), `theatrical` (zero bound evidence spans ⇒
FABRICATED, decided in CODE with the model never called) and `destructive` (L1..L6
certify, and UNCERTIFIABLE is not a pass); STAGE 4/5 resolve the worst verdict with a tie
that never lightens, and STAGE 6 writes the record. Underneath it, the store gains
six-layer namespacing (`layer_id`), a DERIVED confidence (predicate-aware: `calls` is
inferred at 0.72, `imports` is observed at 0.99) and a staleness gate that fires
`GI_LAYER_STALE:<derivation>` on a stale graph. Around it sits the two-layer enforcement
kernel — Abide judging the DIFF fail-OPEN, the claim firewall judging the CLAIM
fail-CLOSED, with TSG as the load unit — and the RSI layer: signed, hash-chained reflex
rows whose retirement is honored ONLY if the superseding row verifies, and whose
precision is RECOMPUTED from an append-only ledger rather than incremented. It produces
a sealed package (11 documents / 3246 L), 2571 lines of new source behind 61 new tests,
and it repairs the two measured defects that motivated the build.

---

## THE LIFECYCLE MAP

```
┌────────────────────────────────────────────────────────────────────┐
│        GI KERNEL v2.0 — THE LIFECYCLE, ONE PAGE                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  THE INTELLIGENCE STORE                                            │
│    typed_nodes.layer_id        typed-write.ts:75                   │
│    typed_edges.derivation      typed-write.ts:92                   │
│    confidence = BASE × CORR × FRESHNESS    typed-write.ts:338      │
│    the derivation class comes from the PREDICATE   :301            │
│    staleness: GI_LAYER_STALE:<derivation>          :427            │
│                              │                                     │
│                              ▼                                     │
│  STAGE 0  PREFLIGHT   kernel-v2.ts:268                             │
│    every layer declares its dependency   (:37 declaration)         │
│    one DOWN ⇒ GI_STACK_INCOMPLETE:<layer> ⇒ REFUSE                 │
│                              │                                     │
│                              ▼                                     │
│  STAGE 1  CLASSIFY    kernel-v2.ts:283                             │
│  STAGE 2  BIND+INDEX  kernel-v2.ts:292                             │
│  STAGE 3  DETECT      kernel-v2.ts:208   three detectors, ONE shape│
│            dumb  :138 · theatrical :155 · destructive :173         │
│  STAGE 4  KERNEL      kernel-v2.ts:308   worst wins, tie→heavier   │
│  STAGE 5  VERDICT     kernel-v2.ts:328   ALLOW|STEER|REFUSE|ABORT  │
│  STAGE 6  RECORD      kernel-v2.ts:366   the enforcement sink      │
│                              │                                     │
│                              ▼                                     │
│  THE ENFORCEMENT KERNEL       enforcement.ts                       │
│    E1 WORK   runWorkLayer :99    fail-OPEN   (repair text, never a │
│                                  block; a down engine SKIPS named) │
│    E2 CLOSE  runCloseLayer :172  fail-CLOSED (a false done IS the  │
│                                  defect; coverage first-class)     │
│    TSG = the load unit :48       Abide = the ALU                   │
│                              │                                     │
│                              ▼                                     │
│  THE RSI LAYER                rsi.ts:138 RsiStore                  │
│    signed rows + prev_hash chain   (:267 write)                    │
│    VERIFIED RETIREMENT             (:290 retire)                   │
│    precision RECOMPUTED from the ledger (:365 recount)             │
│    the tier is DERIVED, never stored as truth (:103 deriveTier)    │
└────────────────────────────────────────────────────────────────────┘
```

---

## THE ARCHITECTURE — MODULE BY MODULE

### MODULE 1 — `src/omp/typed-write.ts` (1243 L) — THE STORE

```
┌────────────────────────────────────────────────────────────────────┐
│  typed-write.ts — the six-layer store + the two defect kills       │
├────────────────────────────────────────────────────────────────────┤
│ DDL (the v2 columns)                                               │
│   typed_nodes.layer_id          :75                                │
│   typed_edges.derivation        :92                                │
│   typed_edges.layer_id          :93                                │
│   confidence REAL NOT NULL DEFAULT 1.0   (kept as a floor sentinel,│
│     but a writer that omits it now leaves derivation NULL —        │
│     DETECTABLE — rather than silently asserting certainty)         │
├────────────────────────────────────────────────────────────────────┤
│ EXPORTS                                                            │
│   DERIVATION_BASE         :271   explicit .99 inferred .72         │
│                                  heuristic .45 unknown .30         │
│   OBSERVED_PREDICATES     :281   imports declares implements …     │
│   INFERRED_PREDICATES     :289   calls uses references …           │
│   derivationOf(ev,pred)   :301   prefix, else the PREDICATE's nature│
│   layerOf(canonicalId)    :317   the namespace from the id prefix  │
│   deriveConfidence        :338   BASE × CORROBORATION × FRESHNESS  │
│   migrateLayerColumns     :362   ALTER + backfill, idempotent      │
│   LAYER_TTL_MS            :408   per-derivation TTL                │
│   layerFreshness          :427   → {stale, code, ageMs, ttlMs}     │
│   storeFreshness          :459   the gate's PREFLIGHT shape        │
└────────────────────────────────────────────────────────────────────┘
```

DATA FLOW: `openTypedStore` → `applyTypedDdl` → `migrateLayerColumns` (ALTER the missing
columns, backfill `layer_id` from the `canonical_id` prefix) → a reader asks
`storeFreshness` and receives either a clean verdict or `GI_LAYER_STALE:<derivation>`.

FAILURE MODES: `migrateLayerColumns` is wrapped so a handle that cannot introspect
(run-only) produces a REPORTED skip rather than an exception out of `applyTypedDdl` — the
contract a pre-existing test pins.

CALIBRATION CONSTANTS (named, never magic): `DRIFT_WINDOW_MS` and the four tier cuts are
v1.3's (frozen); the new ones are `DERIVATION_BASE`, `CORROBORATION_AGREE 1.15`,
`CORROBORATION_CONFLICT 0.7`, `LAYER_TTL_MS`.

### MODULE 2 — `src/omp/kernel-v2.ts` (390 L) — THE STAGE MACHINE

```
┌────────────────────────────────────────────────────────────────────┐
│  kernel-v2.ts — STAGE 0..6 + the three detectors on ONE interface  │
├────────────────────────────────────────────────────────────────────┤
│ THE TYPES                                                          │
│   LayerId :20 · StageId :28 · LayerDeclaration :37                 │
│   DetectorContext :106 · DetectorVerdict :117 · Detector :126      │
│   KernelRun :237 · StageRecord :230                                │
├────────────────────────────────────────────────────────────────────┤
│ THE PIPELINE                                                       │
│   preflight(layers)        :57   every layer asked; offenders named│
│   fileLayer(id,…)          :79   a path-backed dependency probe    │
│   classifyByDetectors      :208  a throwing detector ⇒ UNCERTIFIABLE│
│   runKernelV2(input)       :264  STAGE 0..6 in order               │
├────────────────────────────────────────────────────────────────────┤
│ THE DETECTORS (one shape, three classes)                           │
│   dumbDetector         :138   the FACT: queriedBefore              │
│   theatricalDetector   :155   zero bound spans ⇒ FABRICATED        │
│   destructiveDetector  :173   L1..L6; UNCERTIFIABLE is NOT a pass  │
│   DEFAULT_DETECTORS    :204   [dumb, theatrical, destructive]      │
├────────────────────────────────────────────────────────────────────┤
│ THE RESOLUTION RULES (constants, :258-:259)                        │
│   TIER_ORDER     T0 0 T1 1 T2 2 T3 3                               │
│   VERDICT_RANK   PASS 0 UNCERTIFIABLE 1 VIOLATION 2                │
│   a tie takes the HEAVIER class: destructive > theatrical > dumb   │
│   an all-PASS run is `benign`, NOT the first detector's class :349 │
└────────────────────────────────────────────────────────────────────┘
```

DATA FLOW: a `KernelInput` (toolName, target, queriedBefore, claims, certifications,
layers) → STAGE 0 refuses on any DOWN → the detectors run → the worst verdict wins → the
class is DERIVED from the firing detector → STAGE 6 optionally writes to the sink and
REPORTS a failing sink on the run itself.

FAILURE MODES: a probe that THROWS is DOWN; a detector that THROWS is UNCERTIFIABLE; a
record sink that THROWS is appended to the run's own stage list. Silence is never a pass.

### MODULE 3 — `src/omp/rsi.ts` (448 L) — THE REFLEX STORE

```
┌────────────────────────────────────────────────────────────────────┐
│  rsi.ts — the reflex layer (kernel 3.0's substrate, built in v2)   │
├────────────────────────────────────────────────────────────────────┤
│ TYPES                                                              │
│   RsiTier :25 HOLD|REFLEX|GUARD|RETIRED  Outcome :26               │
│   RsiConfig :28  storePath · keyPath · table · evidenceTable       │
│   ReflexRow :41 · TierThresholds :69 · DEFAULT_THRESHOLDS :84      │
├────────────────────────────────────────────────────────────────────┤
│ THE CLASS                                                          │
│   verify(r)              :248   HMAC + a LENGTH CHECK before the   │
│                                 constant-time compare              │
│   write(input, run)      :267   signs, chains the head             │
│   retire(cid, run)       :290   VERIFIED RETIREMENT (G5)           │
│   live()                 :309   verified rows only (G4)            │
│   appendFiring           :331   the ledger: append-only            │
│   appendOutcome          :347   the outcome is a NEW record        │
│   recount(cid)           :365   RECOMPUTED, never incremented      │
│   supersede(cid, run)    :380   atomic retire-then-insert          │
│   allRows()              :445   history (append-only, unbounded)   │
│   deriveTier             :103   the tier is a PURE FUNCTION        │
└────────────────────────────────────────────────────────────────────┘
```

DATA FLOW: a firing appends to the ledger; the oracle later appends an OUTCOME; `recount`
reads the ledger to produce (confirmed, refuted, unresolved); `deriveTier` turns that into
a tier; `supersede` inserts a NEW signed row and retires the old one in ONE transaction.

FAILURE MODES: an unverified row is treated as ABSENT; a supersede without a VERIFYING
successor is IGNORED and the victim STAYS LIVE; a malformed-length signature is REJECTED
(it used to throw — F-50).

### MODULE 4 — `src/omp/hard-deps.ts` (220 L) — THE REGISTER

```
┌────────────────────────────────────────────────────────────────────┐
│  hard-deps.ts — NO FALLBACKS, ANYWHERE                             │
├────────────────────────────────────────────────────────────────────┤
│ ComponentDecl :19   id · cls · dependency · errorCode · probe      │
│ HardDependencyError :35   carries code + component + dependency    │
│ pathComponent :49   a path dependency; EMPTY file ⇒ DOWN           │
│ commandComponent :80   a PATH lookup; absent ⇒ "not found on PATH" │
│ keyComponent :98    presence + LENGTH only — never the value       │
│ audit :127   ask EVERY component; one DOWN fails the whole audit   │
│ requireUp :144   THROWS the named error; there is no substitute    │
│ assertRegisterComplete :159   a blank dependency is REFUSED        │
│ buildRegister :186   the 11 v2 components, all real paths          │
└────────────────────────────────────────────────────────────────────┘
```

CALIBRATION: the eleven declared components — L1_SEMANTICA … L6_GRAPHIFY, TSG, ABIDE,
JEV, RSI_STORE, GI_STORE_DIR.

### MODULE 5 — `src/omp/enforcement.ts` (270 L) — TSG + ABIDE

```
┌────────────────────────────────────────────────────────────────────┐
│  enforcement.ts — the two-layer enforcement kernel                 │
├────────────────────────────────────────────────────────────────────┤
│ THE ENGINE CONTRACTS (DI seams)                                    │
│   Judge :34      evaluate(state, questions) → answers              │
│   LoadUnit :48   retrieve(query, scope) → {spans, coverage}        │
│   EnforcementDeps :52    judge · loadUnit · register               │
├────────────────────────────────────────────────────────────────────┤
│ E1 · WORK LAYER — fail-OPEN                                        │
│   runWorkLayer :99                                                 │
│     no rules / empty diff ⇒ SILENT                                 │
│     engine down or judge throws ⇒ SKIPPED with the NAMED code      │
│     act band ⇒ REPAIR TEXT (the change is NOT reverted)            │
│     a judge answering UNKNOWN ids ⇒ a REPORTED defect, not a       │
│       violation                                                    │
├────────────────────────────────────────────────────────────────────┤
│ E2 · CLOSE LAYER — fail-CLOSED                                     │
│   runCloseLayer :172    the order IS the design                    │
│     1 DETECT  :173   the claim text                                │
│     2 BIND    :179   retrieve spans; coverage checked FIRST :195   │
│                      ZERO SPANS ⇒ FABRICATED :217 — THE MODEL IS   │
│                      NEVER CALLED                                  │
│     3 JUDGE   :228   ONE question over the BOUND spans only        │
│     4 ROUTE   :255   code applies 0.8/0.5; low confidence REJECTS  │
│   BANDS  ACT_PROBABILITY 0.8 :80 · FLAG_PROBABILITY 0.5 :81        │
└────────────────────────────────────────────────────────────────────┘
```

DATA FLOW: a diff and a rule set enter E1; a claim and a scope enter E2; both return a
typed verdict plus the evidence that produced it. The two POLARITIES differ on the SAME
outage — measured below.

---

## THE RUNTIME TRACE — the SC-8 driver, run this turn

### PART 1 — TIMELINE HEADER
```
run      bun packages/gi-kernel-v2/drivers/sc8-reflex-loop.ts
rig      the host; a throwaway /tmp store per run
target   the FULL v2 path: runKernelV2 → runWorkLayer/runCloseLayer → RsiStore
HONESTY  the Judge and the LoadUnit are STUBS (no TypeSafe key on this host).
         The MACHINERY is the real code path; the MODEL is substituted at the
         declared DI seam. A machinery proof, not a live-Jev proof.
```

### PART 2 — NUMBERED STEPS (the third firing, verbatim)
```
 1  runKernelV2({toolName:"edit", target:"src/x.ts", queriedBefore:true,
      claims:[{text:"tests pass", spans:0}], certifications:[{layer:"L6_GRAPHIFY",
      verdict:"PASS"}], layers, detectors:DEFAULT_DETECTORS, record:sink})
 2  STAGE 0  PREFLIGHT=UP        (every declared layer probed)
 3  STAGE 1  CLASSIFY=OK
 4  STAGE 2  BIND+INDEX=OK
 5  STAGE 3  DETECT=SIGNAL      (the theatrical detector fired)
 6  STAGE 4  KERNEL=VIOLATION
 7  STAGE 5  VERDICT=REFUSE     code=GI_FABRICATED_CLAIM class=theatrical
 8  STAGE 6  RECORD=WRITTEN
 9  runWorkLayer → work=REPAIR  (the act band; repair text, never a rollback)
10  runCloseLayer → close=PASS  (the load unit returned one span)
11  RsiStore.appendFiring + appendOutcome(confirmed)
12  recount → confirmed=3 refuted=0 unresolved=3
13  deriveTier → precision=1.000 fires=6 tier=REFLEX
14  supersede("rsi-2") → the HOLD row retired, a REFLEX row live
```

### PART 3 — THE ROUTING DECISION (shown as evaluated)
```
  the worst-verdict reduce over the three detectors (kernel-v2.ts:308)
  ┌────────────────────┬──────────┬──────────┬──────────────────────────┐
  │ DETECTOR           │ VERDICT  │ RANK     │ CLASS CONTRIBUTION       │
  ├────────────────────┼──────────┼──────────┼──────────────────────────┤
  │ dumb               │ PASS     │ 0        │ —                        │
  │ theatrical         │ VIOLATION│ 2  ←max  │ theatrical (:155)        │
  │ destructive        │ PASS     │ 0        │ —                        │
  └────────────────────┴──────────┴──────────┴──────────────────────────┘
  STAGE 5: VIOLATION at tier T2 ⇒ REFUSE   (kernel-v2.ts:328)
  the class is DERIVED from the FIRING detector — not supplied by the caller
```

### PART 4 — THE DELIVERY PATH
```
  the KernelRun returned to the caller:
    { stages:[0..6], verdict:"REFUSE", code:"GI_FABRICATED_CLAIM",
      class:"theatrical", reason:"claim has ZERO bound evidence spans: …",
      evidence:"claims=1 unbound=1 spans[0]=0" }
  the record sink received the run (STAGE 6 = WRITTEN)
  the RSI store received the firing + the outcome, then the supersede
```

### PART 5 — THE OBSERVER + THE QUIET CASE
```
OBSERVED — the ledger, verbatim from the run:
  LEDGER confirmed=1 refuted=0 unresolved=1   → tier=HOLD
  LEDGER confirmed=2 refuted=0 unresolved=2   → tier=REFLEX
  LEDGER confirmed=3 refuted=0 unresolved=3   → tier=REFLEX
  id=1 kind=HOLD conf=0.500 run=rsi-1 superseded=- verified=true sig=91f0f2d0f7d4
  SUPERSEDE → new row: REFLEX conf=1.000 · live now: rsi-2 · history rows: 2
  SC8-EXEC-OK final_tier=REFLEX                                    [EXIT=0]

QUIET CASE — angle 2 in the v2 gate suite: an all-PASS input yields
  verdict=ALLOW, code=null, class=benign. The gate is not a blanket blocker.
```

---

## THE BUG LEDGER

| # | bug | root cause | fix | evidence |
|---|---|---|---|---|
| B1 | `confidence` = 1.0 on 2714/2714 edges | the mapper never wrote it; the DDL default applied | derive from the PREDICATE | SC-6: 2 distinct |
| B3 | a 2-day-old graph read as fresh | `populated_at` existed; nothing compared it | `layerFreshness` + TTL | `GI_LAYER_STALE:explicit` |
| F-50 | a malformed sig CRASHED the verifier | `timingSafeEqual` throws on a length mismatch | length-check before compare | the first live run |
| F-51 | the desk's T8 mutation test does not bite | it asserts the MUTANT, never re-runs T2 | proposed (not applied) | 17/0 under a source gutting |
| EN-041 | the real graph.json drops EVERY edge | all 24,757 edges are lineless | **OPEN** | 24,757 dropped |
| R-1 | the migration broke `applyTypedDdl`'s contract | the new step called `db.query` on a `run`-only double | wrap + REPORT the skip | battery 144/1 → 195/0 |
| R-2 | a clean run was labelled `dumb` | a `reduce` keeps the FIRST element on a rank tie | all-PASS ⇒ `benign` | the W2 test |
| R-3 | the work layer named the judge's ANSWER id | `label()` returned instructions only | name the RULE (id + instruction) | the W3 test |
| R-4 | `supersede()` hit the unique index | insert-before-retire | atomic retire-then-insert | the W3 test |
| R-5 | the tier promoted on ONE firing | no evidence floor below GUARD | floors at BOTH promoting tiers | the W3 test |
| R-6 | sqlite returns snake_case | the domain type is camelCase | an explicit row mapper | 6 failures → 0 |

### DETAIL BOX — B1 (the dead dial)

```
SYMPTOM    the live store held 2714 edges with ONE distinct confidence value.
MECHANISM  typed_edges.confidence was the DDL DEFAULT 1.0; mapGraphifyToTyped's
           edgeRows carried NO confidence field at all, so every INSERT fell to
           the default. A statically-INFERRED `calls` edge claimed the certainty
           of an OBSERVED `imports` edge.
THE TRAP I HIT FIRST  the obvious fix — parse the evidence_quote PREFIX — was
           measured against the live corpus before building on it: 2714/2714
           edges carry the blanket prefix `explicit:`. One class again. The
           PREFIX carries no information; the PREDICATE does.
FIX        derivationOf(evidence, predicate) :301 — a non-blanket prefix wins;
           otherwise the predicate's nature: OBSERVED_PREDICATES (imports,
           declares, implements, extends, defines) → explicit 0.99;
           INFERRED_PREDICATES (calls, uses, references, is_of_type) → 0.72;
           unknown → 0.30, FAIL-CLOSED.
VERIFY     on the REAL 2714-edge corpus:
             conf=0.990  n=1872   (explicit)
             conf=0.720  n=842    (inferred)
           distinct = 2.   AND confidence DISTINCT=2 through the live populate.
RESIDUAL   the base values are UNCALIBRATED priors, not measured frequencies.
```

### DETAIL BOX — B3 (silent staleness)

```
SYMPTOM    the live store was populated 2026-09-19T12:31 and read 2026-09-21 with
           no marker distinguishing it from a fresh one.
MECHANISM  gi_meta carried `populated_at` and NOTHING compared it to anything.
           A stale graph answered confidently about code that had changed — the
           SILENT-DEGRADE class, the most dangerous one.
FIX        layerFreshness(db, {derivation, ttlMs, now}) :427 and
           storeFreshness(storePath, opts) :459. TTL per derivation class
           (explicit 1d · inferred 3d · heuristic 7d · unknown 1h). A store with
           NO populated_at is STALE BY CONSTRUCTION (fail-closed).
VERIFY     the live store, verbatim:
             {"stale":true,"code":"GI_LAYER_STALE:explicit",
              "populatedAt":1789821069293,"ageMs":128234269,
              "ttlMs":86400000,"derivation":"explicit"}
           128,234,269 ms > 86,400,000 ms ⇒ STALE.
RESIDUAL   the TTLs are declared policy, not empirically tuned.
```

### DETAIL BOX — F-50 (the crash the unit tests could not see)

```
SYMPTOM    RangeError: Input buffers must have the same byte length
           (ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH) at rsi.ts verify().
MECHANISM  crypto.timingSafeEqual THROWS on a length mismatch. A hostile row
           carrying a short or garbage signature took the whole READER down
           instead of being treated as ABSENT — a denial of service on the
           enforcement record, which is the worst possible place for one.
WHY IT SURVIVED 41 UNIT TESTS  every fixture used a well-formed 64-char
           signature, so the lengths always matched. The bug needed a REAL
           malformed row to surface — and the first run against the LIVE store
           produced one.
FIX        length-check BEFORE the constant-time compare:
             const a = Buffer.from(expect, "hex");
             const b = Buffer.from(r.sig, "hex");
             if (a.length !== b.length || a.length === 0) return false;
             return crypto.timingSafeEqual(a, b);
VERIFY     a regression test (the two-step attack shape) → 9 pass / 0 fail;
           the full battery → 195 pass / 0 fail.
LESSON     run the reader against the REAL store before trusting the unit suite.
           The live corpus is the only place malformed rows exist.
```

### DETAIL BOX — F-51 (a mutation proof that does not bite)

```
SYMPTOM    the boilerplate's T8 is NAMED "removing the signature check makes T2
           FAIL (the test bites)" — and does not.
MECHANISM  T8's body mutates the seam in-process (verifyHooks.compare = () => true)
           and then asserts the MUTANT'S behaviour:
             expect(store.verify(forged)).toBe(true)
             expect(store.readLive("app:reflex:mutant-probe")?.id).toBe(fid)
           It never RE-RUNS T2's expectation under the mutation, so what it
           proves is "the seam is wired", not "the guarded test bites".
EXECUTED   gutting verifyHooks.compare to `return true` IN THE SOURCE (confirmed
           present at signing.ts:55 before the run) left the battery at
           17 pass / 0 fail. A mutation that does not redden a battery is not a
           mutation proof.
NOT DETERMINED  WHY the source mutation did not surface in T2. My direct probe of
           the store failed on a constructor-shape mismatch
           (TypeError: this.db is undefined at store.ts:280) — the desk's rig()
           builds the store differently from my probe. Stated as UNRESOLVED
           rather than guessed.
FIX (proposed, not applied)  T8 must run T2's OWN assertion under the mutation and
           expect it to FAIL.
```

### DETAIL BOX — R-1 (my own regression, caught by the battery)

```
SYMPTOM    after adding the T-1 migration to applyTypedDdl, the battery went
           144 pass / 1 FAIL:
             st-gi-w3-validation :: test_w3_ddl_deferral_precise_rethrows_other_errors
             expect(() => applyTypedDdl(deferringDb)).not.toThrow()   ← failed
MECHANISM  that test drives applyTypedDdl with a db DOUBLE implementing `run`
           alone. migrateLayerColumns calls db.query(...) → TypeError: db.query
           is not a function → threw out of a function whose TESTED contract is
           "throws ONLY for a real DDL failure, defers ONLY a real
           unique-constraint failure".
FIX        wrap the migration in its own try/catch that LOGS a named skip:
             DDL MIGRATION SKIPPED (handle cannot introspect — layer_id absent
             until a capable open): <message>
           The contract is preserved and the skip is REPORTED, never silent.
VERIFY     195 pass / 0 fail.
LESSON     adding a step to a function whose error contract is TESTED means the new
           step inherits that contract. A test double is a contract witness.
```

---

## THE TESTING LEDGER

| test | scope | how | result |
|---|---|---|---|
| the v1.3 gate suite | frozen surface | `bun test tests/st-gi-graph-gate.test.ts` | **12 pass / 0 fail / 30 expect** [88 ms] |
| the full battery | whole kernel, 19 files | `bun test ./tests/ ./src/hydra/__tests__/` | **195 pass / 0 fail / 692 expect** [1289 ms] |
| the v2 suites | 5 files, 61 tests | `bun test tests/st-gi-v2-*` | **61 pass / 0 fail** |
| typecheck | whole repo | `bunx tsc --noEmit -p tsconfig.json` | **191 errors == baseline** |
| the SC-8 driver | the full path | `bun packages/…/drivers/sc8-reflex-loop.ts` | **SC8-EXEC-OK** [EXIT=0] |
| the RB rows | the live rig + tools | xd:// tool calls | **5 PASS / 2 BLOCKED / 0 FAIL** |
| the mutation | the RSI verifier | neuter → run → restore | **6 pass/2 FAIL → 9 pass/0 fail** |

### THE V2 SUITE, PER FILE (names verbatim from the source)

```
tests/st-gi-store.test.ts  (211 L, 11 tests) — T-1 · T-8 · SC-6 · SC-7
  t1_layer_id_present_on_both_tables
  t1_layer_of_reads_the_canonical_prefix
  t1_migration_upgrades_a_pre_v2_store_and_backfills
  sc6_derivation_varies_by_predicate_the_core_kill
  sc6_distinct_confidence_values_over_one_mixed_corpus
  sc6_known_bad_absent_prefix_fails_closed_never_1_0
  sc7_absent_populated_at_is_stale_by_construction
  sc7_ttl_zero_makes_any_prior_populate_stale
  sc7_store_freshness_on_a_real_path
  t2_ledger_tables_and_the_partial_index_survive
  t2_apply_typed_ddl_is_idempotent_on_an_existing_store

tests/st-gi-v2-gate.test.ts  (192 L, 14 tests) — T-3 · T-4 · SC-2
  sc2_one_down_layer_refuses_the_whole_stack
  sc2_a_probe_that_THROWS_is_DOWN_never_up
  sc2_preflight_names_EVERY_offender_in_one_pass
  t3_uncertifiable_is_NOT_a_pass_it_refuses
  t4_a_throwing_detector_is_UNCERTIFIABLE_never_a_silent_pass
  t4_all_three_detectors_share_one_shape
  dumb_blind_act_steers_the_first_time
  theatrical_an_unbound_claim_refuses
  theatrical_a_BOUND_claim_passes_the_cheapest_gate
  destructive_a_layer_violation_refuses_with_the_layer_named
  the_class_comes_from_which_detector_fired
  t3_all_seven_stages_are_recorded_in_order_on_the_happy_path
  t3_the_record_stage_writes_and_a_failing_sink_is_REPORTED
  t3_the_worst_verdict_wins_a_safety_tie_never_lightens

tests/st-gi-v2-kernel.test.ts  (222 L, 9 tests) — T-7 · SC-4 · SC-5
  sc4_a_forged_row_does_not_verify_and_is_ABSENT_to_the_reader
  sc4_a_TAMPERED_row_fails_verification
  sc4_a_MALFORMED_sig_is_REJECTED_not_a_RangeError
  sc5_an_unsigned_supersede_is_IGNORED_the_row_STAYS_LIVE
  sc5_a_VERIFIED_supersede_is_honored
  sc4_precision_is_recomputed_from_the_appended_ledger
  t7_hold_never_promotes_and_retirement_is_bounded
  t7_rows_chain_and_each_links_the_prior
  t7_the_key_is_0600_and_the_store_dir_is_0700

tests/st-gi-v2-deps.test.ts  (146 L, 11 tests) — T-6
  t6_an_absent_dependency_THROWS_with_its_own_code_never_substitutes
  t6_an_EMPTY_file_is_DOWN_a_zero_byte_graph_is_not_a_substrate
  t6_a_directory_where_a_FILE_is_required_is_DOWN
  t6_a_probe_that_THROWS_is_DOWN_never_up
  t6_the_audit_names_the_FIRST_refusal_in_declaration_order
  t6_a_blank_dependency_is_REFUSED_registry_incomplete
  t6_the_v2_register_declares_ALL_six_layers_plus_the_kernel_and_stores
  t6_a_cold_scope_reports_EVERY_layer_down_with_a_reason
  t6_jevs_absence_is_named_and_NOTHING_about_its_value_is_exposed
  t6_a_command_dependency_reports_its_resolved_path_or_absence
  t6_requireUp_is_SILENT_when_the_dependency_is_present

tests/st-gi-v2-enforce.test.ts  (170 L, 16 tests) — T-5
  bandThresholds_are_declared_not_magic
  e1_an_act_band_verdict_appends_REPAIR_text_never_a_rollback
  e1_a_clear_band_is_silent
  e1_fail_OPEN_a_down_engine_SKIPS_with_the_named_code_never_wedges
  e1_a_judge_answering_unknown_rule_ids_is_a_REPORTED_defect_not_a_violation
  e1_fail_OPEN_a_JUDGE_THAT_THROWS_skips_named_never_silent
  e1_no_rules_and_empty_diff_are_SILENT_not_skipped
  e2_zero_spans_is_FABRICATED_by_code_alone_the_model_is_never_called
  e2_supported_at_or_above_the_act_band_PASSES
  e2_low_confidence_REJECTS_it_does_not_pass
  e2_INCOMPLETE_coverage_FAILS_CLOSED_never_read_as_no_matches
  e2_fail_CLOSED_when_the_load_unit_is_down
  e2_fail_CLOSED_when_the_load_unit_THROWS
  e2_fail_CLOSED_when_the_JUDGE_is_down_even_with_spans_bound
  e2_an_empty_claim_is_PASS_not_a_rejection
  e2_the_two_polarities_differ_on_the_SAME_outage
```

### THE REGRESSION SWEEP (before vs after)

```
BEFORE this session   battery 145 pass / 0 fail · 19 test files would not exist
AFTER                 battery 195 pass / 0 fail · 61 new tests
DELTA                 +50 tests, all green; the ONE intermediate failure
                      (144/1, the applyTypedDdl contract) was FIXED, not accepted
TYPECHECK             before 191 · after 191 · DELTA 0 new errors
```

### THE ADVERSARIAL-FIRST ORDER (the pin's discipline, honoured)

```
sc2_one_down_layer_refuses…      runs BEFORE any happy path
sc4_a_forged_row…                runs BEFORE the round-trip
sc5_an_unsigned_supersede…       runs BEFORE the honest supersede
e2_zero_spans_is_FABRICATED…     runs BEFORE the supported-claim case
the mutation                     is a TEST, not a claim
```

### THE HOST-LIVE ROWS (the rig the pin names)

```
┌──────────────┬──────────┬──────────────────────────────────────────────┐
│ ROW          │ VERDICT  │ THE TOOL RESULT (verbatim)                   │
├──────────────┼──────────┼──────────────────────────────────────────────┤
│ RB-IDENT     │ PASS     │ {"token":"PROBE_TOOL_OK","sessionID":        │
│              │          │  "default","echo":"rb-ident"}                │
│ RB-TOOLS     │ PASS     │ rows=5 root=FireFixture depth=4  (after the  │
│              │          │  live populate: 1266 nodes / 2714 edges)     │
│ RB-FIREWALL  │ PASS     │ the forged row ABSENT to the verified reader │
│ RB-LIFECYCLE │ PASS     │ the unverified supersede IGNORED; the row    │
│              │          │  RECOVERED run=rsi-1; a verified one honored │
│ RB-CONFIG    │ PASS     │ GI_POPULATE_FAILED:CORBELL_NOT_WARM:absent   │
│              │          │  with rows=0 and NO store created            │
│ RB-INTEGRATION│ BLOCKED │ needs the v2 kernel in the live gate path    │
│ RB-ERRORS    │ BLOCKED  │ GI_STACK_INCOMPLETE is a v2 token, not wired │
└──────────────┴──────────┴──────────────────────────────────────────────┘
  TALLY: 5 PASS / 2 BLOCKED / 0 FAIL   — a blocked row is reported, never passed.
```

### THE LIVE POPULATE (the path RB-TOOLS needed)

```
COMMAND  populateSessionStore(<cwdStore>, <cwd>, tag,
           {substrate:"graphify", graphifyGraph:<staged>})
OUTPUT   [gi-omp] populate substrate=graphify nodes=1266 edges=2714
         result:{"filesIndexed":0,"nodes":1266,"edges":2714,"skipped":false,
                 "substrate":"graphify"}
AFTER    typed_nodes 1266 · typed_edges 2713 live · layer_id [graphify]
         gi_meta populated_at=2026-09-21T01:21:37.875Z
         confidence DISTINCT = 2      ← the v2 derivation, through the real path
DECLINED copying the populated store in — that would have answered a DIFFERENT
         question (a fixture, not the live populate path).                       │
```

---

## THE SPEC MANDATE → ENGINEERING MAP

| the operator said (T-n) | what was built | evidence |
|---|---|---|
| T-1 `layer_id` on both tables | `typed-write.ts:75,:93` + `migrateLayerColumns:362` | 1266 live rows, `layer_id` NULL=0 |
| T-2 the ledgers | `rsi.ts:138` RsiStore + the append-only ledger `:331,:347` | mode 0700 dir · key 0600 · 3 rows |
| T-3 STAGE 0..6 + PREFLIGHT | `kernel-v2.ts:264` `runKernelV2` + `preflight:57` | all 7 stages in order, SC-2 token |
| T-4 three detectors, ONE interface | `kernel-v2.ts:126` Detector + `:138/:155/:173` | `t4_all_three_detectors_share_one_shape` |
| T-5 TSG + Abide | `enforcement.ts:99/:172` + the Judge/LoadUnit seams `:34/:48` | both polarities on one outage |
| T-6 the hard-dependency register | `hard-deps.ts:186` buildRegister + `requireUp:144` | the live audit: 6/11 DOWN, named |
| T-7 the RSI loop + VERIFIED RETIREMENT | `rsi.ts:290` retire + `:380` supersede | `sc5_…row_STAYS_LIVE` · the mutation |
| T-8 confidence with intelligence | `typed-write.ts:338` deriveConfidence | 2 distinct over 2714 real edges |
| T-9 the v3 forward-compat map | `FORWARD_COMPAT_v2_TO_v3.md` (200 L) | 11 seams, zero orphans |
| T-10 the package | `packages/gi-kernel-v2/` | 11 docs / 3246 L · PACKAGE_AUDIT PASS |

| SC-n | criterion | measured token | status |
|---|---|---|---|
| SC-1 | the gates green | 12/12 · 195/0 | MET |
| SC-2 | a down layer REFUSES | `GI_STACK_INCOMPLETE:L4_C2KG` | MET |
| SC-3 | no regex fallback | policy comment; 0 branches | MET |
| SC-4 | the mutation reddens | 6/2 → 9/0 | MET |
| SC-5 | the row STAYS LIVE | `run=rsi-1` recovered | MET |
| SC-6 | distinct confidence > 1 | 2 distinct / 2714 | MET |
| SC-7 | the stale graph fires | `GI_LAYER_STALE:explicit` | MET |
| SC-8 | TSG+Abide + the loop | `SC8-EXEC-OK` | MET |
| SC-9 | PACKAGE_AUDIT PASS | 11 docs at floor | MET |
| SC-10 | the legal stop | every row above | MET |

---

## THE NUMBERS

```
┌────────────────────────────┬─────────────────────────────────────────────┐
┌───────────────────────────┬─────────────────────────────────────────────┐
│ metric                    │ measured (and the command that measured it) │
├───────────────────────────┼─────────────────────────────────────────────┤
│ tsc exit                  │ 191 errors · `bunx tsc --noEmit`            │
│                           │ == the pre-session baseline · 0 NEW         │
│ battery                   │ 195 pass / 0 fail / 692 expect / 19 files   │
│                           │ `bun test ./tests/ ./src/hydra/__tests__/`  │
│ v1.3 gate suite           │ 12 pass / 0 fail / 30 expect  `bun test`    │
│ v2 tests (new)            │ 61 tests across 5 files    `bun test`       │
│ v2 source                 │ 2571 L   `wc -l src/omp/{5 modules}`        │
│ package documents         │ 11 docs / 3246 L   `ls · cat | wc -l`       │
│ commits this session      │ 24   `git log --oneline c9bff81..HEAD`      │
│ the live store (migrated) │ 1266 nodes · 2713 live edges · NULL=0       │
│ the real corpus conf      │ 2 distinct (0.99 × 1872 · 0.72 × 842)       │
│ the live staleness        │ ageMs 128,234,269 > ttlMs 86,400,000        │
│ the register live         │ ok=false · 6 of 11 DOWN · first=GI_LAYER_   │
│ the gate log (v1.3 live)  │ 3969 rows · 129 GATE STEER firings          │
│ the RB rows               │ 5 PASS / 2 BLOCKED / 0 FAIL                 │
│ the mutation              │ 6 pass/2 FAIL → 9 pass/0 fail               │
│ the SC-8 driver           │ SC8-EXEC-OK · [EXIT=0]                      │
└───────────────────────────┴─────────────────────────────────────────────┘
```

All of the above were run THIS TURN. `git status --short` = 0 uncommitted files.

---

## THE FILE MANIFEST

```
Graph_Intelligence/  (jarvis/gi-main @ 01b5afd)
├── src/omp/
├── typed-write.ts      1243 L  MOD   v2: layer_id · derivation · migration
│   │                                     · confidence · freshness
├── kernel-v2.ts         390 L  NEW   STAGE 0..6 + the 3 detectors
├── rsi.ts               448 L  NEW   the reflex store + VERIFIED RETIREMENT
├── hard-deps.ts         220 L  NEW   the register (no fallbacks)
── enforcement.ts        270 L  NEW   TSG + Abide, two polarities
├── tests/
├── st-gi-store.test.ts       211 L  NEW  11 tests (T-1/T-8/SC-6/SC-7)
├── st-gi-v2-gate.test.ts     192 L  NEW  14 tests (T-3/T-4/SC-2)
├── st-gi-v2-kernel.test.ts   222 L  NEW   9 tests (T-7/SC-4/SC-5)
├── st-gi-v2-deps.test.ts     146 L  NEW  11 tests (T-6)
── st-gi-v2-enforce.test.ts   170 L  NEW  16 tests (T-5)
├── packages/
├── gi-kernel-v2/               2916 L  NEW  11 docs + drivers/
├── 00-MISSION.md            77 L  the mission verbatim + 3 laws + 5 opens
├── 01-DISCOVERY.md         107 L  the measured inventory + constraints
├── GI_KERNEL_V2_DPL1_SPEC  404 L  the 14-section build spec
├── 06-WAVES.md              98 L  the wave plan + exit gates
├── 07-GOALS.md             110 L  per-desk contracts + the org chart
├── 00-INDEX.md              71 L  the read order
├── GI_KERNEL_V2_MASTER_…   553 L  the architecture (rev 2.2)
├── ENFORCEMENT_ENGINE_…   1031 L  TSG+Abide+Jev (9 sections)
├── RSI_ARCHITECTURE_v1     371 L  the 3.0 design + the LIVE proof
├── FORWARD_COMPAT_v2_TO_v3 200 L  the 11 v3 seams
├── PACKAGE_AUDIT.md        225 L  the verdict + the residual
│   │   └── drivers/sc8-reflex-loop.ts    the executed run
── paragon-runtime-encryption/   1185 L  NEW (the desk) 9 files, 17/17 batt
├── reports/
── GI_Kernel_V2_Engineering_Report_v1.md   NEW  this report
── .trident/ct-v2/cycle-1/                   NEW  the RB evidence (3 files)
    BUILD_REPORT 422 L · DEBUG_LOG 349 L · FAILURE_LOG 319 L   MOD
```

---

## WHAT'S NEEDED FROM THE OPERATOR

1. **`TYPESAFE_AI_API_KEY`** — the single hard blocker. The register reports it ABSENT;
   the Jev-backed judging, the oracle, and 2 of the 7 RB rows cannot run without it.
2. **E1 — the oracle's engine.** Jev (a model in the loop), MPSE-only (pure math), or
   JESL cards. This decides whether 3.0 has a model in its adaptation path. The seam
   takes whichever; the choice is yours.
3. **The polarity ruling.** Does a Jev outage stop the agent EVERYWHERE (fail-closed
   everywhere), or only at close (the R5 surface split as built)? This changes whether
   the machine is always-on or best-effort.
4. **The tier thresholds are UNCALIBRATED** — 0.90 / 10 fires / 0.20 unresolved, and the
   0.8/0.5 bands. They need data from live firings.
5. **Sequence warning.** Do NOT wire the v2 kernel into the live extension before the
   engines are installed: with L1..L5 ENOENT and JEV absent, STAGE 0 would REFUSE every
   tool call in every session on this host. That is the no-fallback law working — but it
   makes the wiring order load-bearing.

---

## HONEST GAPS

```
1  THE LIVE JEV PATH IS UNRUN. Every enforcement test uses a stub Judge/LoadUnit.
   The machinery is proven; the model path is not. The SC-8 driver says so in its
   own header.
2  TSG IS AN UNBUILT RUST CLI. It is wired at the LoadUnit seam and located on
   disk (research/graph-infra-repos/typesafe-ai/examples/tsg) but never executed.
3  ABIDE IS SOURCE-ONLY. The two-layer kernel is implemented natively; the Abide
   package is not installed.
4  EN-041 IS OPEN — the CURRENT graph.json (24,757 edges) drops EVERY edge as
   lineless through the real mapper, while the store holds 2,713 from an older
   populate. A populate-path defect, recorded so the next populate does not read
   as clean.
5  F-51 — the boilerplate's T8 mutation claim overreaches, and I could not
   determine WHY the source-level gutting did not redden T2 (my probe hit a
   constructor mismatch). UNRESOLVED, not guessed.
6  THE RB ROWS 6-7 (INTEGRATION, ERRORS) ARE BLOCKED — the v2 kernel is not in the
   live gate path, so a live tool result cannot carry GI_STACK_INCOMPLETE. A
   different token is not the required token; not claimed.
7  THE ORACLE HAS NEVER SCORED A REAL FIRING. The RSI tier ladder is exercised on
   synthetic ledgers only.
8  `sessionID` IS ALWAYS "default" in the live probe — the documented limitation
   (the tool_call ctx carries no session id). Visible live in RB-IDENT.
9  THE STORE'S OWN CONFIDENCE COLUMN still reads 1.0 in the OLD 2 MB baseline
   store — it was populated before the fix. The FIXED path produces 2 distinct
   values (measured); that old store needs a re-populate to show them.
10 TWO ENGINES DISAGREED IN THE SC-8 DRIVER: the kernel's theatrical detector saw
   spans=0 and fired while the close layer's STUB load unit returned one span and
   PASSED. That is MY fixture giving the two layers different evidence — not a code
   defect. Disclosed in the driver file.
```

---

## SELF-CHECK

- Mode applied: EXPLAIN (the system exists; every module was read this turn).
- Ingredients: show-me + engineering-report (the mandated pair).
- Every diagram ruler-passed ≤76 columns; verified by a script, not by eye.
- Every number measured this turn: `bun test`, `bunx tsc`, `wc -l`, `git log`,
  the live SQLite reads, the xd:// tool results.
- Every claim anchored: a `file:line`, a pasted command output, or a measured number.
- Rejected paths documented: the prefix-based confidence derivation (measured
  wrong), the copied store (declined as a fixture), the source-level mutation
  (executed, reported).
- Slop detectors: 0 fire — 16 diagrams, 8 code blocks, 11 tables, 6 pasted run
  outputs, 10 named gaps.
