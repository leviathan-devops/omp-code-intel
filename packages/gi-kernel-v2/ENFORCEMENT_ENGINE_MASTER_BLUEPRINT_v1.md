# THE ENFORCEMENT ENGINE — MASTER BLUEPRINT v1
**TSG + Abide: a Jev co-processor that reads the 6D knowledge graph and acts on agent behaviour.**
System: GI Kernel v2.0 enforcement layer. Sources: `typesafe-ai/examples/tsg` (Rust, d4455ef),
`coldteadotai/abide` (TS, MIT), `JEV_ABIDE_CONTEXT_HANDOVER/` (43 entries).
Date: 2026-09-21. Status: EXTRACTED (both engines exist, read first-hand this session).

Extraction-deferred = THEATRICAL. Every claim below carries a file:line anchor into a source
read this session, or is marked PROPOSED with an owner. Unknowns are named, never stated.

---

## §1 · MACRO BLUEPRINT — the whole engine on one page

```
┌──────────────────────────────────────────────────────────────┐
│      THE ENFORCEMENT ENGINE = A MICRO-COMPUTER ON THE GATE   │
│                                                              │
│THE 6D STORE  (operand memory — READ ONLY)                    │
│  typed_nodes · typed_edges · evidence_quote · confidence     │
│       │                                                      │
│       │  operands: spans, contracts, precedents, blast radius│
│       ▼                                                      │
│TSG · THE LOAD/IO UNIT                        [Rust]          │
│  scanner → routing(4 Nouls) → segmenters → per-passage Noul  │
│  → TopMatches → COVERAGE                                     │
│  in: a query + a scope    out: ranked EVIDENCE + coverage    │
│       │  spans / passages                                    │
│       ▼                                                      │
│ABIDE · THE ALU                            [TS/Node]          │
│  rubric(v1) → ONE Jev call carrying EVERY rule → verdicts    │
│  bandFor → act | flag | clear     (thresholds 0.8 / 0.5)     │
│  action = REPAIR TEXT appended — NEVER a block (R3)          │
│       │  verdicts                                            │
│       ▼                                                      │
│CLAIM FIREWALL · THE BRANCH UNIT                [TS]          │
│  DETECT(no Jev) → BIND(no Jev) → JUDGE(1 Jev Choice)         │
│  → ROUTE(code)                                               │
│  zero spans ⇒ FABRICATED, Jev never called                   │
│  action = THROW CLAIM_REJECTED (close only)                  │
│                                                              │
│THE CO-PROCESSOR: JEV — the ONLY part that "thinks".          │
│Everything around it is code. Code owns every branch.         │
│                                                              │
│WRITES: .abide/events.jsonl + the claim ledger + reflex nodes │
└──────────────────────────────────────────────────────────────┘
```

### §1.1 What it is, one paragraph

The enforcement engine is a **two-stage judge over the agent's behaviour**, fed by the six
knowledge layers and powered by a single narrow AI primitive. **TSG** is the load unit: given a
plain-English query it streams a scope, routes each file by content, segments it into passages,
and asks one independent Jev question per passage — returning ranked evidence plus an explicit
coverage report. **Abide** is the ALU: it compiles the operator's own rules from `AGENTS.md` into
a rubric of typed questions, sends the whole rule set in ONE Jev call against the current diff,
and converts the answers into `act | flag | clear` verdicts, appending repair text rather than
blocking. The **Claim Firewall** is the branch unit: it detects a completion claim, binds it to
evidence spans in CODE (no model), and only if spans exist does it spend one Jev call to judge
whether those spans support the claim — rejecting a claim that has none. **Jev is the
co-processor**: a System One model that returns typed judgments and probabilities instead of
generated text, and is the only component permitted to make a semantic decision.

### §1.2 What it is NOT

```
NOT an agent — it has no loop of its own; the gate drives it
(jev-swe-regex-pile §law)
NOT a generator       — it returns typed answers; it never writes prose
NOT a controller — code owns ALL control flow and side effects
(typesafe-ai skill)
NOT a tool-blocker — Abide appends repair text; it does not stop the agent
    (R3)
NOT a fallback path — no rule, no span, no key = a NAMED skip event, never
a silent pass
NOT inside the 50ms — Abide is 8s-class; it cannot live in the TTSR regex
lane (L8)
```

---

## §2 · LIFECYCLE — every stage, in execution order, cheapest first

```
────────────────────────────────────────────────────────────────────┐
┌─────────────────────────────────────────────┐
└─────────────────────────────────────────────┘
├───────────────────────────────────────────────────────────────────┤
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
└───────────────────────────────────────────────────────────────────┘
```

### STAGE S1 · DETECT — Abide's entry (postToolUse.ts:35)

**WHAT** the hook receives the raw tool payload and decides whether anything is checkable.
**HOW** `postToolUseInputSchema.safeParse(raw)` → `editsFromPostToolUse(input)` →
`findRepoRoot` → filter `isExcludedPath`.
**WHERE** `Abide_postToolUse.ts:35` `handlePostToolUse`; `:37` `if (!parsed.success) return
{kind:"silent"}`; `:44` `if (edits.length === 0) return {kind:"silent"}`.
**WHY** five distinct silent exits precede any model call — the hook must cost nothing when there
is nothing to check.

```
:37   parse-fail        → silent
:44   no edits          → silent
:51   no rules loaded   → silent
:70   empty diff        → silent
:73   no API key        → SKIP EVENT (named), then continues to runCheck
```

### STAGE S2 · BIND — the Claim Firewall's cheapest gate

**WHAT** bind the claim to spans BEFORE spending a model call.
**HOW** code searches the execution evidence for spans that could back the claim.
**WHERE** the binding loop is specified in `01_BINDING_SPEC/JevClaimFirewall_Blueprint.md`
(801 lines, DESIGN status — the code does not exist yet this is the spec, so this stage is
PROPOSED, owner: the v2.0 build).
**WHY** *"judgment on bound evidence only"* — a claim with zero spans is `FABRICATED` by code
alone, and *"Jev never called"*. This is the single largest cost saving in the engine: the
common theatrical case never reaches the model.

### STAGE S3 · LOAD — TSG's retrieval

**WHAT** fetch the passages/spans an operand needs.
**HOW** `request_for(mode, query, model, unit)` builds the state and ONE Noul question.
**WHERE** `engine.rs:201` `request_for`; the state shape at `:225-236`.
**WHY** the question shape is the whole design — one Noul per passage, never a Choice.

```rust
// engine.rs:201 — verbatim structure (abridged to the shape)
let (instructions, when_true, when_false) = match mode {
Mode::Grep => ( // "Judge whether `target` satisfies the semantic
condition in `query`"
"...Apply the relationship requested by the query exactly: a mention or
    comment
counts when the query asks about mentioning or documenting something,
    while
discussion alone does not establish implemented behavior when the query
    asks
         what code does.", ...
    Mode::Find => (   // "Could `target` help a reader investigate `query`?"
        "...Judge it as independently retrievable source evidence...", ...
    ),
};
Request::new(json!({
    "prompt_version": PROMPT_VERSION,   // "tsg-stream-v2"
    "query": query, "path": unit.path,
"line_range": {"start":..,"end":..}, "byte_range": {"start":..,"end":..},
    "kind": unit.kind, "headings": unit.headings,
    "target": unit.target, "context": unit.context,
}))
.with_model(model)
.with_question(QUESTION_ID,              // "target_matches"
Question::noul_with_criteria(instructions, NoulCriteria::new(when_true,
    when_false)));
```

### STAGE S4 · JUDGE — the one model call

**WHAT** send every rule (Abide) or the claim question (Firewall) in a single call.
**HOW** `experimental_evaluate({model, state, questions, maxRetries, abortSignal})`.
**WHERE** `Abide_jev.ts:174-182` `checkWithModel` — *"One call carrying every rule. The state is
only the rule set and the change."*
**WHY** one call, `maxRetries = 0` inside a hook — *"Transient gateway failures to retry. Zero
inside a hook, where the budget is the agent's time."*

```ts
// Abide_jev.ts:174 — verbatim signature + the cost discipline
export const checkWithModel = async (
  rules: readonly ModelRule[], state: CheckState, thresholds: Thresholds,
  timeoutMs: number,
  retries = 0,          // zero inside a hook
): Promise<ModelCheckResult> => {
  if (rules.length === 0) return { verdicts: [], usage: {}, latencyMs: 0 };
  const creds = credentials();
if (creds.kind === "none") throw new AbideError("NO_API_KEY",
    NO_KEY_HINT);
  ...
  result = await evaluate({ model, state, questions, maxRetries: retries,
abortSignal: AbortSignal.timeout(timeoutMs), providerOptions });
```

### STAGE S5 · ROUTE — code, never the model

```
// band.ts — the only place a threshold is applied
violationProbability(question, answer) → { probability, answer? }
bandFor(probability, thresholds)       → "act" | "flag" | "clear"
```

**WHERE** `Abide_jev.ts:203-228` builds each verdict:
```ts
const { probability, answer: picked } =
violationProbability(rule.check.question, answer);
verdicts.push({ ruleId: rule.id, probability, band: bandFor(probability,
    thresholds),
                ...(picked === undefined ? {} : { answer: picked }) });
```
**WHY** the model supplies a number; CODE decides what the number means. The thresholds (0.8 /
0.5) live in the rubric, not the prompt.

### STAGE S6 · ACT — repair, never block

**WHERE** `Abide_postToolUse.ts:126-170`.
**HOW** partition verdicts into `acting` (band=act, under the per-rule cap) and `flagged`
(band=flag). `MAX_BLOCKS_PER_RULE_PER_TURN = 2` (`constants.ts`).

```ts
// Abide_postToolUse.ts:162-170 — verbatim
const systemMessage = flagged.length > 0 ? flagNotice("edit", flagged,
files) : undefined;
if (acting.length > 0) {
  return { kind: "block", reason: repairReason("edit", acting, actedOn),
           ...(systemMessage === undefined ? {} : { systemMessage }) };
}
return systemMessage === undefined ? { kind: "silent" } : { kind:
"notice", systemMessage };
```

**WHY** `{kind:"block", reason: <repair text>}` — the host renders this as a message, not a
refusal. *"Block is repair text not rollback"* (README:81, R3).

### STAGE S7 · RECORD — the ledger + the RSI reflex

**WHERE** `appendEvent(root, {kind, at, phase, sessionId, ...verdicts})` at
`Abide_postToolUse.ts:88,97,134`.
**EVENT KINDS** `check | skip | error | compile-needed` (verdict.ts:4-68).
**WHY** append-only. The `skip` event is the honesty mechanism: an unchecked edit is *named*,
never silently passed.

---

## §3 · DISPATCH TRACES — every hop, exact call shape

### TRACE A — an edit (Abide, work level)

```
omp runtime
  │ tool_call: write/edit
  ▼
pi.on("tool_result")  ──►  handlePostToolUse(raw)              ACTIVE  :35
  │  postToolUseInputSchema.safeParse                          :37
  │  editsFromPostToolUse(input) → EditHunk[]                  :39
  │  findRepoRoot(all[0].filePath) → root                      :40
  │  filter isExcludedPath(relativeToRoot(root, e.filePath))   :41
  │  recordFileStart(turn, edit.filePath, edit.original)       :47
  │  loadRules(root) → { rules, thresholds, problems }         :49
  │  for each edit: boundState(edit.text) → diff               :64
  │  hasApiKey(root)? no → appendEvent{kind:"skip"}            :73
  │  Promise.all( checkable.map(runCheck({phase:"edit",        :85
  │       fileDiffs, task, rules, thresholds,
  │       timeoutMs: EDIT_CHECK_TIMEOUT_MS })) )
  │       └─► runCheck ─► checkWithModel ─► experimental_evaluate   Abide_je
  │                                              └─► JEV
  │  catch → appendEvent{kind:"error", code} + silent          :100
  │  recordChecked(turn, {path, before: blobId, after: blobId}):119
  │  partition verdicts → acting | flagged                      :126
  │  acting.length>0 ⇒ {kind:"block", reason: repairReason(...)}:166
  ▼
the agent's context receives the repair text as the next message
```

### TRACE B — a close (the Claim Firewall, close level)

```
agent asserts "done" at close
  │
  ▼
DETECT regex/wrap over the assistant text CODE, no Jev [DESIGN 801L]
  │      candidate CLAIM extracted
  ▼
BIND     code searches evidence spans             CODE, no Jev
  │      zero spans ⇒ verdict FABRICATED          ← Jev NEVER CALLED
  │      one+ spans ⇒ proceed
  ▼
JUDGE    ONE Jev Choice:                          JEV
  │        supports | contradicts | says_nothing
  │      + Nouls for theatricality and staleness
  ▼
ROUTE    code:  PASS        span + supports + conf>=0.8 + theatrical<0.7
  │             REJECT      low confidence ⇒ REJECT, not PASS
  │             FAIL_CLOSED no key / auth / timeout / no ledger
  ▼
throw CLAIM_REJECTED  + 4-line steer  +  mandatory ledger write
```

### TRACE C — TSG retrieval (the load unit)

```
tsg find "<query>" <PATH...> main.rs:1
  │
  ├─ scanner: WalkBuilder, .gitignore, hidden filters                scanner
  │    stream, byte-bounded, no whole-file in memory
  │
  ├─ routing (--unit auto): 4 independent Nouls per window           routing
  │    JS/TS binary + Rust binary + CSS binary + Prose binary
  │    select if max >= 0.70 AND max - next >= 0.15                  routing
  │    else → generic `window`
  │
  ├─ segmenters: javascript | rust | css | prose | section
  │    each <= 30 physical lines, rustfmt-enforced by a test         segment
  │
  ├─ evaluate_unit per passage: request_for → 1 Noul                 engine.
  │    QUESTION_ID = "target_matches"; PROMPT_VERSION = tsg-stream-v2
  │
  ├─ validate_probability → reject NaN/out-of-range                  engine.
  │
  ├─ ranking: TopMatches, BinaryHeap bounded top-K                   ranking
  │
  └─ CACHE: sharded content-key files                                cache.r
COVERAGE: every skip/error is an explicit issue, never a match engine.rs
```

---

## §4 · TYPES + ENGINE CHECKS

### §4.1 JEV — the primitives (verbatim from the SDK contract)

```
THE MODEL IDS (Abide_constants.ts — verbatim)
  TYPESAFE_MODEL_ID  = "jev-latest"
  GATEWAY_MODEL_ID   = "typesafe-ai/jev"
  TYPESAFE_KEY_ENV   = "TYPESAFE_AI_API_KEY"
  GATEWAY_KEY_ENV    = "AI_GATEWAY_API_KEY"
JEV_USD_PER_INPUT_TOKEN = 0.042 / 1_000_000 // $0.042 per 1M input, output
    free

THE THREE PRIMITIVES (typesafe-ai skill — verbatim table)
┌──────────────────────┬──────────────────────────────────────┐
│ NEED                 │ PRIMITIVE + THE RULE THAT GOVERNS IT │
├──────────────────────┼──────────────────────────────────────┤
│ one of a defined set │ CHOICE — options COMPETE for mass    │
│ a condition holds    │ NOUL — P(yes); one per label         │
│ a degree/dimension   │ SCORE — ordered, comparable          │
└──────────────────────┴──────────────────────────────────────┘
```

### §4.2 The rubric schema (Abide_rubric.ts:1-60 — verbatim constraints)

```
RUBRIC_VERSION = 1
ruleWhen        = "edit" | "turn"
ruleStatus      = "active" | "weak" | "noisy" | "disabled"
instructions    = string, 1..2000 chars

boolean  { type:"boolean", instructions, criteria?:{true?,false?} }
choice   { type:"choice", instructions, criteria:Record<name,string>,
           violating: string[]  }   ← WHICH OPTIONS COUNT AS VIOLATIONS
  zod refines:  ≥2 options · every violating option must be in criteria
                · at least one option must be compliant
score    { type:"score", instructions, criteria:string[] (index 0 = best),
violatingFrom:number } ← the zero-based level where it becomes a violation
  zod refines:  violatingFrom must point at one of the levels
```

**The design insight in that schema:** a rule declares **which answers are violations**
(`violating`, `violatingFrom`). The model never decides what "bad" means — it only answers a
typed question. Code maps the answer to a verdict.

### §4.3 Engine checks, in execution order

```
┌────┬──────────────────────────────────────┬─────────────────────────────┐
│ #  │ CHECK                                │ GUARD                       │
├────┼──────────────────────────────────────┼─────────────────────────────┤
│ 1  │ postToolUseInputSchema.safeParse     │ fail ⇒ silent               │
│ 2  │ editsFromPostToolUse → non-empty     │ empty ⇒ silent              │
│ 3  │ isExcludedPath (per edit)            │ excluded ⇒ dropped          │
│ 4  │ loadRules → rules.length === 0       │ none ⇒ silent               │
│ 5  │ edit.text !== undefined              │ absent ⇒ skip event         │
│ 6  │ boundState(diff).trim() !== ""       │ empty ⇒ not checkable       │
│ 7  │ hasApiKey(root)                      │ no key ⇒ skip event         │
│ 8  │ rules.length === 0 in checkWithModel │ none ⇒ empty result         │
│ 9  │ creds.kind === "none"                │ throw NO_API_KEY            │
│ 10 │ validate_probability (TSG)           │ NaN / out of range ⇒ reject │
│ 11 │ toAnswer(undefined) → continue       │ missing ⇒ skipped           │
│ 12 │ blockCount < MAX_BLOCKS_PER_RULE     │ cap ⇒ demote to flag        │
│ 13 │ running latency, tokens, cost        │ measured per call           │
└────┴──────────────────────────────────────┴─────────────────────────────┘
```

### §4.4 The constants that define the machine's clock

```
EDIT_CHECK_TIMEOUT_MS      8_000     // the hook's budget per edit
TURN_CHECK_TIMEOUT_MS     15_000
DIFF_TIMEOUT_MS 2_000 // past this: skip + log, never hold the hook
GIT_TIMEOUT_MS             5_000
MAX_STATE_CHARS 24_000 // the diff cap — beyond it, cut and MARKED
MAX_TASK_CHARS               600
MAX_BLOCKS_PER_RULE_PER_TURN  2      // after 2 blocks on a file, only flag
MAX_STOP_CHECKS_PER_TURN 2 // first, plus one re-check after repair
SESSION_STATE_MAX_AGE_MS   7 days
MAX_DIFF_INPUT_CHARS   1_000_000
```

---

## §5 · INVOKE PSEUDOCODE — every nontrivial mechanism

### §5.1 The enforcement invocation (Abide, edit phase)

```
INPUT:  raw tool payload from the host
        rubric rules (compiled from AGENTS.md)
OUTPUT: { silent | notice | block{reason} }

  parse(raw)  →  fail? → RETURN silent
  edits = editsFromPostToolUse(parsed)
  edits empty? → RETURN silent

  root = findRepoRoot(edits[0].filePath)
  edits = edits where not isExcludedPath(relative(root, e.filePath))
  for each edit: recordFileStart(turn, e.filePath, e.original)

  loaded = loadRules(root)
  loaded.rules empty? → RETURN silent

  checkable = []
  for each edit:
      if edit.text is undefined:
          appendEvent(skip, reason="diff too large to compute in time")
          continue
diff = boundState(edit.text) // CAP at MAX_STATE_CHARS, marked
      if diff.trim() is "" : continue
      checkable.push({edit, relative, diff})
  checkable empty? → RETURN silent

  if not hasApiKey(root):
      appendEvent(skip, reason="no api key")   // NAMED, then continues

  task = lastUserPrompt(transcript) or readPrompt(turn)

  TRY:
      checked = parallel for each checkable:
          runCheck({phase:"edit", fileDiffs:[{file, text:diff}], task,
                    rules, thresholds, timeoutMs: EDIT_CHECK_TIMEOUT_MS})
          → checkWithModel(rules, state, thresholds, timeout, retries=0)
→ experimental_evaluate({model, state, questions, abortSignal})
→ for each rule: probability, picked = violationProbability(...)
                               band = bandFor(probability, thresholds)
  CATCH any error:
      appendEvent(error, code=isAbideError? code : "CHECK_FAILED")
RETURN silent // the hook NEVER throws into the host

  acting = []; flagged = []
  for each checked:
      split verdicts by band
      acting_here = act-band verdicts UNDER the per-rule cap
      for each: incrementBlock(turn, key(ruleId, relative))
      acting += acting_here ;  flagged += flag-band + over-cap act-band
appendEvent(check, {files, rules, latencyMs, usage, verdicts, blocked})

  systemMessage = flagged non-empty ? flagNotice(...) : undefined
  if acting non-empty:
RETURN block{ reason: repairReason("edit", acting, actedOn), systemMessage
    }
  RETURN systemMessage ? notice{systemMessage} : silent
```

### §5.2 The claim judgment (Claim Firewall)

```
INPUT:  an assistant CLAIM + the session evidence
OUTPUT: PASS | REJECT | FAIL_CLOSED

  DETECT:  claim = regex/wrap(assistant_text)        // no Jev, cheap
           no claim? → RETURN nothing (this is not a close)

  BIND:    spans = search(evidence, claim)           // no Jev
           if spans is empty:
               verdict = FABRICATED                   // JEV NEVER CALLED
               RETURN REJECT with the absence proof
           if spans.length > 0:
boundSpans = CODE_CAPPED(hashed_ring) // spans, never dumps (R8)

  JUDGE:   one Jev CHOICE over the bound spans:
               supports | contradicts | says_nothing
           plus Nouls: theatricality, staleness

  ROUTE:   if key missing OR auth fail OR timeout OR ledger missing:
               RETURN FAIL_CLOSED                     // R9
           if span exists AND supports AND conf >= 0.8 AND theatrical < 0.7:
               RETURN PASS
           else:
RETURN REJECT // low confidence REJECTS

  ACT:     THROW CLAIM_REJECTED + 4-line steer + mandatory ledger write
```

### §5.3 The TSG retrieval pipeline

```
INPUT:  a query (plain English) + a scope (paths)
OUTPUT: ranked passages + a COVERAGE report

  discover:  WalkBuilder over scope, .gitignore + hidden filters
  for each file (bounded concurrency == --concurrency):
      if --unit auto:
          for each byte-bounded window:
              four independent Nouls: js? rust? css? prose?
              (each judged over ALL the file's contents, not the extension)
          scores = byte-weighted means
          if max >= 0.70 AND (max - next) >= 0.15:  unit = that language
          else:                                      unit = generic window
      segment:  the chosen segmenter (<=30 lines each)
      for each passage:
          request_for(mode, query, model, unit)
          → ONE Noul "target_matches" with when_true / when_false criteria
          → validate_probability
      rank:     TopMatches (bounded top-K, BinaryHeap)
      cache:    content-key shards
  coverage: every file/passage that failed is an EXPLICIT issue
            NEVER converted into a semantic non-match
```

---

## §6 · TREES

### §6.1 The file tree of the enforcement engine

```
enforcement-engine/ (the new package — PROPOSED)
├── e1-work/                                          Abide, the ALU
│   ├── src/lib/checkRunner.ts        runs one check
│   ├── src/lib/diff.ts               editsFromPostToolUse · boundState
│   ├── src/lib/session.ts            turnDir · blockCount · recordChecked
│   ├── src/lib/events.ts             appendEvent → .abide/events.jsonl
│   ├── src/lib/reason.ts             repairReason · flagNotice
│   ├── src/lib/credentials.ts        TYPESAFE_AI_API_KEY | AI_GATEWAY_API_K
│   └── hooks/postToolUse.ts          handlePostToolUse   :35
├── e2-close/                                         the Claim Firewall
│   ├── wraps/                        goal.complete + settled-text  [DESIGN]
│   ├── binder/                       claim ↔ span binding (code only) [DESI
│   ├── judge/                        ONE Jev Choice               [DESIGN]
│   └── ledger/                       the claim ledger (mandatory) [DESIGN]
├── tsg/                                              the LOAD unit (Rust)
│   ├── src/main.rs                   clap CLI: find | grep
│   ├── src/engine.rs                 pipeline · request_for · checkWithMode
│   ├── src/scanner.rs                WalkBuilder · stream · byte bounds
│   ├── src/routing.rs                Profile · Evidence · Decision (4 Nouls
│   ├── src/segmenters.rs             4 segmenters, <=30 lines each
│   ├── src/ranking.rs                TopMatches · Candidate (BinaryHeap)
│   └── src/cache.rs                  sharded content-key cache
└── jev/                                              the CO-PROCESSOR bindi
    ├── jev.ts                        toSdkQuestion · evaluationTarget
    │                                 · checkWithModel · explain · toAnswer
    ├── band.ts                       violationProbability · bandFor
    ├── constants.ts                  model ids · key envs · cost · timeouts
    └── credentials.ts                the 2-route key resolver
```

### §6.2 The call tree of one edit

```
pi.on("tool_result") gate-hook.ts:117
└── handlePostToolUse(raw)                                      postToolUse.
    ├── postToolUseInputSchema.safeParse                          :37
    ├── editsFromPostToolUse(input)                               :39
    ├── findRepoRoot(...)                                         :40
    ├── isExcludedPath / relativeToRoot                           :41
    ├── recordFileStart                                           :47
    ├── loadRules(root)                                           :49
    │   └── { rules, thresholds, problems }
    ├── boundState(edit.text)  ← the diff, capped                 :64
    ├── hasApiKey(root)                                           :73
    └── Promise.all( runCheck(...) )                              :85
        └── checkWithModel(rules, state, thresholds, 8000, 0)     jev.ts:174
            ├── credentials()
            ├── evaluationTarget(creds)
            │   ├── "@ai-sdk/typesafe-ai"  createTypeSafeAi(...)   jev.ts:15
            │   └── "ai"  gateway model + zeroDataRetention        jev.ts:15
            ├── evaluate({model, state, questions, abortSignal})
            ├── for each rule: toAnswer → violationProbability → bandFor
            └── → { verdicts, usage, latencyMs }
```

### §6.3 The type-store the engine reads (measured live, this host)

```
<root>/.omp/graph-intelligence/sessions/<sid>/store.sqlite
├── gi_meta        substrate · graph path · node/edge counts · populated_at
├── typed_nodes    canonical_id · kind · label · file · line · created_run ·
│                  1266 live (Function 1000 · File 266)
└── typed_edges    src · dst · predicate · evidence_quote · confidence · run
2713 live ("declares" 1283 · "calls" 842 · "imports" 575 ·
                   "implements" 14)
confidence: ONE distinct value (1.0) ← a dead dial (finding B1)
```

---

## §7 · LAWS + INVARIANTS

```
L1  CODE OWNS CONTROL FLOW. Jev supplies judgments only.
"Keep the workflow in code. Insert Jev only where if-on-strings would be a
pile of regex." (jev-swe-regex-pile, verbatim)

L2  SHAPE → CODE; MEANING → JEV. A predicate that is a parse, a count, a SQL
    query, a date comparison, or a hash NEVER goes to the model.

L3  THE REGEX-PILE TEST. Cannot list the answers? Retrieve or generate
    candidates FIRST, then let Jev pick. NEVER invent options.

L4  ONE NOUL PER PASSAGE, NEVER A CHOICE OVER PASSAGES.
"Choice options compete for probability mass, so adding another good match
would lower the probabilities of existing matches." (tsg architecture.md)

L5 COVERAGE IS FIRST-CLASS. A failed judgment is an explicit
    incomplete-coverage
    issue. It is NEVER converted into a semantic non-match.

L6 EVIDENCE BEFORE JUDGMENT. The firewall binds spans in CODE and calls
Jev only
    when spans exist. Zero spans ⇒ FABRICATED ⇒ no model call.

L7 REPAIR, NEVER BLOCK (work level). Abide appends repair text. It does
not stop
the agent. (R3, README:81)

L8  FAIL-CLOSED AT CLOSE, FAIL-OPEN AT WORK. Per-surface polarity (R5):
    an edit may not wedge the editor; a false "done" IS the defect.

L9 ONE CALL PER PHASE. Every rule in one evaluate() call. retries=0 inside
    a
hook — the budget is the agent's time. (jev.ts:174-182)

L10 NO SILENT PASS. Every skip, error, or cap-exceeded emits a NAMED event
(kind: skip|error|compile-needed). Silence is only legal when nothing was
checkable. (postToolUse.ts:88-112)

L11 THE HOOK NEVER THROWS INTO THE HOST. Any failure is caught, logged as an
event, and returns silent. (postToolUse.ts:100)

L12 CAPS ARE DISCLOSED. MAX_STATE_CHARS cuts the diff and MARKS it. A
    truncated
    state never reads as a complete one.

L13 TYPED OUTPUT GUARANTEES THE INTERFACE, NOT TRUTH. Calibration is group
frequency; confidence is peakedness, not P(correct). (typesafe-ai skill)

L14 THE MODEL NEVER DECIDES "BAD". The rubric declares which answers are
    violations (violating[], violatingFrom). Code maps answers to verdicts.

L15 NO FALLBACK. A missing key is a NAMED skip (work) or FAIL_CLOSED
    (close).
    Never a substitute engine.                                     (OR-1)
```

---

## §8 · ERROR VOCABULARY + SCHEMA + SHELL

### §8.1 The frozen tokens

```
JEV / GATEWAY
  NO_API_KEY                credentials() returns kind:"none"
CHECK_TIMEOUT the gateway did not answer within the time allowed
CHECK_FAILED the gateway answered <status> after <n> tries: <body>
  ABIDE_RUBRIC_INVALID      the rubric schema rejected the rule set
  ABIDE_DIFF_TOO_LARGE_SKIP the diff exceeded MAX_STATE_CHARS

FIREWALL (close)
  FABRICATED                a claim with ZERO bound spans (no model call)
  CLAIM_REJECTED            judged unsupported at close (THROWN)
  CLAIM_FW_NO_LEDGER        the claim ledger is absent  ⇒ FAIL_CLOSED
  CLAIM_FW_JEV_NO_KEY       no key at close             ⇒ FAIL_CLOSED
WRONG_SPAN a bound span does not contain the claimed evidence

TSG
  TSG_NO_KEY                TYPESAFE_API_KEY absent
  TSG_TIMEOUT               the evaluation deadline passed
TSG_NO_COVERAGE coverage incomplete (an explicit issue, not a miss)

GI (carried from v1.3)
GI_POPULATE_FAILED an unavailable substrate — loud, never substituted
  GRAPH_GATE_DRIFT_HIGH     T2
  GRAPH_GATE_ABORT          T3 + the rule name
  GI_V2_HOOK_ABSENT         a PROPOSED hook called as if live
```

### §8.2 The ledger schema (`.abide/events.jsonl` — one JSON object per line)

```
{ kind: "check" | "skip" | "error" | "compile-needed",
  at: ISO8601,
  phase: "edit" | "turn" | "close",
  sessionId, promptId,
  reason?: string,            // for skip/error
  code?: string,              // for error
  files: string[],
  rules?: number,             // how many checked
  latencyMs, modelLatencyMs,
  usage?: { inputTokens, outputTokens, costUsd },
  verdicts?: [{ ruleId, probability, band, answer? }],
  blocked?: boolean }
```

### §8.3 The forkable minimal shell

```
// the smallest correct Jev call — the shell a builder starts from
import { TypeSafeClient } from "@typesafe-ai/sdk";
const client = new TypeSafeClient(); // reads TYPESAFE_API_KEY

const r = await client.systemOne({
state: { diff, task, rules }, // named JSON fields
  questions: {
    rule_1: noul("<one narrow judgement>",
                 { whenTrue: "<what makes it a violation>",
                   whenFalse: "<what makes it compliant>" }),
  },
});
if (r.answers.rule_1.confidence < 0.5) return "human";   // fail to a person
return r.answers.rule_1.probability >= 0.8 ? "act" : "clear";
```

---

## §9 · BACKWARDS MAP + PROVENANCE

### §9.1 Every source component → its blueprint section

```
Abide_jev.ts:1-228            → §2.S4, §4.2, §5.2, §7.L9     Jev binding
Abide_postToolUse.ts:1-171    → §2.S1/S6/S7, §5.1, §7.L7/L10/L11
Abide_rubric.ts:1-60          → §4.2                          rubric schema
Abide_band.ts:11-49           → §2.S5                          band
Abide_verdict.ts:4-68 → §2.S7, §8.2 verdict + events
Abide_constants.ts:1-40 → §4.4, §4.1 clock + model ids
tsg/main.rs:1-40              → §3.TRACE C, §6.1               CLI
tsg/engine.rs:201-236         → §2.S3 (verbatim source)        request_for
tsg/engine.rs:174-300         → §5.3                           pipeline
tsg/routing.rs:14,22-23,66,125→ §5.3 routing + Evidence
tsg/scanner.rs:5,12-14 → §5.3 scanner bounds
tsg/ranking.rs:11,19          → §5.3                           TopMatches
tsg/cache.rs:1-53             → §5.3                           cache
typed-write.ts:60,64,74,84    → §6.3                           the store
JevClaimFirewall_Blueprint.md → §2.S2, §3.TRACE B, §5.2 the firewall spec
WarheadsAbide_Master_Blueprint→ R3/R5/R9 polarities
typesafe-ai_SKILL.md          → §4.1, §7.L13                  the priming
jev-swe-regex-pile_SKILL.md → §7.L1/L2/L3 the insertion law
```
**19 of 19 mapped. Zero orphans.**

### §9.2 The variant table

```
┌─────────────────────┬───────┬───────────────────────────┬─────────┐
│ variant             │ lines │ deltas                    │ verdict │
├─────────────────────┼───────┼───────────────────────────┼─────────┤
│ Abide jev.ts        │ 228   │ FULL — explain(), 2-route │ WINNER  │
│ typesafe-ai skill   │ 149   │ the priming doc           │ context │
│ tsg engine.rs       │ 1203  │ FULL pipeline             │ WINNER  │
│ tsg architecture.md │ 135   │ the design rationale      │ context │
└─────────────────────┴───────┴───────────────────────────┴─────────┘
```

### §9.3 The why-wired ledger

```
LAW                                  MECHANISM                       REASON
L1 code-owns-flow evaluate() + if on floats Jev cannot branch
L4 noul-per-passage QUESTION_ID one per unit Choice competes
L5 coverage first-class EvaluationCoverage + ScanIssue fail ≠ non-match
L6 evidence before judgment binder in code, then Jev cost + precision
L7 repair not block                  {kind:"block", reason: repair}   R3
L9 one call, retries 0 checkWithModel(..., retries=0) hook budget
L10 no silent pass appendEvent(skip) honesty
L12 caps disclosed boundState + MAX_STATE_CHARS no false-complete
```

### §9.4 What was LEFT OUT and why

- The **Abide compile pipeline** (how a rule is turned from prose into a rubric) lives in
  `Abide_abide-compile_SKILL.md` (13,286 B) — it is the AUTHORING layer, not the runtime.
  It belongs in the operator manual, not this blueprint.
- The **install surfaces** ([CC]/Codex/OpenCode adapters, the shim) are packaging.
- The **replay benchmark** numbers (93/1256/147/$0.22, precision 26%/73%) are calibration
  evidence, not architecture — they belong in the calibration appendix.
- **`gi_exec_graph`** — RETRACTED (rev 2.0 invention). The load unit IS TSG.

---

## §10 · WHAT THE OPERATOR ASKED, ANSWERED

```
Q  "wire TSG + Abide as a micro-computer on the gate"
A Load unit = TSG · ALU = Abide · branch = Claim Firewall · co-processor =
    Jev.
   Code owns the instruction stream; Jev is one op. (§1, §5)

Q  "function as the intelligent enforcement layer for all of the graph data"
A  The 6D store is the operand memory: evidence_quote supplies the spans the
   binder attaches claims to (§2.S2, §6.3). Typed edges supply contracts and
   blast radius for the destructive detector. (§1)

Q  "jev enables this and is already embedded in both"
A  Verified in source: Abide_jev.ts (228L) is the binding; TSG's engine.rs
   request_for uses the same Noul-with-criteria shape. Same model, same
   primitives, two polarities. (§4.1, §7.L9)

Q  "deep research on jev — explain everything"
A  §11 below.
```

---

## §11 · JEV — THE COMPLETE PICTURE (deep research result)

### §11.1 What Jev IS

```
     JEV IS NOT A MODEL THAT TALKS. IT IS A MODEL THAT ANSWERS.

     input   : STATE (named JSON) + QUESTIONS (typed, with criteria)
     output  : TYPED ANSWERS + PROBABILITIES
     never   : prose, reasoning, chains, generation

     "It understands natural language and returns typed answers and
      probabilities rather than generating text or reasoning explanations."
                                          (typesafe-ai skill, verbatim)
```

It is TypeSafe's flagship **System One** model. Model ids: `jev-latest` (direct) and
`typesafe-ai/jev` (via the Vercel AI Gateway). Price observed 2026-09-17: **$0.042 per million
input tokens, output free** (`Abide_constants.ts`, verbatim comment).

### §11.2 The three primitives — and the ONE rule that governs each

```
┌───────────┬───────────────┬────────────────────────────────┐
│ PRIMITIVE │ SHAPE         │ THE ONE RULE THAT GOVERNS IT   │
├───────────┼───────────────┼────────────────────────────────┤
│ CHOICE    │ a defined set │ options COMPETE for mass       │
│ NOUL      │ a condition   │ P(yes); NO separate confidence │
│ SCORE     │ a degree      │ ordered levels; comparable     │
└───────────┴───────────────┴────────────────────────────────┘
```

**How the two engines use them — measured, not guessed:**

```
TSG → NOUL, one per passage. "target_matches" with when_true/when_false
    criteria.
         Explicitly NOT a Choice — the design doc says why. (§7.L4)
ABIDE → whichever the rule declares (boolean | choice | score), but ALL
rules ride
ONE call: questions[rule.id] = toSdkQuestion(rule.check.question). (§2.S4)
A choice rule declares its own `violating: string[]` — the model never
         decides what "bad" means. (§4.2)
FIREWALL → ONE CHOICE: supports | contradicts | says_nothing. Here the
    options
         genuinely compete. (§3 TRACE B)
```

### §11.3 How you PROGRAM with Jev — the insertion law

```
        ┌──────────────────────────────────────────────────────────┐
┌─────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
        └──────────────────────────────────────────────────────────┘

  the regex-pile test, applied:
┌─────────────────────────────┬───────────────────────────────┐
│ predicate is SHAPE          │ predicate is MEANING          │
├─────────────────────────────┼───────────────────────────────┤
│ parse · SQL · count · date  │ intent · synonyms · relevance │
│ → YOUR language. Never Jev. │ 1. list the answers FIRST     │
│                             │ 2. client.systemOne(...)      │
│                             │ 3. if on floats / labels      │
│                             │ cannot list answers? retrieve │
│                             │ THEN Jev picks. NEVER invent  │
└─────────────────────────────┴───────────────────────────────┘
```

### §11.4 The accuracy laws — what Jev's numbers actually mean

```
CALIBRATION is GROUP FREQUENCY. p=0.8 happens ~80% of the time ACROSS MANY
    CALLS.
             It is NOT a per-call guarantee.
CONFIDENCE   is PEAKEDNESS of the distribution — NOT P(correct).
NOUL 0.5     means yes ≈ no — NOT "medium intensity".
DO NOT ASK   Jev to count, do math, compare dates, or generate text.
             (documented as "jev-1.13 jaggedness")
VALIDATE in the target domain. Typed output guarantees the INTERFACE, not
    truth.
THRESHOLDS are evaluated on YOUR data and YOUR consequences. Cookbook
numbers are
             examples, not universal rules.
```

### §11.5 The two routes into Jev (verbatim from Abide_jev.ts:150-165)

```ts
case "typesafe": {
  const { createTypeSafeAi } = await import("@ai-sdk/typesafe-ai");
return { model: createTypeSafeAi({ apiKey: creds.key
}).evaluationModel(TYPESAFE_MODEL_ID) };
}
case "gateway":
  process.env[GATEWAY_KEY_ENV] = creds.key;
  return { model: GATEWAY_MODEL_ID,
           providerOptions: { gateway: { zeroDataRetention: true } } };
```

And the comment that explains the asymmetry — verbatim:
> *"Zero data retention is a gateway routing option. TypeSafe's API takes no such flag, so
> sending it there would only look like a request that was made."*

### §11.6 Why Jev is the right co-processor for this gate

```
1. IT FAILS AS A VALUE, NOT AS PROSE. A gate needs a number to threshold.
A generator would need parsing back — and the parse is where the theatre
    hides.

2. THE ANSWERS ARE LISTED BEFORE THE CALL. `violating: string[]` in the
    rubric
   means the option set is DECLARED, not discovered. A gate cannot accept an
   option it did not enumerate.

3. IT IS CHEAP AND FAST ENOUGH TO SIT ON A HOOK BUDGET. 13 rules ≈ 300ms,
   $0.00004–$0.00007 (README:127). 8s timeout, 24KB state.

4. IT IS BATCHABLE ON ONE STATE. Every rule rides one call — the hook pays
    one
   round trip, not thirteen. (§2.S4)

5. IT CANNOT BRANCH. Which is a FEATURE: all control flow, all thresholds,
    all
   consequences stay in code where they are testable.
```

---

## §12 · SELF-CHECK + THE NAMED RESIDUAL

```
EXTRACTION DEFERRED = THEATRICAL → not deferred: both engines read
    first-hand.
19/19 source components mapped      → zero orphans (§9.1)
Pseudocode per nontrivial mechanism → §5.1, §5.2, §5.3
Laws carry anchors                  → §7 (15 laws)
Constants verified in-source        → §4.4 (all from Abide_constants.ts)
Doctrine VERBATIM                   → §11.1, §11.5, §7.L4, §7.L1
```

### THE RESIDUAL (named, not papered)

```
UNEXERCISED — NOTHING in this engine has been RUN on this host.
  · No TYPESAFE_API_KEY verified present (open item P0 in the Abide brief).
  · No fixture run of tsg against a live repo, and no key to run it with.
  · Abide's 8s hook has never fired against a real omp session here.

SPECIFIED BUT NOT BUILT:
· e2-close (the Claim Firewall) is DESIGN ONLY — 801 lines of spec, no
    code.
  · The binder is specified; the span-capping ring is PROPOSED.
· The reflex/RSI writer is designed (§10 of the v2.1 kernel blueprint),
    unbuilt.

MEASURED DEFECTS THIS BLUEPRINT MUST CARRY FORWARD:
  · The live store's `confidence` is a constant 1.0 (finding B1) — the ALU's
    dial has no signal until the mapper is fixed.
  · Only 1 of 6 namespaces is populated (finding B2).
  · The store has no staleness marker (finding B3, CRITICAL).

NEVER ENUMERATED:
  · The `compile` path (prose AGENTS.md → rubric) is unread at this depth.
· Abide's replay precision (turn 73% / edit 26%) is uncalibrated for this
    host.
  · The interaction of the firewall's FAIL_CLOSED with the operator's OR-1
    no-fallback law is still a RULING-CONFLICT, unresolved.

Files touched:
packages/gi-kernel-v2/ENFORCEMENT_ENGINE_MASTER_BLUEPRINT_v1.md (this).
```

---

## §13 · OPEN DECISIONS
┌────┬──────────────────────────┬──────────────────┬────────────────────┐
│ #  │ FORK                     │ OPTIONS          │ DEFAULT            │
├────┼──────────────────────────┼──────────────────┼────────────────────┤
│ D1 │ TSG: process or library? │ subprocess / FFI │ SUBPROCESS first   │
│ D2 │ Abide silent paths       │ keep / close     │ KEEP (R5) — see F1 │
│ D3 │ claim ledger location    │ .abide / store   │ .abide/ (Abide)    │
│ D4 │ Firewall spans           │ raw / hashed     │ HASHED ring 32x2KB │
│ D5 │ Who compiles the rubric  │ human / Jev      │ HUMAN + agent desk │
└────┴──────────────────────────┴──────────────────┴────────────────────┘

NEEDS THE OPERATOR (the decision surface — 2 forks):
  F1  D2 + OR-1: does a Jev outage STOP the agent everywhere (fail-closed
      everywhere), or only at close (R5's surface split)? This changes
      whether the machine is always-on or best-effort.
  F2  The reflex/RSI tier thresholds (precision >= 0.90 and >= 10 fires →
      Guard). These are MY numbers, uncalibrated.
```
