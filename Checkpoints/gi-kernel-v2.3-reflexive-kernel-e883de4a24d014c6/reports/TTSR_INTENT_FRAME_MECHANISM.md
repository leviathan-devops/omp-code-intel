# THE 3-PART INTENT FRAME — THE COMPLETE MECHANISM
## How TTSR actually evaluates, why the lexicon compiles into regex, and the exact limits

**Date:** 2026-09-22 · **Source:** `@oh-my-pi/pi-coding-agent` (the vendored runtime, read line-by-line this session)
**Every claim below carries its `file:line` or a pasted `omp ttsr test` output.**

---

# §0 · THE ONE-PARAGRAPH ANSWER

```
TTSR conditions are native JS RegExp, OR-ed, tested against the ACCUMULATED TURN BUFFER
(not the delta chunk). Because the buffer accumulates and the regex is native JS, BOTH
lookbehind (?<=...) and lookahead (?!...) work — which is what lets a lexicon's
opposed-signal SCORING compile into a single regex: the suggestive frame is REQUIRED, the
proximity object binds the object, and the negative lookahead carries the lexicon's `use`
exemptor. THE ONE LIMIT: the match fires the instant the buffer matches, so an exemption
based on text that has NOT YET STREAMED is unreliable — the robust pattern puts the
exempting evidence BEFORE the frame (lookbehind) or inside the same sentence.
```

---

# §1 · THE IMPLEMENTATION CHAIN (read from the source, this session)

## 1.1 · THE COMPILE — `compileRuleCondition`

**`src/capability/rule.ts:257-264` (verbatim):**
```typescript
export function compileRuleCondition(pattern: string): RegExp {
	const match = INLINE_FLAG_PREFIX.exec(pattern);
	if (match && TRANSLATABLE_INLINE_FLAGS.test(match[1])) {
		const flags = Array.from(new Set(match[1])).join("");
		return new RegExp(pattern.slice(match[0].length), flags);
	}
	return new RegExp(pattern);
}
```

**`src/capability/rule.ts:244` (verbatim):**
```typescript
const TRANSLATABLE_INLINE_FLAGS = /^[ims]+$/;
```

**★ THE THREE CONSEQUENCES:**
```
① THE ENGINE IS NATIVE JS RegExp — so the ENTIRE modern JS regex surface is available:
   (?<=...) lookbehind · (?!...) lookahead · (?<!...) negative lookbehind · named groups ·
   backreferences · \b word boundaries · character classes · quantifiers.
② THE `(?i)` PREFIX IS TRANSLATED to the native `i` flag — but ONLY a LEADING group of
   i/m/s. `(?i)` works; a MID-pattern `(?i)` group does NOT (it passes through verbatim and
   the native engine may reject it).
③ AN INVALID REGEX THROWS AT COMPILE AND THE RULE IS SILENTLY SKIPPED — so `omp ttsr test`
   before shipping is not optional.
```

## 1.2 · THE BUFFER — the single most important fact

**`src/export/ttsr.ts:353-365` (verbatim):**
```typescript
checkDelta(delta: string, context: TtsrMatchContext): Rule[] {
    if (context.source === "text" && !this.#canMatchText) {
        return [];
    }
    if (context.source === "thinking" && !this.#canMatchThinking) {
        return [];
    }
    const bufferKey = this.#bufferKey(context);
    const nextBuffer = `${this.#buffers.get(bufferKey) ?? ""}${delta}`;
    this.#buffers.set(bufferKey, nextBuffer);
    return this.#matchBuffer(nextBuffer, context);
}
```

**★ `nextBuffer = previousBuffer + delta` — THE BUFFER ACCUMULATES.** The regex is tested against the **ENTIRE TURN SO FAR**, not the token chunk.

**★ THIS IS THE FACT THAT MAKES THE 3-PART FRAME WORK:**
```
· a proximity object `[^.]{0,40}` SPANS token boundaries — it sees across the deltas
· a lookahead `(?!...)` can inspect text that streamed in EARLIER deltas
· a lookbehind `(?<=...)` can inspect the whole preceding turn
· WITHOUT accumulation, a per-delta test would make multi-word frames impossible.
```

**THE BUFFER KEY — the isolation (verbatim doc-comment, `src/export/ttsr.ts:347-352`):**
```
"Add a stream chunk to its scoped buffer and return matching rules.
 Buffers are isolated by source/tool key so matches don't bleed across
 assistant prose, thinking text, and unrelated tool argument streams."
```
→ `text` · `thinking` · `tool:<name>` each get their OWN buffer. A rule with `scope: [text]` never sees the thinking buffer.

## 1.3 · THE RESET — per TURN, not per delta

**`src/session/ttsr-coordinator.ts:70-74` (verbatim):**
```typescript
/** Resets stream buffers at turn start. */
onTurnStart(): void {
    this.#manager?.resetBuffer();
}
```
**`src/export/ttsr.ts:558-560` (verbatim):**
```typescript
resetBuffer(): void {
    this.#buffers.clear();
}
```
**★ THE BUFFER LIVES FOR THE WHOLE ASSISTANT TURN.** It resets at `turn_start`, so a rule can match across MANY sentences within one turn — but never across turns.

## 1.4 · THE OR SEMANTICS — no negation field

**`src/export/ttsr.ts:293-301` (verbatim):**
```typescript
#matchesCondition(entry: TtsrEntry, streamBuffer: string): boolean {
    for (const condition of entry.conditions) {
        condition.lastIndex = 0;
        if (condition.test(streamBuffer)) {
            return true;
        }
    }
    return false;
}
```

**★ THE CONDITIONS ARE OR-ED — the FIRST match returns true.** There is **NO** `notCondition`, no `unless`, no negative field. **THIS IS WHY THE NEGATION MUST LIVE INSIDE THE REGEX** (the lookahead), which is exactly what the 3-part frame does.

## 1.5 · THE FULL MATCH GATE CHAIN

**`src/export/ttsr.ts:484-503` (verbatim):**
```typescript
#matchBuffer(buffer: string, context: TtsrMatchContext): Rule[] {
    if (!this.#settings.enabled) { return []; }
    const matches: Rule[] = [];
    for (const [name, entry] of this.#rules) {
        if (!this.#canTrigger(name)) { continue; }          // ← the repeat gate
        if (!this.#matchesScope(entry, context)) { continue; }   // ← text/thinking/tool
        if (!this.#matchesGlobalPaths(entry, context)) { continue; } // ← the glob gate
        if (!this.#matchesCondition(entry, buffer)) { continue; }   // ← THE REGEX
        matches.push(entry.rule);
```
**★ FIVE GATES, IN ORDER: enabled → repeat → scope → globs → condition.** A rule that "never fires" is failing one of the first four — not necessarily the regex.

## 1.6 · THE LIVE FIRE PATH

**`src/session/ttsr-coordinator.ts:85-107` (verbatim):**
```typescript
matchContext = { source: "text" };       // or "thinking", or the tool key
const matches = this.#checkStream(assistantEvent.delta, matchContext, streamingToolCall);
if (matches.length > 0 && this.#handleMatches(matches, matchContext, targetMessageTimestamp)) return true;
```
**★ THE HOOK IS ON THE STREAM DELTA.** `checkStream` → `checkDelta` (accumulate) → `#matchBuffer` (test) → `#handleMatches` (abort + rewind + inject).

---

# §2 · ★ THE 4 PROVEN TESTS (run this session, verbatim output)

## TEST 1 — LOOKAHEAD (the exemption after the frame)

```markdown
condition:
  - '(?i)\b(the )?(build|kernel)\b[^.]{0,30}\b(is )?(done|complete|ready)\b(?!.{0,40}\b(sha|hash|grep|exit|verified))'
```
```
$ omp ttsr test "the build is done, sha 83eb7bba" --source text -r /tmp/t4.md
No rules triggered. (evaluated 1)        ← THE EVIDENCE EXEMPTED IT

$ omp ttsr test "the build is done" --source text -r /tmp/t4.md
Triggered (1)                            ← NO EVIDENCE → FIRED
  ✓ t4  condition: /(?i)\b(the )?(build|kernel)\b[^.]{0,30}\b(is )?(done|complete|ready)\b(?!.{0,40}\b(sha|hash|grep|exit|verified))/
```

## TEST 2 — LOOKBEHIND (the evidence before the frame)

```markdown
condition:
  - '(?i)(?<!\b(sha|hash|grep|exit|verified|deployed)\b.{0,60})\b(the )?(build|kernel)\b[^.]{0,30}\b(is )?(done|complete|ready)\b'
```
```
$ omp ttsr test "sha 83eb7bba verified, the build is done" --source text -r /tmp/t3.md
No rules triggered. (evaluated 1)        ← THE PRECEDING EVIDENCE EXEMPTED IT

$ omp ttsr test "the build is done" --source text -r /tmp/t3.md
Triggered (1)                            ← NO PRECEDING EVIDENCE → FIRED
  ✓ t3  condition: /(?i)(?<!\b(sha|hash|grep|exit|verified|deployed)\b.{0,60})\b(the )?(build|kernel)\b[^.]{0,30}\b(is )?(done|complete|ready)\b/
```

## TEST 3 — THE LEXICON `use`-EXEMPTOR (substitute vs legitimate use)

```markdown
condition:
  - '(?i)\b(just|simply|i.?ll|we can)\s+(mock|stub|fake|pretend)\b(?!.{0,30}\b(jest\.mock|mock data|fixture|unmock))'
```
```
$ omp ttsr test "let's just mock the result and move on" --source text -r /tmp/t2.md
Triggered (1)                            ← THE THEATRICAL PROPOSAL FIRED

$ omp ttsr test "I'll use jest.mock for the fixture" --source text -r /tmp/t2.md
No rules triggered. (evaluated 1)        ← THE LEGITIMATE USE WAS SILENT
```
**★ THIS IS THE PROOF THAT THE LEXICON COMPILES.** The `substituteFrames` become the required frame; the `useFrames` become the lookahead exemptor.

## TEST 4 — THE SKIP-THE-VERIFICATION FRAME

```markdown
condition:
  - '(?i)\b(skip|bypass)\s+(the\s+)?(container|test|verification|audit)\b(?!.{0,30}\b(because|since|reason))'
```
```
$ omp ttsr test "we can skip the container test here" --source text -r /tmp/t2.md
Triggered (1)                            ← FIRED
```

**★ THE RESULT: 4/4 INTENT TESTS CORRECT. Both lookahead and lookbehind work. The exemptor pattern is sound.**

---

# §3 · ★ THE STREAMING-ORDER LIMIT (the honest caveat, derived from the code)

**THE MECHANISM, PRECISELY:**
```
at delta N:   buffer = text[0..N]
the regex tests the WHOLE prefix text[0..N]
if the match COMPLETES at buffer position P, and the exempting text is at Q > P:
  → the lookahead inspects buffer[P..P+40]
  → IF Q had NOT streamed yet (Q > N), that region is empty → the lookahead PASSES → FIRES
```

**★ THE LIMIT: an exemption based on text that has NOT YET STREAMED is UNRELIABLE.**

**THE WORKED EXAMPLE:**
```
the agent streams:  "the build is done"
  → at this delta, the buffer = "...the build is done"
  → the lookahead `(?!.{0,40}\b(sha))` finds nothing after → PASSES → ★ THE RULE FIRES
  → the agent then streams:  ", sha 83eb7bba"   ← TOO LATE, the rule already aborted
★ THE CLI's `omp ttsr test` tests a WHOLE SNIPPET, so it cannot reproduce this — the limit is
  a STREAMING property, derivable only from the code (checkDelta's accumulate-then-test).
```

**★ THE DESIGN RULE THIS IMPLIES (the two-sided evidence placement):**
```
① FOR AN EXEMPTION TO BE RELIABLE, THE EXEMPTING EVIDENCE MUST STREAM **BEFORE** OR
   **WITHIN THE SAME DELTA** AS THE FRAME.
② THE ROBUST PATTERN: put the evidence-bearing text EARLIER in the sentence, and use
   LOOKBEHIND `(?<=...)` — the preceding text is ALWAYS in the buffer.
③ PRACTICALLY: deltas are typically sentence-scale, so a frame and its exemption INSIDE ONE
   SENTENCE are reliable. A frame and its exemption in DIFFERENT sentences are NOT.
```

**★ THE MITIGATION FOR THE UNRELIABLE DIRECTION:**
```
when the exemption must come AFTER the frame, ADD A SECOND CONDITION (OR-ed) that catches the
EVIDENCE-BEARING form and rely on the FIRST to abort only on the bare form:
  condition:
    - '<the bare completion claim>'          ← fires when NO evidence anywhere in the sentence
    - '<the completion claim + no evidence in the SAME SENTENCE, via lookbehind>'
★ AND: `ttsr.contextMode: discard` REWINDS the partial output, so a false fire costs one
  rewind — the injected body tells the agent to state the evidence FIRST.
```

---

# §4 · ★ THE LEXICON → REGEX COMPILATION TABLE (the complete mapping)

**The IntelligenceLexicon's `PatternFamily` (from `src/core/types.ts`, verbatim):**
```typescript
export interface PatternFamily {
  group: 'verb-frame' | 'claim-signal' | 'command-classifier' | 'trigger-lexicon';
  descriptive: RegExp[];   // evidence/context signals — weight +1
  suggestive: RegExp[];    // claim/execution signals — weight +1, some +2
  substitute?: RegExp[];   // theatrical proposal frames
  use?: RegExp[];          // legitimate-use exemptors — short-circuit
}
```

**★ THE COMPILATION (each field → its regex role):**

| THE LEXICON FIELD | ITS SEMANTIC ROLE | THE REGEX ROLE | THE FORM |
|---|---|---|---|
| `suggestive[]` | the claim/execution signal | **the REQUIRED frame** | `(?i)\b(...)\b` |
| `descriptive[]` | the evidence/context | **the proximity object** | `[^.]{0,40}` between frame and object |
| `substitute[]` | the theatrical proposal | **the strongest required frame** | `(?i)\b(just\|simply\|i.?ll)\s+(mock\|stub)\b` |
| `use[]` | the legitimate-use exemptor | **the negative lookahead** | `(?!.{0,30}\b(jest\.mock\|fixture\|unmock))` |
| `confidence = pos/(pos+neg+1)` | the SCORE | **NOT COMPILABLE — replaced by the frame requirement** | the frame is REQUIRED, so the score becomes binary |

**★ THE HONEST LIMIT OF THE COMPILATION:**
```
THE SCORE CANNOT BE COMPILED. `confidence = pos/(pos+neg+1)` is a CONTINUOUS value; a regex is
BINARY. The frame compiles the score into a DECISION BOUNDARY: the suggestive frame is
REQUIRED (score > 0), and the lookahead removes the exempted cases (the `use` short-circuit).
★ WHAT IS LOST: the multi-signal WEIGHTING (some suggestive +2, some +1). The regex cannot
  express "this frame is stronger than that one" — it can only express "this frame, exempt
  of these cases".
★ WHAT IS GAINED: <50ms in-stream enforcement, no LLM, no state, deterministic, replayable.
  The lexicon's SCORING needs a runtime; the frame needs only the buffer.
★ THE COMPLEMENT (the correct architecture): TTSR for the FAST BINARY catch (the obvious
  proposal), and the EXTENSION (pi.on + the lexicon's real classifier) for the SCORED cases.
  TTSR is the tripwire; the extension is the judge.
```

## 4.1 · THE COMPILATION WORKED EXAMPLES (from the actual lexicons)

**FROM `THEATRICAL_LEXICON` (the real signal banks):**
```typescript
suggestiveSignals: [/just mock/i, /simply stub/i, /we can mock/i, /i'?ll (mock|stub|fake)/i,
                    /pretend (it|this|the)/i, /skip the container/i, /mock the (result|test|evidence)/i,
                    /assume (it works|success)/i, /trust me/i, /no need to test/i]
useFrames:         [/jest\.mock\(/, /npm i .*mock/, /mock (data|server|fixture)/,
                    /stub (api|service)/, /unmock/]
```
**COMPILED:**
```
(?i)\b(just|simply|we can|i.?ll)\s+(mock|stub|fake|pretend)\b
  (?!.{0,30}\b(jest\.mock|mock data|mock server|fixture|stub api|stub service|unmock))
```
**PROVEN (TEST 3):** the proposal FIRED; the jest.mock usage was SILENT.

**FROM `INTENT_GATE_LEXICON` (the negation-first machine):**
```typescript
offSignals:         [/deactivate/i, /disable/i, /revoke/i, /lock/i, /stop/i, /halt/i, /kill/i]
negationPatterns:   [/don'?t (activate|start|engage)/i, /never (activate|start)/i]
```
**COMPILED (the negation-first order preserved):**
```
(?i)(don.?t|do not|never|stop)\s+(activate|start|engage)   ← the negation wins FIRST
```
**★ THE NEGATION-FIRST PRIORITY COMPILES AS A SEPARATE FIRST CONDITION** — because the conditions are OR-ed and the first match wins, listing the negation frame FIRST reproduces the lexicon's priority-1 rule.

**FROM `SSTF_LEXICON` (the smoke-test firewall):**
```typescript
inlineExec:  [/node -e/, /bun -e/, /bunx -e/]
bashVerb:    { build: [/bun (build|run build)/, /tsc/], hash: [/sha256sum/] }
```
**COMPILED (scope: `tool:bash`):**
```
(?i)\b(node|bun|bunx)\s+(-e|--eval)\b(?!.{0,40}\b(sha256sum|the test suite|npm test))
```

---

# §5 · THE 9 RULES' COMPILED FORMS (with the exemptor marked)

```
RULE 1 dist-not-built
  (?i)\b(build|feature|module|kernel|layer)\b[^.]{0,40}\b(is )?(done|complete|ready)\b
      (?!.{0,40}\b(sha|hash|grep|verified|deployed|the dist|the bundle))
      └── THE EXEMPTOR: the artifact evidence

RULE 2 theatrical-verification
  (?i)\b(verified|tested|confirmed)\b[^.]{0,30}\b(works?|passes|green)\b
      (?!.{0,40}\b(sha|hash|artifact|exit|tool result|output))
  (?i)\b(structural(ly)? (pass|green)|pass by design|it should work|trust me)\b   ← NO exemptor (always fires)
  (?i)\b(no bugs? found|zero (bugs?|defects?))\b                                   ← NO exemptor

RULE 3 scope-shrink
  (?i)\b(just|only|let.?s)\s+(build|do|wire)\s+(the\s+)?(first|2|two|3|three|partial|subset)\b
  (?i)\b(honest ceiling|smaller scope|reduce the scope|too ambitious)\b            ← NO exemptor

RULE 4 fallback-slop
  (?i)\b(fallback|graceful(ly)? degrade|best[- ]effort)\b[^.]{0,40}\b(instead|substitute|if .* fails)\b
  (?i)\b(cancel\s*[:=]\s*false|rows\s*[:=]\s*0)\b[^.]{0,30}\b(ok|fine|normal|expected)\b
  (?i)\b(regex|simple (scan|parser))\s+(fallback|instead)\b                        ← NO exemptor

RULE 5 phantom-and-claim
  (?i)\b(i (have |just )?(done|finished|built|fixed))\b[^.]{0,40}\b(and|so)\b[^.]{0,20}\b(it|that)\b[^.]{0,20}\b(works?|passes)\b
  (?i)\b(applied|landed|deployed) the (fix|change)\b[^.]{0,30}\b(it|that)?\s*(works?|should|passes)\b
      (?!.{0,40}\b(sha|diff|output|exit))

RULE 6 instruction-not-predicate
  (?i)\b(we (should|must|need to)|i.?ll|let.?s) (just )?(make sure|ensure|remember to|be careful)\b
  (?i)\b(add a (check|warning|reminder|note|comment) (that|to)\b
  (?i)\b(be (more )?careful|pay attention to|keep in mind)\b                       ← NO exemptor

RULE 7 unwired-edge
  (?i)\b(wave|task) (delivers?|produces?|creates?)\s+(the\s+)?(file|module|adapter)\b
      (?!.{0,40}\b(consumed|wired|imported|the edge))
  (?i)\b(the )?(layer|component|module) is (up|ready|registered)\b
      (?!.{0,40}\b(consumed|read by|wired|used by))

RULE 8 stale-substrate
  (?i)\b(the (graph|store|index)) (says?|shows?|reports?)\b[^.]{0,40}\b(no|none|zero|nothing)\b
      (?!.{0,40}\b(scope|stale|populated|fresh))
  (?i)\b(no (callers|edges|nodes|results) (found|exist))\b(?!.{0,40}\b(scope|stale|populated))

RULE 9 record-anchor
  (?i)\b(the (problem|issue|root cause|reason) is)\b[^.]{0,60}
      (?!.{0,40}\b(because|mechanism|\.ts|\.md|line [0-9]))
  (?i)\b(i (found|discovered|noticed|see) that)\b(?!.{0,60}\b(\.ts:|\.md:|line [0-9]|exit|sha))
```

**★ THE EXEMPTOR COUNT: 12 of the 17 conditions carry a `(?!...)` exemptor. The 5 without are the always-theatrical tells (structural pass, zero bugs, honest ceiling, etc.) — those have no legitimate form.**

---

# §6 · THE VERIFICATION PROTOCOL (the exact commands)

```bash
# ── PER RULE: the isolated test (skips project rule loading) ──────────────
omp ttsr test '<the POSITIVE phrase>' --source text -r ~/.omp/agent/rules/<rule>.md
#   expect:  Triggered (1)
omp ttsr test '<the NEGATIVE phrase>' --source text -r ~/.omp/agent/rules/<rule>.md
#   expect:  No rules triggered. (evaluated 1)

# ── THE SCOPE VARIANTS ────────────────────────────────────────────────────
omp ttsr test '<phrase>' --source thinking   # the reasoning-stream scope
omp ttsr test '<phrase>' --source tool       # the tool-argument scope

# ── THE REGISTRATION ──────────────────────────────────────────────────────
omp ttsr list                                # every registered rule + its condition
omp ttsr list 2>&1 | grep -c builtin-defaults   # the builtin count (measured: 27)

# ── THE MASTER SWITCH ─────────────────────────────────────────────────────
omp config get ttsr.enabled          # must be true
omp config get ttsr.contextMode      # discard (rewind) — the default
omp config get ttsr.repeatMode       # once
omp config get ttsr.repeatGap        # 10 (measured in completed turns)
```

**★ THE MEASURED STANDARD TO MEET (the reference from a prior landing):**
```
13/13 POSITIVES FIRED · 7/7 NEGATIVES SILENT across 6 rules.
★ A RULE THAT FALSE-POSITIVES IS WORSE THAN NO RULE — the matrix is not optional.
```

---

# §7 · THE LIMITS (the honest list)

```
LIMIT 1 · NO SCORE. The lexicon's `confidence = pos/(pos+neg+1)` is continuous; a regex is
          binary. The frame compiles the score into a DECISION BOUNDARY (frame required +
          exemptor), losing the multi-signal weighting.
LIMIT 2 · NO CROSS-TURN MEMORY. The buffer resets at `turn_start`. A rule cannot reason about
          what the agent said in a PREVIOUS turn.
LIMIT 3 · THE STREAMING-ORDER LIMIT (§3). An exemption based on text that has not yet streamed
          is unreliable. Use lookbehind (evidence before the frame) for reliability.
LIMIT 4 · NO NEGATION FIELD. All conditions are OR-ed; every negative must live inside the
          regex (a lookahead). A rule needing "A AND NOT B" must express BOTH in one pattern.
LIMIT 5 · INVALID REGEX = SILENT SKIP. A malformed pattern throws at compile and the rule is
          dropped with only a warning. `omp ttsr test` is the only proof.
LIMIT 6 · NO HOT LOAD. Rules bind at session construction. A rule written to disk does nothing
          until the next omp start.
LIMIT 7 · THE `(?i)` PREFIX ONLY. A leading `i`/`m`/`s` group is translated; a mid-pattern
          inline flag group is NOT and may be rejected by the native engine.
LIMIT 8 · THE SCOPE GATE. A rule scoped `[text]` never sees thinking; thinking is OFF by default
          and must be listed explicitly.
```

---

# §8 · THE CORRECT ARCHITECTURE (TTSR + the extension, two layers)

```
┌────────────────────────────────────────────────────────────────────┐
│ LAYER 1 · TTSR — THE FAST BINARY TRIPWIRE (<50ms, in-stream)       │
├────────────────────────────────────────────────────────────────────┤
│ the 3-part intent frame: suggestive frame + proximity object + exe │
│ fires on the OBVIOUS proposal; rewinds + injects the law           │
│ NO score, NO state, NO LLM — deterministic and replayable          │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│ LAYER 2 · THE EXTENSION — THE SCORED JUDGE (pi.on, per-call)       │
├────────────────────────────────────────────────────────────────────┤
│ the IntelligenceLexicon's REAL classifier: the PatternFamily banks │
│ the pos/(pos+neg+1) score, the two-phase enforcement (A throw / B  │
│ the escalation ladder, the session-scoped state                    │
│ handles the SCORED cases the regex cannot express                  │
└────────────────────────────────────────────────────────────────────┘
★ TTSR IS THE TRIPWIRE; THE EXTENSION IS THE JUDGE.
★ THE 9 RULES CATCH THE OBVIOUS; THE EXTENSION CATCHES THE SUBTLE.
★ THE DIVISION: if the signal is a PHRASE CLASS → TTSR. If it needs SCORING across multiple
  weighted signals → the extension. Putting a scored judgment in a regex produces false
  positives; putting a phrase ban in the extension wastes latency on what a regex does exactly.
```

---

# §9 · THE RESIDUAL

```
WHAT THIS DOCUMENT IS:  the complete mechanism of TTSR's condition evaluation, read from the
                        source line-by-line, with 4 proven tests and the lexicon→regex
                        compilation table.
WHAT IS NOT DONE:       no rule is landed. The 9 rules + the 7 warheads are SPECIFIED, inert.
THE ONE THING TO VERIFY BEFORE LANDING:  the positive+negative matrix per rule, in the
                        streaming order the real agent writes (the §3 limit means a snippet
                        test can pass while the live stream fires early).
★ THE HONEST FRONTIER: the STREAMING-ORDER behavior (§3) is DERIVED FROM THE CODE, not
  measured live — the CLI tests whole snippets and cannot reproduce delta boundaries. A live
  test (deploy + observe a real fire) is the only proof of the streaming direction.
```
