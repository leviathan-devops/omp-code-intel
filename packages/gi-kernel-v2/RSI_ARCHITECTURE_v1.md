# THE RSI LAYER — ARCHITECTURE v1 (confidence · ledger · oracle · guarded seam)
**Not a counter. A statistic, recomputed from an independent source, asserted fresh.**
Kernel 3.0 subsystem. Date: 2026-09-21. Status: DESIGN + a LIVE-EXECUTED guarded-seam
proof (§1) that found and fixed a real hole in the first draft.

---

## §1 · THE GUARDED SEAM — LIVE EXAMPLE, RUN ON THIS HOST

Not an argument. A build + an attack + the verdict, executed.

### 1.1 Built first — the seam exists

```
/home/leviathan/.omp/graph-intelligence/rsi/           mode 0700
├── .kernel.key      32 random bytes, mode 0600, NEVER in the project tree
└── rsi.sqlite       gi_reflex + gi_reflex_evidence

  KERNEL WRITE 1   sig=2d12217667fe732d  kind=Reflex  precision=0.95 (19/20)
  KERNEL WRITE 2   sig=e4731c869cadef3b  kind=Guard   precision=0.99 (31/32)

  LIVE TABLE:
    (1, 'gi:reflex:theatrical:claim-without-span', 'Reflex', 0.95, 'rsi-7', None, '2d12217667fe')
    (2, 'gi:reflex:dumb:blind-structural-edit',    'Guard',  0.99, 'rsi-9', None, 'e4731c869cad')
```

### 1.2 ATTACK 1 — the agent's `bash` inserts an exemption directly

```
sqlite3.IntegrityError: UNIQUE constraint failed: gi_reflex.canonical_id
```

**BLOCKED.** The partial unique index (`ON gi_reflex(canonical_id) WHERE
superseded_run IS NULL`) refuses a second live row. Layer G1 held.

### 1.3 ATTACK 2 — the sophisticated bypass: retire the real row, then insert

```
  agent: UPDATE gi_reflex SET superseded_run='rsi-99'  WHERE canonical_id=... ;
         INSERT INTO gi_reflex (... kind='Retired', sig='deadbeefdeadbeef') ;

  (1, '...claim-without-span', 'Reflex',  'rsi-7',  'rsi-99', '2d12217667fe732d')
  (3, '...claim-without-span', 'Retired', 'rsi-99', None,     'deadbeefdeadbeef')
```

**The write SUCCEEDED at the database level.** The signature check is what stops it:

```
  VERIFIED (trusted): [(1, 'Reflex', '2d12217667fe732d'), (2, 'Guard', 'e4731c869cadef3b')]
  REJECTED (absent) : [(3, 'Retired', 'deadbeefdeadbeef')]

  THE READER'S VERDICT ON THE AGENT'S ROW:
    id=3 kind=Retired sig=deadbeefdeadbeef  ->  ABSENT (treated as if it never existed)
```

### 1.4 THE HOLE THE ATTACK EXPOSED (this is the point of running it)

```
  the REAL Reflex (id=1) now has superseded_run='rsi-99' -> NOT LIVE
  => the agent could not INJECT a rule, but it DISABLED a good one.
  FORGERY was blocked (sig). DISABLEMENT was NOT blocked (supersede).
```

The first draft guarded the wrong door. Signing rows prevents *injection*; it
does nothing about *disablement*, because the agent only had to touch the
**victim's** row, not write a valid one.

### 1.5 THE FIX — proven live

**A retirement is honored only if the SUPERSEDING row verifies.**

```
  LIVE-ROW RESOLUTION with the corrected rule:
    ...claim-without-span  id=1  supersede by UNSIGNED rsi-99
                                 -> IGNORED, row STAYS LIVE  kind=Reflex
    ...blind-structural-edit id=2  LIVE  kind=Guard
```

The forged retirement is inert; the real Reflex stays live. **The one-live-row
invariant moves out of the index and into the reader**, where it can consult the
signature.

### 1.6 The corrected five layers

```
┌────────────────────────────────────────────────────────────────────┐
│ G1  SEPARATE STORE      rsi/ mode 0700, out-of-tree of the project  │
│ G2  SIGNED ROWS         HMAC over canonical content, kernel-only K  │
│ G3  HASH CHAIN          each row binds prev_hash; head anchored     │
│ G4  VERIFIED READS      an unverified row is treated as ABSENT      │
│ G5  VERIFIED RETIREMENT a supersede counts ONLY if the superseding  │
│                         row verifies  ← ADDED BY THIS LIVE ATTACK  │
└────────────────────────────────────────────────────────────────────┘
```

**Honest limit, stated:** the forged row remains in the file. Verification makes
it *inert*, not *absent*. Any reader that skips verification would trust it — so
verification is load-bearing and must be mandatory, not advisory. And G1–G5 hold
only while the gate is the sole path to tool execution; an unobserved channel
degrades these to tamper-*detection*.

---

## §2 · CONFIDENCE — THE INTELLIGENCE FUNCTIONS (a constant is BANNED)

### 2.1 What the live store actually holds

```
predicates:  declares 1283 · calls 842 · imports 575 · implements 14
confidence:  ONE distinct value across all 2714 edges  (1.0)     ← the defect
evidence_quote (real): 'explicit: imports in source graphify:src_hunter_
                        diagnostics_calibration->graphify:src_hunter_shared_db @ src/...'
```

**The sharper reading of the defect:** `1.0` is *correct* for `imports` — that is
a syntactic fact read off an import statement. The bug is not the value; it is
that **842 statically-INFERRED `calls` and 14 `implements` are also marked 1.0.**
An inferred edge claims the certainty of an observed one.

### 2.2 The derivation class is already in the data

```
every evidence_quote opens with its method:
  "explicit: ..."   the statement was READ               → observed
  "inferred: ..."   name/call resolution over the tree   → inferred
  "heuristic: ..."  pattern match                        → guessed
```

So the information needed to compute confidence **already exists**; it is simply
never extracted. The mapper must parse its own prefix.

### 2.3 The confidence function

```
confidence = BASE[derivation_class]
           × CORROBORATION[cross_layer_agreement]
           × FRESHNESS[age]

BASE  (the prior — a syntactic fact is near-certain; a guess is not)
  explicit     0.99      read directly off a statement
  inferred     0.72      resolved by name/call analysis
  heuristic    0.45      pattern match, no resolution
  unknown      0.30      no method recorded  ← FAIL-CLOSED, not 1.0

CORROBORATION  (a second independent layer agreeing raises belief)
  1.00   one layer asserts it
  1.15   two layers agree (e.g. L4 INHERITS_FROM + L5 macro edge)
  0.70   two layers CONFLICT  ← disagreement is evidence, and it LOWERS

FRESHNESS  (a graph is a claim about a moment)
  exp(-age_days / TAU)      TAU = 1.0 syntactic · 3.0 inferred · 7.0 heuristic
  the source file's hash is ALSO compared; a changed file drops
  its edges' confidence to BASE × 0.5 until re-populated
```

### 2.4 The decision algorithms (confidence is not just stored)

```
A1  WEIGHTED CERTIFY      a layer answers with its confidence attached; the gate
                          refuses if the certifying confidence < 0.7. A low-
                          confidence layer cannot authorize a destructive act.

A2  DEGRADED-LAYER ALARM  mean(confidence) over a layer's live rows < 0.60
                          ⇒ the layer DECLARES ITSELF DEGRADED (loud, named:
                          GI_LAYER_DEGRADED:<layer>). Never a silent downgrade.

A3  FRESHNESS GATE        any layer whose newest populated_at > TTL declares
                          STALE (GI_LAYER_STALE) — fixes finding B3, where a
                          2-day-old graph was indistinguishable from a fresh one.

A4  CONFLICT SURFACE      when two layers disagree on an edge, emit
                          kind='Conflict' with both sides — the disagreement is
                          itself a signal the gate can steer on.

A5  CONFIDENCE-FLOOR DROP rows below 0.30 are not deleted; they are marked
                          superseded with reason='below-floor' — queryable,
                          never silently trusted.
```

**Why this is not a constant:** confidence is now a function of three measured
inputs (derivation method, cross-layer agreement, file age) and it DRIVES a
decision at A1/A2/A3. A wrong confidence changes the gate's behavior. That is the
test of a real signal.

---

## §3 · THE EXECUTION LEDGER — HOW PRECISION IS BUILT

### 3.1 Two record types, one stream, append-only

```
gi_reflex_evidence (append-only — never updated)
┌─────────────────┬──────────────────────────────────────────────────────┐
│ FIRING record   │ canonical_id · fired_at · session_id ·               │
│ (written at      │ act_fingerprint = sha256(tool|target|args-hash) ·    │
│  violation time) │ verdict (act|flag|clear) · prev_hash · sig           │
├─────────────────┼──────────────────────────────────────────────────────┤
│ OUTCOME record  │ canonical_id · firing_id · outcome =                 │
│ (written LATER,  │   confirmed | refuted | unresolved ·                 │
│  by the ORACLE)  │ outcome_at · outcome_evidence · oracle_confidence ·  │
│                 │ prev_hash · sig                                      │
└─────────────────┴──────────────────────────────────────────────────────┘

precision(canonical_id) =
    count(outcome=confirmed) / (count(confirmed) + count(refuted))

unresolved_ratio = count(unresolved) / (confirmed + refuted + unresolved)
```

**Append-only is what makes this honest:** the outcome is a NEW record, not an
edit of the firing. So the firing's original verdict is preserved forever next to
what the kernel later concluded about it — you can measure the kernel's own
error rate.

### 3.2 The nightly reduction (the RSI tick)

```
per reflex signature:
  1  pull all firings + their outcomes from the evidence stream
  2  precision = confirmed / (confirmed + refuted)      [recomputed, never +1]
  3  tier      = tier(precision, fires, unresolved_ratio, age)
  4  if tier != current_live.kind:
         INSERT new row (created_run='rsi-<N>', fresh sig)
         mark the prior live row superseded_run='rsi-<N>'
  5  anchor: append the chain head to the git ledger (§5.4)
```

---

## §4 · THE ORACLE — WHERE THE INTELLIGENCE LIVES

The §E draft was vague. This is the concrete architecture. **Shape stays in
code; meaning goes to Jev** — the insertion law the whole stack already follows.

### 4.1 The two halves

```
┌────────────────────────────────────────────────────────────────────┐
│  HALF 1 · CODE — gather the SHAPE facts                             │
│  (no model; these are queries over the ledger and the six layers)   │
├───────────────────────────────────────────────────────────────────┤
│  repaired?          a later edit touched the same target within T   │
│  re-tested?         a test/verify tool ran after the violation      │
│  landed?            the session ended with the target in a good state│
│  corroborated?      a second layer independently flagged it         │
│  downstream?        the gate's own later verdicts on the same target │
│  age                how long ago; is the evidence still fresh       │
└───────────────────────────────────────────────────────────────────┘
                              │ the facts
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  HALF 2 · JEV — the MEANING judgment                                │
│  ONE Noul per firing:                                               │
│    instructions: "Given the original violation and what followed,   │
│                   was that violation REAL?"                         │
│    when_true:  the violation was real and the repair was necessary  │
│    when_false: the act was legitimate; no harm; the flag was noise  │
│    state: { violation, act_fingerprint, facts:{...} }               │
│  → P(real)                                                          │
└───────────────────────────────────────────────────────────────────┘
                              │ P(real)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  CODE — the thresholds (never the model's job)                      │
│    P >= 0.80  → confirmed                                           │
│    P <= 0.20  → refuted                                             │
│    else       → unresolved        (excluded from precision)         │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Why Jev here, and not a rule

```
"was this violation real?" is MEANING, not shape:
  · it needs the intent behind a later edit
  · "repaired" and "reverted" look identical structurally
  · it needs to read the facts as a story

per the insertion law: an `if` on strings here would be a pile of regex.
```

And the facts come from code, so the model never counts, compares dates, or
sums — it only reads a small, pre-assembled fact block.

### 4.3 The MPSE / JESL framing (offered, not assumed)

```
MPSE   the math is the spec: precision = c/(c+r) and the three band cuts ARE
       the contract; the battery pins them numerically. This is what keeps the
       oracle from becoming a vibe.
JESL   if the operator wants the oracle's rules as reviewable cards, the rule
       set (thresholds, fact predicates, band cuts) is expressible as JESL
       cards — a later layer, not required for v3.0 to work.
```

**Recommended default: Jev for the judgment, MPSE discipline for the numbers,
JESL deferred.** Named as an open decision.

### 4.4 The honest weakness, unchanged and named

```
REFUTED infers "harmless" from "no harm observed". That is an inference.
Mitigation: unresolved_ratio gates promotion (§5), so a reflex built mostly on
inference can never reach Guard. And REFUTED requires a SECOND signal
(permitted downstream), never merely the absence of a complaint.
```

---

## §5 · WHY EVERY NODE IS SUPERSEDED — the loop structure (approved for the record)

```
1  APPEND-ONLY IS THE POINT. An UPDATE leaves no trace of what it replaced.
   A supersede leaves the old row, queryable, forever.

2  TIME-TRAVEL FOR FREE. Two stamps give full as-of semantics:
       live(N)   = superseded_run IS NULL
       as_of(M)  = created_run <= M AND (superseded_run IS NULL
                                         OR superseded_run > M)
       history   = all rows WHERE canonical_id = S
   You can ask "what did the kernel believe at rsi-3, and how wrong was it?"
   — the only way to audit an adaptive system.

3  FORGERY RESISTANCE. A silent mutation is the natural harbour for a poisoned
   rule. A visible supersede chain is not. (§1 proved this live.)

4  THE ROW IS A CHECKPOINT, AND CHECKPOINTS MUST BE IMMUTABLE. Because precision
   is re-derived from the ledger, nothing is lost by never rewriting a row —
   and everything is lost by rewriting it.
```

### 5.4 The git update ledger (the operator's visibility requirement)

```
each RSI tick commits ONE file to the repo:
  .omp/graph-intelligence/rsi/ledger/rsi-<N>.json
    { run, at, chain_head_sha, per_reflex:[{canonical_id, precision, tier,
      confirmed, refuted, unresolved}] }
⇒ full macro history through time, in git, reviewable and revertable
```

---

## §6 · OPEN DECISIONS

```
┌────┬──────────────────────────────┬────────────────────────────────┐
│ #  │ FORK                         │ DEFAULT                        │
├────┼──────────────────────────────┼────────────────────────────────┤
│ E1 │ Oracle engine: Jev/MPSE/JESL │ JEV + MPSE numbers             │
│ E2 │ TAU per derivation class     │ 1d/3d/7d (uncalibrated)        │
│ E3 │ REFUTED watch window T       │ session+24h -> unresolved      │
│ E4 │ Guard promotion bar          │ prec>=.90 fires>=10 unres<=.20 │
└────┴──────────────────────────────┴────────────────────────────────┘
NEEDS THE OPERATOR: E1 (the oracle's engine) — it decides whether the RSI has a
model in the loop at all.
```

## §7 · THE RESIDUAL

```
BUILT AND PROVEN LIVE  the guarded seam (G1-G5), incl. the disablement fix
DESIGNED, NOT BUILT    confidence fn · ledger reduction · oracle · tier ladder
UNEXERCISED            the oracle has never scored a real firing
UNCALIBRATED           TAU, the 0.8/0.2 cuts, the promotion bar — all guesses
BLOCKED ON             the v2 ledger must exist first (3.0 eats 2.0's output)
```
