# GI KERNEL v2.0 — DPL1 BUILD SPEC

```
TARGET the six-layer graph stack + the Jev enforcement kernel + the RSI
  layer,
            sealed as a package, with the live gate proven on this host
BASE TREE
  /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
            branch jarvis/gi-main @ 1889ef3cc34d2cda
PREDECESSOR Graph_Intel_v1.3 (SHIP_PACKAGES/, dist 83eb7bba9c5e76db,
  PACKAGE_AUDIT PASS)
CLASS       system (5 new modules, 60 tests, 9 documents)
```

## §0 · THE PROBLEM

The v1.3 gate ships 308 lines that answer ONE question — *is this act safe?* — from a
regex severity over old-vs-new text plus a drift ratio over a process-local Map. Three
measured facts show that is not the machine the work needs:

```
B1  typed_edges.confidence is the DDL DEFAULT 1.0 on 2714/2714 live rows.
    ONE distinct value: the field carries no information, and the mapper
      never
    writes it. A statically-INFERRED `calls` edge claims the certainty of
      an
    OBSERVED `imports` edge.

B3 the live store was populated 2026-09-19T12:31 and read 2026-09-21 with
  NO
    marker distinguishing it from a fresh one. ageMs=128,234,269 vs a 24h
      TTL.
    A stale graph answers confidently about code that has changed.

B2 ONE of the six intended layers is populated (all `graphify:`). A gate
  that
    reads typed_nodes reads an empty table for five of them.

Plus the structural gap: `grep typed_nodes src/omp/graph-gate.ts` → 0
  hits.
THE GATE READS NO STORE AT ALL. It classifies edits by regex over text.
```

And the operator's reweighting, verbatim:

```
"destructive, dumb, or theatrical. explicitly all 3 of these."
"dumb and theatrical is 80% of the kernel's work. destructive rarely
  happens."
```

Which the v1 artifacts independently confirm: of the six parked TTSR kernels,
**five were dumb/theatrical, one destructive — 83% / 17%**.

## §1 · DISCOVERED INTELLIGENCE (measured, never estimated)

```
the live store 2,007,040 B · 1266 nodes · 2713 live edges · 1 of 6 layers
the node kinds        Function 1000 · File 266
the edge predicates declares 1283 · calls 842 · imports 575 · implements
  14
the confidence        1 distinct value (1.0)            ← B1
the staleness         2 days, unmarked                   ← B3
the v1.3 dist         83eb7bba9c5e76db deployed
the battery pre-v2    145 pass / 0 fail
the typecheck        191 errors (pre-existing debt; 0 in the gate modules)
ripwire jail cwd is a worktree of a DIFFERENT repo; a cwd-relative symlink
                     to the GI repo is the compliant map path
store path guard /sessions/[A-Za-z0-9_-]{8,24}/store.sqlite — fixtures
  must
                     use sessionStorePath()
sqlite casing bun:sqlite returns snake_case; a camelCase domain type needs
                     an explicit mapper (the first W3 run failed on this)
```

## §2 · ARCHITECTURE

```
────────────────────────────────────────────────────────────────────┐
│                    GI KERNEL v2.0 — ONE PAGE                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  THE INTELLIGENCE STORE   typed_nodes · typed_edges                │
│    layer_id namespaces the six layers · derivation names the method │
│    confidence = BASE[derivation] x CORROBORATION x FRESHNESS        │
│                           │                                        │
│                           ▼                                        │
│  STAGE 0  PREFLIGHT    every layer declares a dependency            │
│           │            one DOWN ⇒ GI_STACK_INCOMPLETE:<layer> ⇒ REFUSE│
│           ▼                                                        │
│  STAGE 1  CLASSIFY     dumb | theatrical | destructive | benign     │
│  STAGE 2  BIND+INDEX   claims ↔ evidence spans                      │
│  STAGE 3  DETECT       three detectors, ONE interface               │
│  STAGE 4  KERNEL       the worst verdict wins; a tie takes the       │
│           │            heavier class (destructive>theatrical>dumb)  │
│  STAGE 5  VERDICT      ALLOW | STEER | REFUSE | ABORT               │
│  STAGE 6  RECORD       the enforcement sink                         │
│                           │                                        │
│                           ▼                                        │
│  THE ENFORCEMENT KERNEL   E1 WORK (Abide, fail-OPEN)                │
│                           E2 CLOSE (firewall, fail-CLOSED)          │
│                           TSG = the load unit                       │
│                           │                                        │
│                           ▼                                        │
│  THE RSI LAYER            reflex rows, signed + chained             │
│    VERIFIED RETIREMENT · precision recomputed from the ledger       │
│    (this is the 3.0 substrate, built in v2 for compat)              │
└───────────────────────────────────────────────────────────────────┘
```

## §3 · THE THREE CLASSES (T-4)

```
DUMB         the agent acts without looking.
             DETECTED as a FACT: was the target queried before the act?
             (replaces the parked regex "let me guess" with an
               observation)
             VERDICT   BLIND_ACT → STEER the first time

THEATRICAL   the agent claims work it did not do.
             DETECTED by BINDING: zero evidence spans ⇒ FABRICATED, BY
               CODE,
             and the model is NEVER CALLED.
             VERDICT   REFUSE at close

DESTRUCTIVE  the act breaks something.
             DETECTED by CERTIFICATION: L1..L6 each answer.
             UNCERTIFIABLE is NOT a pass — it REFUSES.
             VERDICT   REFUSE / ABORT
```

**Why the first two need the execution record, not the static layers:** they are not
properties of the code. They are properties of the RELATIONSHIP between what the agent
said and what it did — which exists only in the observation stream.

## §4 · THE STORE (T-1, T-8, SC-6, SC-7)

```
typed_nodes   id · canonical_id · kind · label · file · line ·
              layer_id · created_run · superseded_run
typed_edges id · src_canonical · dst_canonical · predicate ·
  evidence_quote ·
              confidence · derivation · layer_id · created_run ·
                superseded_run
INDICES       uq_tn_live_canonical  (one live row per canonical_id)
              uq_te_live_triple      (one live src,dst,predicate)
MIGRATION     migrateLayerColumns(): ALTER + backfill layer_id from the
              canonical_id prefix — every substrate already namespaces its
                rows
              ('graphify:…'), so the layer is recoverable without a
                re-populate
```

### §4.1 THE CONFIDENCE FUNCTION (the B1 kill)

```
confidence = BASE[derivation] × CORROBORATION[layers] × FRESHNESS[age]

BASE explicit 0.99 · inferred 0.72 · heuristic 0.45 · unknown 0.30
CORROBORATION  1.00 one layer · 1.15 two agree · 0.70 two CONFLICT
FRESHNESS      exp(-age/TAU) with TAU per derivation class
               + a changed source file halves its edges until re-populated
```

**THE DERIVATION IS FROM THE PREDICATE, NOT THE PREFIX.** Measured: 2714/2714 live edges
carry the blanket prefix `explicit:`, so the prefix alone yields one class and the field
would again carry no information. The predicate is the honest discriminator:

```
OBSERVED_PREDICATES imports · declares · implements · extends · defines ·
  contains
                     → the STATEMENT IS the edge; it was READ
INFERRED_PREDICATES calls · uses · references · is_of_type · inherits_from
  · invoked_by
                     → the edge was RESOLVED BY NAME and can be wrong
unknown              → 0.30, the FAIL-CLOSED base (never 1.0)
```

### §4.2 THE STALENESS GATE (the B3 kill)

```
layerFreshness(db, {derivation, ttlMs, now}) → {stale, code, populatedAt,
  ageMs, ttlMs}
storeFreshness(storePath, opts) → the same, opening the store itself
TTL   explicit 1d · inferred 3d · heuristic 7d · unknown 1h
      A store with NO populated_at is STALE BY CONSTRUCTION (fail-closed).
CODE  GI_LAYER_STALE:<derivation>
LIVE  stale=true, ageMs=128,234,269 > ttlMs=86,400,000
```

## §5 · THE STAGE MACHINE (T-3)

```
INTERFACE Detector { id, class, detect(ctx) → {verdict, tier, reason,
  evidence} }
DEFAULT_DETECTORS = [dumbDetector, theatricalDetector,
  destructiveDetector]
CLASSIFY the class is DERIVED from the FIRING detector. A caller cannot
  mislabel
           its own act into a lighter class.
TIE RULE   on equal verdict rank the heavier class wins:
           destructive > theatrical > dumb. A safety tie never lightens.
CLEAN RUN  all-PASS is `benign`, NOT the first detector's class (a real
           mis-report the W2 test caught).
```

## §6 · THE ENFORCEMENT KERNEL (T-5)

```
E1 · WORK LAYER    Abide judges THE DIFF              fail-OPEN   ~300ms
E2 · CLOSE LAYER   the firewall judges THE CLAIM      fail-CLOSED
TSG                the load unit supplies the SPANS

THE CLOSE ORDER IS THE DESIGN
  1 DETECT  the claim text (code)
  2 BIND    retrieve spans; ZERO ⇒ FABRICATED, the model is NEVER CALLED
  3 JUDGE   ONE question over the BOUND spans only
  4 ROUTE code applies 0.8 / 0.5; low confidence REJECTS, it does not pass

BANDS    act ≥ 0.8 · flag ≥ 0.5 · clear < 0.5   (declared, not magic)
COVERAGE an INCOMPLETE scan FAILS CLOSED — never read as "no matches"
ENGINES  arrive through DI seams; the register is checked FIRST
```

**THE TWO POLARITIES ON THE SAME OUTAGE:**

```
engine outage → E1 = SKIPPED (the edit proceeds; an editor is never
  wedged)
                 E2 = FAIL_CLOSED  (a false "done" IS the defect)
```

## §7 · THE RSI LAYER (T-7)

```
ROW canonical_id · kind · label · evidence_quote · confidence ·
                confirmed · refuted · unresolved · created_run ·
                  superseded_run ·
                prev_hash · sig
SIGNING HMAC-SHA256 over a canonical byte form; key 0600; store dir 0700
CHAIN           each row binds prev_hash; the next row links the prior
PRECISION confirmed / (confirmed + refuted), RECOMPUTED over the appended
                ledger — NEVER incremented on the row
TIER GUARD (prec ≥0.90, fires ≥10, unres ≤0.20) · REFLEX (prec ≥0.70,
                fires ≥3, unres ≤0.50) · RETIRED (fires ≥20, below the
                  floor) ·
                HOLD (everything else — CAN NEVER PROMOTE)
```

### §7.1 VERIFIED RETIREMENT (SC-5 — the disablement hole)

```
ATTACK     the attacker retires the victim, then inserts its own live row.
           The partial unique index blocks a bare insert; it does NOT
             block
           the retire. Signatures stop INJECTION and do nothing about
             DISABLEMENT.
LAW a supersede is honored ONLY if the SUPERSEDING row exists, is live,
           and VERIFIES.
MEASURED live() → 0 rows (the naive view wrecked)
           liveIncludingForgedRetirement() → the real row, recovered
```

## §8 · THE HARD-DEPENDENCY REGISTER (T-6)

```
LAW   "NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK."
FORM  1 every component declares its dependency + its own error code
      2 no component may substitute a weaker engine (no code path exists)
      3 an unavailable dependency is a NAMED loud failure, never a silent
        pass
      4 a component whose state cannot be determined is DOWN (fail-closed)
FAIL-CLOSED CASES   a throwing probe is DOWN · an EMPTY file is DOWN ·
                    a dir where a file is required is DOWN · a blank
                      dependency
                    or blank code is REGISTER_INCOMPLETE
SECRETS LAW the JEV probe reports presence + LENGTH only, never the value
```

**THE LIVE AUDIT (the honest state of this host):**

```
ok=false  down=6/11  firstCode=GI_LAYER_SEMANTICA
  DOWN L1_SEMANTICA · L2_ARSUMBRIS · L3_UA · L4_C2KG · L5_CORBELL (ENOENT)
  UP   L6_GRAPHIFY (14,085,516 B) · TSG (dir) · ABIDE (dir) ·
       RSI_STORE (dir) · GI_STORE_DIR (dir)
  DOWN JEV   TYPESAFE_AI_API_KEY ABSENT
```

## §9 · SCOPE (14 items, all measured)

```
 1  T-1  layer_id on both tables + the migration        DONE
 2 T-2 the ledgers (rsi/ 0700, gi_reflex, evidence) PARTIAL (built live
   earlier)
 3  T-3  STAGE 0..6 + PREFLIGHT                         DONE
 4  T-4  the three detectors on ONE interface           DONE
 5 T-5 the enforcement kernel (TSG + Abide) DONE (engines not installed)
 6  T-6  the hard-dependency register                   DONE
 7  T-7  the RSI reflex loop                            DONE
 8  T-8  confidence with the predicate derivation       DONE
 9  SC-2 the GI_STACK_INCOMPLETE refusal                DONE
10  SC-4 the mutation proof                             DONE
11  SC-5 the disablement-hole closure                   DONE
12  SC-6 distinct confidence > 1                        DONE
13  SC-7 the staleness TTL                              DONE
14  T-9  the v2→v3 forward-compat map                   DONE
```

## §10 · SUCCESS CRITERIA (mechanical)

```
──────────────────────────────────────────────────────────────────────────
│ ID │ CRITERION │ EVIDENCE │ STATUS │
──────────────────────────────────────────────────────────────────────────
│ SC-1 │ the gate suite + the v2 suites green │ 12/12 + 60/60 │ MET │
│ SC-2 │ a down layer REFUSES with the token │ the token in a result │ MET
  │
│ SC-3 │ no regex fallback in the populators │ grep: policy only │ MET │
│ SC-4 │ the mutation turns the battery RED │ 6/2 → 8/0 │ MET │
│ SC-5 │ the forged retirement leaves the row LIVE │ liveIncluding…
  returns │ MET │
│ SC-6 │ confidence distinct count > 1 │ the mixed-corpus test │ MET │
│ SC-7 │ a 2-day-old graph emits GI_LAYER_STALE │ live store: stale=true │
  MET │
│ SC-8 │ TSG + Abide wired; the reflex loop live │ UNIT green; LIVE OPEN │
  PARTIAL│
│ SC-9 │ PACKAGE_AUDIT PASS + the docs at floor │ the audit + the floors │
  OPEN │
│ SC-10│ the legal stop │ all above │ OPEN │
──────────────────────────────────────────────────────────────────────────
```

## §11 · CONTAINER TEST PLAN (≥5 adversarial angles)

```
RB-IDENT        pass: graph-probe returns PROBE_TOOL_OK + the session id
                fail: no id, or a stale id from another session
RB-TOOLS        pass: graph-query returns typed rows from the store
                fail: zero rows while typed_nodes is non-empty
RB-FIREWALL     pass: a forged reflex row is ABSENT to the reader
                fail: the forged row is trusted
RB-LIFECYCLE    pass: the reflex row supersedes with a VERIFIED successor
                fail: an unverified supersede retires a live row
RB-INTEGRATION pass: an Edit on a quarantined symbol REFUSES with the code
                fail: the edit lands
RB-ERRORS       pass: a down layer yields GI_STACK_INCOMPLETE:<layer>
                fail: the act proceeds
RB-CONFIG       pass: a missing store dir emits GI_POPULATE_FAILED
                fail: it silently creates an empty store

TOKENS are tool-result strings, never prose. If a token can be typed by
  the
agent, it is CIRCULAR and fails the emit.
```

## §12 · ANTI-PATTERN LEDGER (with mechanical detections)

```
CLASS 1 — THE INVERTED ARTIFACT
  gi_exec_graph  a retired invention typed into a doc
                 DETECT: grep -rn "gi_exec_graph" → only retraction notes

CLASS 2 — THE DEAD DIAL
  a constant confidence · a silent staleness · a stored tier drifting
                 DETECT: COUNT(DISTINCT confidence) > 1 · GI_LAYER_STALE
                   fires ·
                         deriveTier recomputed == the stored kind

CLASS 3 — THE THEATRICAL PASS
  a prose token · the happy path only · a sub-inner sold as done
                 DETECT: every token carries a tool result · the forgery
                   tests
                         run first · only the last SC row closes the run
```

## §13 · OPEN DECISIONS

```
──────────────────────────────────────────────────────────────────────────
│ # │ FORK │ DEFAULT │
──────────────────────────────────────────────────────────────────────────
│ E1 │ the oracle's engine: Jev/MPSE/JESL │ JEV + MPSE numbers (NEEDS OP)│
│ E2 │ the polarity on a Jev outage │ the R5 split (work/close) │
│ E3 │ the reflex cache rule │ a CERTIFIED cache is not a │
│ │ │ fallback; a down-layer consult│
│ │ │ IS. NEEDS A RULING. │
│ E4 │ the tier thresholds │ 0.90/10/0.20 (UNCALIBRATED) │
──────────────────────────────────────────────────────────────────────────
```

## §14 · SPEC-MANAGER GATE

```
[x] the problem is stated from MEASURED defects (B1, B3, B2 + the 0-hit
  grep)
[x] every scope item carries its status
[x] every success criterion is command- or token-verifiable
[x] the container plan has 7 angles, each with a pass AND a fail token
[x] the anti-patterns carry mechanical detections
[x] the frozen surfaces are named (the pin's list + the v2 additions)
[x] the honest partials are recorded (SC-8 LIVE open; SC-9/10 open)
[ ] SC-9 / SC-10 — the seal — pending this wave
```
