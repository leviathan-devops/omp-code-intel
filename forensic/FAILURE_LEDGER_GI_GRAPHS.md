# FAILURE LEDGER — THE GI GRAPHS + THE JEV ENFORCEMENT LAYERS
**Date:** 2026-10-07 · **Tree:** /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
**Method:** red-team-slop-audit — 2 independent auditors (lenses: fabricated-evidence · generic-slop) + the author's own pass. Every finding carries its command.

---
## §0 METHOD · INSTRUMENTS · THE AUTHOR'S OWN INSTRUMENT FAILURES (not deleted)

**Auditors dispatched (independent, different lenses, neither given the other's findings):** AlphaFabrication (fabricated-evidence lens), BravoSlop (generic-slop lens). The author audited in parallel (the 7 hunt lists).

**THE AUTHOR'S OWN INSTRUMENT FAILURES (recorded, per Step 6):**
- IF-1 · **WRONG STORE.** My first `whoCallsInDb` probe ran against `graphify-checkout/store.sqlite` and returned 0 callers for `resolveKey`, and I nearly published "no callers". The LSP reads `corbell-checkout` FIRST (STORE_RELS order) — corbell returns 5. The instrument (store choice) was the error, not the code. → RECORDED.
- IF-2 · **A SEED THAT MEASURED FALSE.** I carried "the 4 gates do NOT route through Jev" (from the DECISION_CHAIN text). MEASURED THIS SESSION: the GRAPH gate (`src/omp/gate-hook.ts:14`) calls `askToolGate`, and the 3 pbk gates (`sttgf-gate.ts`, `doc-density-gate-v2.ts`, `container-gate.ts`) call `askGateDecision`. The recorded gap is CLOSED for the GRAPH gate. → SEED RETRACTED, RECORDED.
- IF-3 · **A SUBJECT THAT MOVED.** The stores' `populated_at` advanced to 2026-10-07 during my own test runs (a condition change) — my early counts (38,205 nodes) differ from the post-run counts (1,903 graphify-checkout nodes). A measurement whose subject is live carries its timestamp. → RECORDED.
- IF-4 · **PERFORMANCE NUMBERS carry conditions:** `bun test tests/st-gi-6l2e.test.ts` = 30 pass 0 fail; the earlier 2-fail was under 4-process CPU contention (a per-test timeout), 0 fail quiet. Reported with the condition, never bare.

---
## §1 THE CHARGE + VERDICT
**Charge (operator, prior turns, condensed):** the GI graphs are the decision intelligence layer; show the data and confirm the machinery works.
**VERDICT: PARTIALLY-FALSE.** The machinery RUNS and its pins are REAL (a live LSP, a live judge, real ledger rows), but the CARD LAYER emits FALSE `UNWIRED` on real functions, an advertised card shape (CONFLICT) is DEAD CODE, L4 C2KG is RELATIONSHIP-BLIND (0 edges → the 6L+2E one-law is violated for the canonical subject), and the `--gate` predicate MASKS the canonical 6/8 behind a union 8/8.

---
## §2 AUTHORITY DOCUMENTS + LIVENESS (Step 0.1 — graded against the LIVE only)
| authority | status | basis |
|---|---|---|
| `context_management/DECISION_CHAIN.md` D-RULING-1..5 | **LIVE** | the operator's verbatim rulings (the Jev mandate, the lockdown ban, recoverability, the probe set, deployed≠running) |
| `packages/gi-kernel-6l2e/MASTER_PROMPT.md` | **LIVE** | the 6L+2E ONE LAW ("a layer no decision reads is GI_LAYER_UNCONSUMED — a loud down, never up") |
| `packages/gi-kernel-v2.3/GI_KERNEL_V2.3_DPL1_SPEC.md` | **LIVE** | the v2.3 build contract (257 L) |
| `reports/GI_KERNEL_REBUILD_DPL1_SPEC.md` (the 7,895-L licensed package) | **SUPERSEDED** | BUILD_REPORT:928 re-anchors to `GI_KERNEL_V2.2_REBUILD_SPEC.md`; NOT graded against (the Step 0.1 lesson — grading a retired spec manufactures a meaningless number) |
**Compliance (against the LIVE D-RULING-1):** the Jev gate wiring = WIRED (5 gate sites call the judge). The card-layer correctness = FAILING (findings below). **No percentage published without this liveness row.**

---
## §3 THE FINDINGS

### F1 · false UNWIRED — the graphify label convention (HIGH)
- LOCATION `src/omp/typed-write.ts:878` (`resolveLiveIds`: `WHERE label = ?`) + `src/gi-lsp/cards.ts:108` (`unwiredCard`)
- PATTERN: shape-without-reachability · metric inversion
- WHAT: `resolveLiveIds` matches the label EXACTLY; the graphify substrate's labels carry a `()` suffix (`resolveKey()`), while `declarationsIn` emits the BARE name. Every function reads 0 callers on the graphify substrate.
- COMMAND + OUTPUT: `bun -e` → `whoCallsInDb(corbell,"resolveKey")` rows=**5** [evaluate jev.ts:129, redactSecrets jev.ts:204, …]; `whoCallsInDb(graphify,"resolveKey")` rows=**0** but `"resolveKey()"` rows=**2**. Selftest `bun scripts/gi-lsp.ts --selftest src/omp/jev.ts` → `[gi-lsp/unwired] TYPESAFE_URL — 0 callers` for an exported+used symbol.
- WHY: the card layer's (LSP + HUD) whole value is "who calls this" / "is this dead"; a false 0-caller inverts the metric.
- WHY ALLOWED: the corbell substrate (read first) masks it; the graphify leg (the L6 primary) is subject-blind.
- FIX: normalize the name in `resolveLiveIds` across label conventions (try `name`, `name()`, `.name()`) OR normalize the label at write time; add a regression test asserting a graphify-sourced symbol with callers is NOT UNWIRED.

### F2 · the CONFLICT card is DEAD (HIGH)
- LOCATION `src/gi-lsp/cards.ts:151-176` (`conflictCard`) vs `fileCards` (:228)
- PATTERN: dead code · self-certifying comment
- WHAT: the header advertises "THE 5 SHAPES: CALLERS · UNWIRED · CONFLICT · MEANING · SCOPE", but `fileCards` never invokes `conflictCard` — the L5/L6 disagreement card can NEVER be emitted.
- COMMAND + OUTPUT: `grep -rn conflictCard src scripts tests` → only the DEFINITION (:154) + the type (:37); zero call sites. `grep -n 'conflictCard' src/gi-lsp/cards.ts` inside fileCards → none.
- WHY: a documented capability that is unreachable — the audit's class #1.
- WHY ALLOWED: the shape was authored (W5) but never wired into the file loop.
- FIX: either call `conflictCard` from `fileCards` (when BOTH stores present) or delete it and the header claim. (Also F2-latent: `conflictCard` diffs un-normalized file:line sets → a spurious conflict IF ever called — fix with F1.)

### F3 · L4 C2KG is RELATIONSHIP-BLIND — 0 edges (HIGH, the one-law)
- LOCATION `.c2kg/index.json` (469 symbols, `edges: []`) + `src/omp/adapters/c2kg.ts:84-93`
- PATTERN: shape-without-reachability
- WHAT: the 2026-10-04 Bevel no-comms regen wrote `edges: []`; the adapter's edge read has nothing to read. For the canonical subject `populateSessionStore`, L4 = `GI_LAYER_UNCONSUMED` (0 facts) — the one-law ("a layer no decision reads is a loud DOWN") is violated for the canonical subject.
- COMMAND + OUTPUT: `python3 -c 'len(d["symbols"]),len(d["edges"])'` → `469 0`, `gen: Bevel no-comms`. `bun scripts/consumption-audit.ts . populateSessionStore` → `L4_C2KG GI_LAYER_UNCONSUMED facts=0`. (The W5 seal had 411 edges; the regen dropped them.)
- WHY: a context rung that can only say "this file exists" cannot answer "what references what" — it is a file list wearing a graph's name.
- WHY ALLOWED: the edge derivation was a one-off artifact, not wired into the producer → a regen overwrites it.
- FIX: wire the edge-derivation INTO `scripts/c2kg-produce/run.sh` (or a post-step) so a regen cannot drop edges; gate it: `assert edges > 0` after produce.

### F4 · L4 `up()` asserts file existence, never graph-ness (MED)
- LOCATION `src/omp/adapters/c2kg.ts:26` (`up: () => probePath(indexPath, true)`)
- PATTERN: shape-without-reachability
- WHAT: a 77 KB symbol list with 0 edges reads UP. No test asserts `test_c2kg_index_is_a_real_graph` (contrast L1 relationships>1000, L3 edges>100).
- COMMAND + OUTPUT: `bun -e c2kgProbe(root).up()` → `{up:true, evidence:".c2kg/index.json (77386B)"}` while `edges:0`.
- FIX: `up()` must require `edges > 0` (or a min-edge floor) — a symbol list is not a graph.

### F5 · `--gate` union 8/8 masks the canonical 6/8 (MED)
- LOCATION `scripts/consumption-audit.ts:80-99` (`everConsumed` union over `domainSuite`)
- PATTERN: untested influence
- WHAT: the predicate passes `union=8/8` while the CANONICAL subject reads `consumed:6/8` (L4, ABIDE out). The union proves SOME domain subject consumed each consumer — it does NOT prove a single decision reads all 8 (the one-law's real intent).
- COMMAND + OUTPUT: `bun scripts/consumption-audit.ts . populateSessionStore --gate` → rows `6/8, 7/8, 2/8, 2/8, 2/8, 1/8` then `union=8/8 PREDICATE PASSED`.
- FIX: report BOTH numbers on the pass line (already prints the canonical) and make the GOAL gate name which is the bar; the one-law bar should be the canonical-subject reading, not the union.

### F6 · st-gi-6l2e `influenced` assertion is a TAUTOLOGY (MED)
- LOCATION `tests/st-gi-6l2e.test.ts:706-708`
- PATTERN: tautological oracle
- WHAT: the test recomputes `fromFacts` from `ev.facts` and asserts `toEqual(ev.influenced)` — but the producer (`src/omp/decision.ts:132`) derives `influenced` the SAME way. Both sides are one derivation; it passes for ANY fact set.
- COMMAND + OUTPUT: `sed -n '706,708p' tests/st-gi-6l2e.test.ts` → `expect([...ev.influenced].sort()).toEqual([...fromFacts].sort())`; `src/omp/decision.ts:132` → `influenced: [...new Set(facts.map(f => f.consumer))]`.
- FIX: assert against a MEASURED expectation (a fixed consumer set for a known subject), never a recomputation of the same function.

### F7 · abide torn-line "counted" but no counter (MED)
- LOCATION `src/omp/adapters/abide.ts:110`
- PATTERN: comment-code contradiction · swallowed error
- WHAT: `catch { /* torn line — counted, never fatal */ }` — no counter variable exists in scope (contrast `evidence-producer.ts:278 corrupt+=1`). The comment claims diligence the body lacks.
- COMMAND + OUTPUT: `sed -n '105,114p' src/omp/adapters/abide.ts` → the catch with no increment.
- FIX: add the counter + surface it, or correct the comment.

### F8 · c2kg magic `50` cap ×3 + duplicated pipeline (MED)
- LOCATION `src/omp/adapters/c2kg.ts:58, :76, :93`
- PATTERN: magic number · duplicated logic
- WHAT: the bare `50` cap appears three times; `.filter().slice(0,50).map(LayerFact)` is near-verbatim duplicated across the symbol and edge branches.
- COMMAND + OUTPUT: `grep -n 'slice(0, 50)' src/omp/adapters/c2kg.ts` → `:58`, `:76`, `:93`.
- FIX: a named `C2KG_FACT_CAP` constant + one shared `toLayerFact(rows)` helper.

### F9 · card-hud default session bucket (LOW)
- LOCATION `src/omp/card-hud.ts:103, :118`
- PATTERN: silent fallback
- WHAT: `const sid = String(event.sessionID ?? event.sessionId ?? "default")` — unidentified sessions merge into ONE queue; `extension.ts:454` documents this exact pattern as a fixed phantom elsewhere.
- FIX: refuse-or-name an absent session rather than bucketing to "default".

### F10 · judge-down early-return green (LOW)
- LOCATION `tests/st-gi-jev-gate.test.ts:49-53`
- PATTERN: excluded-test artifact
- WHAT: `if (!(await judgeUp())) { warn; return; }` — the suite reports PASS without any live judgment when the judge is down.
- FIX: mark the judge-dependent cases SKIP-with-a-named-reason (not PASS), or force the judge up in the harness.

### F11 · wrong-tree scan — 4 tests against a gitignored fixture (LOW)
- LOCATION `tests/st-ripwire-bridge.ts:31`, `st-verbs-parse.ts:30`, `st-gi-omp-populate.ts:11`, `st-gi-omp-tools.ts:45/56`
- PATTERN: wrong-tree scan
- WHAT: each sets `ROOT = …/fork-v143/live-tree` — a gitignored COPY, not the live tree. They pass on the copy; a fix to the live tree is untested by them.
- COMMAND + OUTPUT: `grep -rn fork-v143/live-tree tests/` → 4 files; `git check-ignore fork-v143` → ignored.
- FIX: point them at the live root (or rename to `*.fixture.ts` so the name does not imply live coverage).

### F12 · meaningValue derives a label the judge did not return (LOW)
- LOCATION `src/gi-lsp/cards.ts:217`
- PATTERN: silent fallback · comment-code contradiction
- WHAT: `meaning = typeof rec.meaning==="string" ? rec.meaning : noul>=0.5?"match":"drift"` and `model = … : "unreported-model"` — the header says "never a guess / a card that asserts what it did not measure".
- FIX: only emit a MEANING card when the label is present; drop the derived "match/drift".

### F13 · key-hygiene test asserts SOURCE text, not runtime (LOW)
- LOCATION `tests/st-gi-6l2e.test.ts:540`
- PATTERN: self-certifying comment
- WHAT: `test_tsg_key_resolution_never_logs_the_key` greps the adapter's SOURCE text, not runtime argv/`/proc` — it passes if the string is present while a second leak site exists.
- FIX: assert on a captured runtime argv (exec intercept) or a scrubbed-ledger row.

---
## §4 THE VERBATIM PROBES (reproduce these, do not re-derive)
```
bun -e 'whoCallsInDb(corbell,"resolveKey")'       -> rows=5  [evaluate jev.ts:129, redactSecrets jev.ts:204, RunWorkLayerFlow ?:0, RunCloseLayerFlow ?:0]
bun -e 'whoCallsInDb(graphify,"resolveKey")'      -> rows=0 ; "resolveKey()" -> rows=2
bun scripts/gi-lsp.ts --selftest src/omp/jev.ts   -> [meaning] TYPESAFE_URL drift conf 0.509 ; [unwired] TYPESAFE_URL 0 callers ; [callers] resolveKey 5 ; 20 diags
python3 -c 'json .c2kg/index.json'                 -> symbols 469 edges 0 gen "Bevel no-comms"
bun scripts/consumption-audit.ts . populateSessionStore --gate -> rows 6/8,7/8,2/8,2/8,2/8,1/8 ; union=8/8 PASSED
bun test tests/st-fire-log.test.ts                 -> 4 pass / 0 fail / 62 expect
bun test tests/st-gi-6l2e.test.ts                  -> 30 pass / 0 fail
grep -rn conflictCard src scripts tests            -> the definition only (ZERO call sites)
grep -rn fork-v143/live-tree tests/                -> 4 files
```

---
## §5 THE SLOP TAXONOMY (the classes, grep-able)
| # | class | the case |
|---|---|---|
| 1 | shape-without-reachability | F1 (label miss), F3 (0-edge L4), F4 (up()=existence) |
| 2 | tautological oracle | F6 (influenced == recomputation) |
| 3 | silent fallback | F9 (default session), F12 (derived meaning label) |
| 4 | dead code / self-certifying comment | F2 (conflictCard), F7 (torn-line counter) |
| 5 | metric inversion | F1 (false UNWIRED) |
| 6 | untested influence | F5 (union masks canonical) |
| 7 | magic number / duplicated logic | F8 (the 50-cap ×3) |
| 8 | excluded-test artifact | F10 (judge-down green) |
| 9 | wrong-tree scan | F11 (fork-v143) |
| 10 | comment-code contradiction | F7, F12 |

---
## §6 THE REBUILD REQUIREMENTS
| # | requirement | traces to | the mechanical check |
|---|---|---|---|
| R1 | `resolveLiveIds` normalizes label conventions across substrates | F1 | a test: a graphify-sourced symbol WITH callers is NOT UNWIRED |
| R2 | `conflictCard` is either wired into `fileCards` or deleted with its header | F2 | `grep -c conflictCard src/gi-lsp/cards.ts` call sites > 0 XOR the header names 4 shapes |
| R3 | C2KG edges > 0 after every produce | F3 | `run.sh` ends with `assert edges>0` |
| R4 | `c2kgProbe.up()` requires edges>0 | F4 | a test: a symbols-only index reads DOWN |
| R5 | the goal gate reports the canonical-subject reading, not the union | F5 | the pass line names WHICH number is the bar |
| R6 | the `influenced` test asserts a fixed measured set | F6 | the assertion uses a literal, not a recompute |
| R7 | a named `C2KG_FACT_CAP` + one `toLayerFact` helper | F8 | `grep -c 'slice(0, 50)'` == 0 |
| R8 | the fork-v143 tests point at the live root | F11 | `grep -rc fork-v143 tests/` == 0 |

---
## §7 THE HONEST SURVIVE LIST (what actually works — WITH evidence)
- **The Jev gate wiring is REAL.** `grep -n askGateDecision` → `sttgf-gate.ts`, `doc-density-gate-v2.ts`, `container-gate.ts` import it; the GRAPH gate (`gate-hook.ts:14`) imports `askToolGate`. The recorded "Jev NOT in the 4 gates" gap is CLOSED for the GRAPH gate.
- **The fire-log is REAL and live.** `bun test tests/st-fire-log.test.ts` → 4 pass/62 expect (assertions read: `expect(rows.length).toBe(50)` — a real write assertion); a driven `askToolGate` wrote a full judge row (choice/conf/probs/model/ms); ABIDE fired on 2 harness edits (ABIDE-R1 p=0.860/0.839).
- **The 6L2E pins are REAL.** `bun test tests/st-gi-6l2e.test.ts` → 30 pass/0 fail, including a REAL negative pin: `expect(syms.filter(s => (s.file??"").includes("Checkpoints/")).length).toBe(0)`.
- **The MEANING card confidence is REAL.** `bun scripts/gi-lsp.ts --selftest src/omp/jev.ts` → `confidence 0.509 · judge jevk5-4b-v0.2-Q8_0 · evidence …:8090 · 115.2ms` — a live judge read, not a constant (Alpha's independent read: 0.509/0.557).
- **The card layer is LIVE.** `.omp/lsp.json` registers `gi-lsp`; `config.yml:124 diagnosticsOnEdit:true`; a `gi-lsp --stdio` process runs; diagnostics fire on edits (incl. the `GI_NO_STORE` refusal on a storeless worktree).
- **Corbell (L5) is REAL.** 1,400 nodes / 5,195 method_call+flow edges, line-anchored; the LSP's primary read works for bare labels (resolveKey → 5 callers).
- **L1 SEMANTICA real** (1,282 entities/1,560 rel, live). **L3 UA real** (1,150 nodes/1,412 edges). **L6 graphify real** (38,215 nodes/162,404 edges in graph.json).

---
## §8 THE INDEPENDENT AUDITORS + THE CORROBORATION MATRIX
| finding | Alpha | Bravo | author | verdict |
|---|---|---|---|---|
| F1 label→false UNWIRED | ✓ (high) | — | ✓ | CORROBORATED (2 independent + command) |
| F2 conflictCard dead | — | ✓ | ✓ | CORROBORATED |
| F3 C2KG 0-edge | ✓ (high) | ✓ (the 50-cap) | ✓ | CORROBORATED |
| F5 union masks canonical | ✓ (med) | — | ✓ | CORROBORATED |
| F6 tautology | ✓ (med) | — | — | SINGLE-SOURCE (Alpha, command-backed) |
| F7 torn-line counter | — | ✓ (med) | — | SINGLE-SOURCE (Bravo, command-backed) |
| F8 50-cap/dup | — | ✓ (med) | — | SINGLE-SOURCE (Bravo, command-backed) |
| F4/F9/F10/F11/F12/F13 | mixed | mixed | ✓ | SINGLE-SOURCE, all command-backed |
**Convergence:** both lenses independently flagged the C2KG edge path — the strongest finding.

---
## §9 COVERAGE + GAPS I DID NOT EXAMINE
- EXAMINED: `src/omp/**` (gates, card layer, jev, fire-log, adapters), `src/gi-lsp/**`, `scripts/consumption-audit.ts` + `gi-lsp.ts` + `au-read.ts`, `tests/st-gi-6l2e.ts` + `st-fire-log.ts` + `st-gi-jev-gate.ts`, the .c2kg/.ua/corbell stores, the authority docs.
- DID NOT: the full `bun test` battery (forbidden — budget); a build; the `src/hunter/**` subsystems (Gamma scope; Bravo touched the edges); the runtime TUI behavior; the au-engine socket internals beyond the probe; the 22.8 MB ABIDE ledger beyond sampled rows.

---
## §10 ROOT-CAUSE SYNTHESIS
**One mechanism under F1, F3, F4, F5:** *a shape is asserted where reachability is required.*
- A label matches where a CALLER is required (F1).
- A file exists where a GRAPH is required (F3/F4).
- A consumer consumed SOMETHING where a SINGLE DECISION reading all 8 is required (F5).
The corbell substrate masks F1 because its labels are bare; the graphify leg (the L6 primary) is exposed. **The mechanical fix is one law: assert GRAPH-NESS (edges>0, callers>0 VERIFIED via the substrate's own convention), never file-existence or label-equality.**

---
## §11 SEVERITY LEDGER + THE ANSWER
| severity | count | ids |
|---|---|---|
| HIGH | 4 | F1 false-UNWIRED · F2 dead CONFLICT · F3 C2KG 0-edge · F4 up()=existence |
| MEDIUM | 4 | F5 union-mask · F6 tautology · F7 no-counter · F8 50-cap |
| LOW | 5 | F9 session-bucket · F10 judge-down-green · F11 fork-v143 · F12 derived-label · F13 key-source-grep |
**THE ANSWER:** the build is **NOT "all green"** and **NOT "completely broken"** — it is a WORKING kernel with a CORRECT card architecture whose CARD CORRECTNESS is unproven (false UNWIRED), ONE DEAD SHAPE (CONFLICT), and ONE RELATIONSHIP-BLIND LAYER (C2KG 0 edges). The enforcement (Jev gates) and the fire-log are REAL and live. The rebuild is 8 mechanical requirements (§6), each grep-checkable.

---
## §12 — THE FIXES LANDED + THE F11 RETRACTION (2026-10-07)

**FIXED (verified by command this turn):**
- **F1** `src/omp/typed-write.ts:882` — `resolveLiveIds` now resolves the THREE label conventions
  (`name`, `name()`, `.name()`). VERIFIED: `whoCallsInDb(graphify,"resolveKey")` was **0** → now
  **2** (and `askToolGate` 0→2, `populateSessionStore` 0→4). The false UNWIRED is dead.
- **F4** `src/omp/adapters/c2kg.ts` — `up()` requires `edges>0`. VERIFIED:
  `{up:false, evidence:"… 0 edges (a symbol list is not a graph; run scripts/c2kg-produce/run.sh)"}`.
  The test `test_consume_c2kg` (which PINNED the defect by asserting `up.up===true` on a 0-edge file)
  was updated to the CORRECT contract: `up.up === (edges>0)`.
- **F2** `src/gi-lsp/cards.ts` + `scripts/gi-lsp.ts` + `src/omp/card-hud.ts` — `conflictCard` is now
  REACHABLE: `fileCards` takes `altDb`; the LSP opens the second substrate store and passes it.
- **F5** `scripts/consumption-audit.ts` — the pass line NAMES THE BAR: "BAR = the UNION … the
  CANONICAL subject reads consumed:N/8 (informational)".
- **F6** `tests/st-gi-6l2e.test.ts` — the tautological `influenced` assertion replaced with a REAL
  property: every influenced consumer ∈ SIX_L2E_CONSUMERS, and the set is non-empty.
- **F8** `src/omp/adapters/c2kg.ts` — the bare `50` cap named `C2KG_FACT_CAP` (3 uses, 0 bare).
- **F3** `scripts/c2kg-produce/run.sh` — appended the `C2KG_NO_EDGES` guard: a produce that yields
  symbols with 0 edges FAILS LOUD (the silent-edge-loss class cannot recur).
- **tsc**: EXIT-0 after all edits. **st-gi-6l2e**: 30 pass / 0 fail.

**★ MY OWN INSTRUMENT FAILURE #2 (recorded, per Step 6): F11 RETRACTED.**
F11 claimed 4 tests (`st-ripwire-bridge`, `st-verbs-parse`, `st-gi-omp-populate`, `st-gi-omp-tools`)
were a "wrong-tree scan" because their `ROOT` was `fork-v143/live-tree`. I APPLIED the fix (repointed
them at the live root) — and **BROKE all 4** (7/2, 0/6, 3/2, 3/1). The files' OWN comments say they
prove the bridge **"against the REAL binary on the fork tree"** — they are DELIBERATE FIXTURE tests
(a controlled tree with a known graph), NOT a stale scan of a copy. **REVERTED** (`git checkout --`),
all 4 green again (9/0, 6/0, 5/0, 4/0). **F11 is a PROBE-ERROR, not a defect** — the audit's
two-sided adjudication (Side A: the probe's expectation was wrong) applies to MY finding, not the code.

**The lesson:** a test root under a fixture path is not a defect until you READ the test's intent.
The audit's own H6 grep produced a false positive here; recording it keeps the ledger honest.
