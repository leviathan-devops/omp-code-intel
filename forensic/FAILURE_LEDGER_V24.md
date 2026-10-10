# FAILURE LEDGER — GI KERNEL V2.4 (the build that BROKE live)
**Date:** 2026-10-10 · **Method:** black-hat-audit-wave (2 independent attackers, disjoint vectors) + the author's own pass (executed probes)
**The incident:** the v2.4 gates were deployed to the LIVE host. A live session's legitimate **`Read`** was BLOCKED: `GI_DONE_UNPROVEN: DONE_ROUTE_ACT: judge refuse p=0.643`. **Reverted** (live = v2.3, `2e2a39031c6059ca`).

---
## §0 METHOD + MY OWN INSTRUMENT FAILURES
**Attackers:** BH-FalsePositive (the incident lens) + BH-FalseNegative-Arch (the miss/architecture lens) — disjoint, independent.
**MY FAILURES (recorded):**
- IF-1 · I "proved" v2.4 with **DIRECT FUNCTION CALLS** (`bun run` on the source). A direct call proves the function works when *I* call it — it does NOT prove the gate on the **real `tool_call` path**. That is exactly why a 5/5-blocking gate shipped as "proven".
- IF-2 · My v2.4 audit (V24Alpha/V24Bravo) found bypasses but I **graded them DOCUMENTED instead of FIXED** — and never ran the NEGATIVE half (does a normal action pass?). The one thing that mattered.
- IF-3 · I shipped to live **without the container round** — the explicit law: "NEVER SHIP UNTESTED GARBAGE TO LIVE."
- IF-4 · My W1 "proof" (the ledger row jev:0.8455) proved the judge READS; it never proved the judge's verdicts are CALIBRATED (they are not — §3 F2).

---
## §1 THE CHARGE + VERDICT
**Charge (verbatim):** *"It has no fucking contextual awareness. Everything is being rejected for no fucking reason."*
**VERDICT: THE BUILD IS BROKEN AS SPECIFIED.** Measured: **5/5 ordinary turn closings BLOCKED** (author's probe) and **6/6 incl. a strong positive control** (attacker) — the DONE gate fail-closes on ~100% of normal turns. The build does not discrimate; it rejects.

---
## §2 AUTHORITY + LIVENESS
| authority | status |
|---|---|
| `reports/GI_KERNEL_V2.4_DPL1_SPEC.md` (320 L) | the build's own DPL1 — **Status: PLANNING** (never approved) |
| `context_management/DECISION_CHAIN.md` | LIVE (the operator rulings) |
| `reports/GI_KERNEL_REBUILD_DPL1_SPEC.md` (611 L) | LIVE (`Status: AUTHORITATIVE for the rebuild`) |
**Compliance:** the build is compliant with its own DPL1 (the gates exist) and **0% compliant with the operator's REAL bar** — "do not block legitimate work." No compliance % published without this row.

---
## §3 THE FINDINGS
### F1 · THE DONE GATE FAIL-CLOSES ON EVERY TURN (CRITICAL — THE INCIDENT)
- LOCATION `src/omp/claim-firewall.ts:382-414` (`onTurnEnd`) + `src/omp/jev.ts:387-394` (`doneRouteActCandidate`)
- WHAT: `onTurnEnd` runs the `route=act` judge **UNCONDITIONALLY on every turn-end surface** (`["stop","turn_end","turn-end","session_stop","session_end"]`). A non-completion turn's closing text is judged "is this DONE?" — and the judge answers NO (correctly), so the gate **throws `GI_DONE_UNPROVEN`** on ordinary work.
- COMMAND + OUTPUT: `bun run /tmp/fprate.ts` → **5/5 NORMAL turn closings BLOCKED**:
  ```
  1. BLOCKED — "Reading the Aether Agent Backend now — full "  →  GI_DONE_UNPROVEN p=0.91
  2. BLOCKED — "Let me look at the file structure first."       →  GI_DONE_UNPROVEN p=0.91
  3. BLOCKED — "I'll explore the directory to understand the"  →  GI_DONE_UNPROVEN p=0.90
  4. BLOCKED — "The spec says X; I need to verify against the"  →  GI_DONE_UNPROVEN p=0.90
  5. BLOCKED — "Here's what I found in the config."             →  GI_DONE_UNPROVEN p=0.85
  ```
- WHY: a done-gate must fire ONLY on a COMPLETION CLAIM. This fires on EVERY turn.
- WHY ALLOWED: the v2.4 "proof" called `onTurnEnd` with a completion-shaped text; it never called it with an ORDINARY text. **The negative half was never run.**
- FIX: gate on the CLAIM'S PRESENCE (an atom in the closing), never on the turn ending. No claim → no judgment.

### F2 · THE JUDGE IS REFUSE-BIASED AND UNCALIBRATED (CRITICAL)
- LOCATION `src/omp/jev.ts:387-394` (the criteria) + `enforceGate`'s tau
- WHAT: the attacker ran 6 closings (5 benign + 1 strong-done control). **All 6 → `refuse`** — including `"523 tests pass, the artifact rendered"` at **p=0.689**. `serve` reads 0.76-0.94, `refuse` 0.53-0.96 — **the distributions OVERLAP**; the bar cannot discriminate.
- COMMAND + OUTPUT: `bun run /tmp/fp-judge-probe.ts` → read-summary p=0.646 · done-reading p=0.554 · completed-review p=0.652 · verified-read p=0.542 · ready-next p=0.747 · **strong-done p=0.689** (all `action=refuse`).
- WHY: a security-fail-CLOSED gate on an UNCALIBRATED judge = a brick. A judge that says NO to everything has zero signal.
- WHY ALLOWED: I measured the judge ANSWERS (it reads); I never measured its DISCRIMINATION (it does not).
- FIX: the done-gate may NOT be fail-CLOSED until a control set proves it separates done from not-done (a known-positive MUST serve).

### F3 · THE BINDER REJECTS "Done reading X" (HIGH)
- LOCATION `src/omp/claim-firewall.ts` (the ATOM_PATTERNS + the turn-spans binder)
- WHAT: `'Done reading agent_plugin_boilerplates/… — here is the summary'` trips the completion atom → `GI_FABRICATED_CLAIM` (the binder found no bound tool-result for "Done"). The incident was the SECOND layer (`GI_DONE_UNPROVEN`) on the same closing.
- WHY: 'Done reading' is not a completion claim; the atom detector fires on the WORD.
- FIX: the atoms must match whole-claim shapes, never the word.

### F4 · THE REMEDY IS A COPY-PASTE ELSE-BRANCH (HIGH)
- LOCATION `src/omp/jev.ts:575-584` (`enforceGate`)
- WHAT: every `DONE_ROUTE_ACT` refusal serves the READ_VERB_HIJACK/RETRIEVAL fallback remedy: *"if this is ordinary usage, remove the obfuscation/wrapper"* — **verbatim the incident text on a Read summary**. The remedy describes shell-evasion, not a turn close.
- FIX: a per-kind remedy branch; the DONE remedy names the done-gate.

### F5 · THE SUBSTRATE BLOCK MISSES ITS OWN EXEMPTION (HIGH)
- LOCATION `src/omp/gate-hook.ts:176-184`
- WHAT: the W6 block throws `GI_NO_SUBSTRATE` on ANY write/edit in an empty workspace — the comment claims *"Doc-only edits never trigger"* (line 178) but there is **no file-type check**. A fresh workspace cannot make its first doc edit.
- COMMAND + OUTPUT: `bun run /tmp/fp-live-gate.ts` (edit on a /tmp empty ws) → `BLOCKED: GI_NO_SUBSTRATE`.
- FIX: check the file type; exempt docs; or scope to code-edit sessions.

### F6 · BENIGN REPEATED READS TRIP THE LOOP GATE (HIGH)
- LOCATION `src/omp/gate-hook.ts:204-212`
- WHAT: `LOOP_TRIP_N=3`; the counter compares normalized command STRINGS with **no state-change check**. The same `grep -rn foo src/` 4× → `GI_LOOP_REPEAT`. Legitimate polling/retries are blocked.
- FIX: require a no-state-change predicate, not string equality.

### F7 · THE FIREWALL IS A KEYWORD GREP — 13/13 GREEN IS MEANINGLESS (HIGH)
- LOCATION `scripts/v24-firewall.sh:12-16,48,50,52`
- WHAT: **8 of 13 detectors assert TOKEN PRESENCE, never behavior.** A COMMENT naming the token passes.
- COMMAND + OUTPUT (attacker): `printf '// GI_RETRIEVAL_GATE decorative' | grep -q 'GI_RETRIEVAL_GATE'` → `COMMENT_MATCHES`. The green never proved a gate refuses.
- FIX: assert REFUSAL BEHAVIOR (execute the gate), never the string.

### F8 · THE PHANTOM TOKEN `GI_QUERY_REQUIRED` (HIGH)
- LOCATION `src/omp/graph-gate.ts:302,310` (the REAL tokens) vs the DPL1 C3
- WHAT: the DPL1 C3/§9 name `GI_QUERY_REQUIRED`. **The runtime never emits it** — it emits `GRAPH_GATE_DRIFT_HIGH` (T2) / `GRAPH_GATE_ABORT` (T3).
- COMMAND + OUTPUT: `grep -rn GI_QUERY_REQUIRED src/` → **0 hits**.
- FIX: name the real tokens in the spec, or emit the spec token.

### F9 · THE LEDGER ELIF IS A DEAD BRE (MED)
- LOCATION `scripts/v24-firewall.sh:33`
- WHAT: `grep BRE '"source_kind":"(quotation|table|…)"'` matches only the LITERAL parens string (BRE treats `(`/`|` literally). A real quotation row FAILs the firewall.
- FIX: `grep -E`.

---
## §4 THE VERBATIM PROBES
```
bun run /tmp/fprate.ts        → 5/5 normal closings BLOCKED (GI_DONE_UNPROVEN p=0.85-0.91)
bun run /tmp/fp-live-gate.ts  → doc-edit in empty ws BLOCKED GI_NO_SUBSTRATE; loop BLOCKED on the 4th
(attacker) /tmp/fp-judge-probe.ts → 6/6 refuse incl. strong-done p=0.689
grep -rn GI_QUERY_REQUIRED src/ → 0 hits
printf comment | grep <token>  → COMMENT_MATCHES (the firewall's green is string-presence)
```

---
## §5 THE SLOP TAXONOMY
| # | class | the case |
|---|---|---|
| 1 | wrong-surface gate | F1 (the DONE gate on every turn) |
| 2 | uncalibrated judge + vacuous threshold | F2 (refuse-biased, overlapping distributions) |
| 3 | assertion absence | F3 (the atom on the word) |
| 4 | copy-paste remedy branch | F4 |
| 5 | comment-code contradiction | F5 (the exemption claim) |
| 6 | string-equality as proof | F6 (the loop) |
| 7 | theatrical verification | F7 (the keyword-grep firewall) |
| 8 | phantom token / spec-drift | F8 |
| 9 | dead detector (BRE) | F9 |

---
## §6 THE REBUILD REQUIREMENTS
| # | requirement | traces to | the mechanical check |
|---|---|---|---|
| R1 | every gate fires ONLY on its TRIGGER (a done-gate on a CLAIM, not a turn) | F1 | a negative set: 10 ordinary closings must all SERVE |
| R2 | every judge-backed gate must DISCRIMINATE before it ships | F2 | a control set: a known-positive serves, a known-negative refuses, gap > 0.25 |
| R3 | no gate is fail-CLOSED on an uncalibrated judge | F2 | the calibration artifact exists |
| R4 | the binder matches CLAIM shapes, not the word | F3 | 'Done reading X' serves |
| R5 | a per-kind remedy | F4 | the DONE refusal names the done-gate |
| R6 | the exemptions the comments claim are IMPLEMENTED | F5 | a doc edit in an empty ws serves |
| R7 | the loop gate needs a state-change proof | F6 | 4 identical reads with no change still refuse; a changed read serves |
| R8 | the firewall executes the gate, never greps the token | F7 | a comment-token does NOT pass |
| R9 | the spec names the REAL tokens | F8 | `grep GI_QUERY_REQUIRED src/` == the spec OR the spec changed |
| R10 | NO deploy without the container round's NEGATIVE half | the incident | an artifact `.omp/ct-results.json` with the negative half green |

---
## §7 THE HONEST SURVIVE LIST
- The **local-judge wire** is REAL (the ledger row jev:0.8455 — the judge reads).
- The **W2 retrieval detector** is sound (a transcript grep is caught; the source grep + config read + jev query all serve — verified by the author's probe: 5/5 normal actions SERVED on the tool_call path).
- The **loop/query/substrate** mechanisms EXIST (the code is real; the calibration is not).
- **v2.3 is RESTORED** (live = `2e2a39031c6059ca`, 0 v2.4 markers, lexicon-gate disabled).
- **NOT ONE v2.4 gate is clearing for deployment.**

---
## §8 THE ATTACKERS + THE CORROBORATION
| finding | BH-FalsePositive | BH-FalseNegative | author | verdict |
|---|---|---|---|---|
| the DONE gate bricks every turn | ✓ (5+1 refused) | ✓ | ✓ (5/5) | **CORROBORATED 3×** |
| the firewall is a keyword grep | — | ✓ | ✓ | CORROBORATED |
| the phantom token | — | ✓ | ✓ | CORROBORATED |
| the doc-edit brick / the loop FP | ✓ | — | ✓ | CORROBORATED |
**Convergence:** every lens independently found the DONE gate as the incident. Three lenses, one answer.

---
## §9 COVERAGE + GAPS
EXAMINED: the 4 changed runtime files + the firewall + the judge behavior. DID NOT: the container round (never run — the root of the failure); the 10 TTSR rules.
---
## §10 ROOT-CAUSE SYNTHESIS
**One mechanism under F1-F8:** *a shape is asserted where a TRIGGER is required.* The done-gate fired on the SHAPE of a turn (it ended) not the TRIGGER (a claim); the judge was shipped on the SHAPE of a read (a number) not its TRIGGER (discrimination); the firewall asserted the SHAPE of a gate (a token) not its TRIGGER (a refusal). **And under all of it: the proof-by-direct-call substituted for the runtime path.** The one law: **a gate is proven by its NEGATIVE set on the REAL path, or it is not proven.**
---
## §11 SEVERITY LEDGER + THE ANSWER
| severity | count | ids |
|---|---|---|
| **CRITICAL** | 2 | F1 (every turn blocked) · F2 (uncalibrated judge) |
| **HIGH** | 5 | F3 · F4 · F5 · F6 · F7 · F8 |
| **MEDIUM** | 1 | F9 |
**THE ANSWER:** v2.4 is **BROKEN AS SPECIFIED** — it fail-closes on ~100% of ordinary turns. It was shipped on direct-call proofs without the container round. **Live is restored to v2.3.** The build's ONLY value is this ledger.
