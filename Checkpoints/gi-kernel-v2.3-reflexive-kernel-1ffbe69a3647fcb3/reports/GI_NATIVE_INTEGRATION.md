# GI → OMP NATIVE INTEGRATION
## Every GI enforcement mapped onto the substrate that ALREADY exists — paste-ready

**Date:** 2026-09-22 · **Baseline:** `omp v18.1.15` · `@oh-my-pi/pi-coding-agent 17.2.12`
**Sources:** `omp.sh/docs` · `omp.sh/docs/sdk` · the live `~/.omp/agent/{SYSTEM,APPEND_SYSTEM,RULES}.md` · the live TTSR rule (`rules/allowed-models.md`) · the 4 forensic docs (F-95 · SV-95 · TL-95 · TH-95).
**Purpose:** the operator's order — *"the exact prompt additions i can plug into RIGHT NOW ... every enforcement GI is supposed to have — MAP IT ONTO THIS EXISTING SUBSTRATE ... HEAVY FOCUS ON VIOLENTLY MURDERING THEATRICAL BULLSHIT, DERAILMENTS, STUPIDITY."*

---

# §0 · THE NATIVE SURFACE (what already exists — 12 layers)

```
┌────────────────────────────────────────────────────────────────────┐
│ #  │ THE SURFACE            │ WHERE IT LIVES                    │  │
├────────────────────────────────────────────────────────────────────┤
│ 1  │ SYSTEM.md              │ ~/.omp/agent/SYSTEM.md            │  │
│ 2  │ APPEND_SYSTEM.md (730L)│ ~/.omp/agent/APPEND_SYSTEM.md     │  │
│ 3  │ RULES.md (7 rules)     │ ~/.omp/agent/RULES.md             │  │
│ 4  │ TTSR RULES             │ ~/.omp/agent/rules/*.md           │  │
│ │                        │ condition·scope·interruptMode     │ + r │
│ 5  │ HOOKS (pre/post)       │ ~/.omp/agent/hooks/{pre,post}/*.ts│  │
│ 6  │ EXTENSIONS             │ ~/.omp/agent/extensions/*/        │  │
│ 7  │ AGENTS                 │ ~/.omp/agent/agents/*.md          │  │
│ 8  │ SKILLS                 │ ~/.omp/agent/{skills,managed-}    │  │
│ 9  │ COMMANDS               │ ~/.omp/agent/commands/*.md        │  │
│ 10 │ SETTINGS               │ ~/.omp/agent/config.yml           │  │
│ 11 │ AGENT outputSchema     │ the agent def frontmatter         │  │
│ 12 │ MAGIC KEYWORDS         │ per-turn prose triggers           │  │
└────────────────────────────────────────────────────────────────────┘
★ LAYER 4 (TTSR) IS THE ONE THAT MURDERS THEATRE IN FLIGHT: it matches the STREAM and
  ABORTS MID-TOKEN. Layers 2+3 are sticky; layer 6 is mechanical (can BLOCK a tool call).
★ THE GI GATES MAP ALMOST ENTIRELY ONTO LAYERS 2, 3, 4, AND 6. NOTHING NEW MUST BE BUILT.
```

---

# §1 · THE MAPPING (every GI enforcement → its native home)

```
┌────────────────────────────────────────────────────────────────────┐
│ THE GI ENFORCEMENT           │ THE NATIVE   │ THE MECHANISM        │
│ │ HOME         │                                                   │
├────────────────────────────────────────────────────────────────────┤
│ GT-1 THE AUDIT GATE          │ L6 EXT + L4  │ pi.on("tool_call") o │
│ (no completion w/o audit)    │ TTSR         │ + a TTSR rule on the │
│ GT-2 THE SCOPE GATE          │ L3 RULES     │ the GI_STORE_SCOPE_M │
│ (empty ≠ wrong scope)        │ + L4 TTSR    │ + a TTSR rule on a b │
│ GT-3 THE FRESHNESS GATE      │ L3 RULES     │ the STALE invariant  │
│ (stale store = down)         │              │                      │
│ GT-4 ★ THE DEPLOY GATE       │ L3 + L4 + L5 │ the DIST invariant + │
│ (dist is the artifact)       │              │ pre-commit hook      │
│ GT-5 THE LIVE-FIRING GATE    │ L2 + L4      │ doctrine + a TTSR ru │
│ GT-6 THE NO-FALLBACK GATE    │ L2 + L3      │ doctrine + the invar │
│ GT-7 THE PREFLIGHT GATE      │ L6 EXT       │ pi.on("session_start │
│ GT-8 THE TEST-REALITY GATE   │ L3 + L4      │ the artifact-import  │
│ THE 40 AUTO-REJECT DETECTORS │ L4 TTSR      │ one rule per theatri │
│ THE LAYER-CONSUMPTION LAW    │ L2 + L3      │ the predicate as doc │
│ THE 7 TEST LAWS              │ L3 RULES     │ the test-subject inv │
│ THE ESCALATION LADDER        │ L2 DOCTRINE  │ V1 kick · V2 reassig │
└────────────────────────────────────────────────────────────────────┘
★ 12 GI ENFORCEMENTS. 12 NATIVE HOMES. ZERO NEW INFRASTRUCTURE.
```

---

# §2 · ★ BLOCK A — THE `APPEND_SYSTEM.md` ADDITIONS (sticky doctrine, paste at the end)

**These load on EVERY request. They are the warheads.**

```
<!-- ═══════════════════════════════════════════════════════════════════════════ -->
<!-- THE ARTIFACT LAW — GI integration (2026-09-22)                              -->
<!-- ═══════════════════════════════════════════════════════════════════════════ -->

## THE ARTIFACT LAW (read before ANY completion claim)

**THE DIST IS THE ARTIFACT. A source file is NOT delivered until its symbols are in the
binary the runtime loads.** 48 hours of a 4,041-line build produced ZERO runtime change
because every verification checked the SOURCE and the runtime loads the DIST.

- NEVER claim a build is done without `sha256sum <dist>` AND a symbol grep proving the
  changed source is IN the artifact.
- NEVER organize a plan's waves by FILE. Every wave's terminal deliverable is the
  ARTIFACT, or the wave is not a delivery.
- A green test that never loads the artifact CANNOT FAIL ON THE ARTIFACT. It is theatre.
- A checkpoint's NAME must be proven by its BINARY, not its manifest.
- A container/host PASS must record the SHA it ran and it must equal the build's SHA.

**THE ONE QUESTION EVERY GATE MUST ANSWER: "IS THE CODE I JUST BUILT IN THE THING THAT RUNS?"**

## THE THEATRE LAW (the form without the substance)

**THEATRE = the FORM of verification without its SUBSTANCE.** The form is complete: tests
run, containers pass, checkpoints seal. The substance is absent: none of it is about the
thing that runs.

BANNED, ON SIGHT:
- a test whose subject is a FIXTURE when its name claims a runtime proof
- a test that greps SOURCE and calls it wiring
- a test of a module NOTHING IMPORTS (or nothing in the artifact contains)
- a verdict read WITHOUT the sha-match that would falsify it
- a checkpoint/manifest/report that asserts a state its own artifact contradicts
- a "BLOCKED" gate that does not BLOCK — a blocked dependency is a TASK, never a verdict
- an audit that verifies CONSISTENCY instead of CONTENT

## THE SUBJECT LAW (what verification means)

**THE SUBJECT OF VERIFICATION MUST BE THE THING THAT RUNS.**
- a SOURCE test proves the source; label it SOURCE-UNIT and never cite it as runtime proof
- a LIVE test proves the artifact; it MUST import the deployed dist
- every verification declares its subject: SOURCE-UNIT | LIVE-ARTIFACT | CONTAINER
- "IF I BROKE THE THING THE CLAIM IS ABOUT, WOULD THIS GO RED?" — if NO, it is theatre

## THE SCOPE LAW (never shrink)

**THE SCOPE IS THE OPERATOR'S. A build that delivers fewer components is a FAILED BUILD,
not a smaller scope.** 1-of-6 populated is a BUILD FAILURE. NEVER re-specify a smaller
target and call it the plan.

## THE PREDICATE LAW (never instruct)

**AN INSTRUCTION CAN BE SKIPPED. A PREDICATE FAILS.** "wire the layers" is skippable and
was skipped for 7 passes. "a layer is UP iff consumers>=1 AND decisionsInfluenced>=1, else
GI_LAYER_UNCONSUMED" cannot be. EVERY prevention is a MECHANICAL PREDICATE that exits
nonzero when the error recurs. If nothing fails, it is documentation.

## THE READ-FIRST LAW (never re-derive)

**BEFORE authoring a plan, SEARCH FOR THE EXISTING SPEC.** An existing spec is a prior
analysis with the load-bearing decisions already made. Re-deriving it is the waste. And:
**A BUILD'S OWN POST-MORTEM IS THE HIGHEST-VALUE ARTIFACT IN THE PROJECT** — quote its root
cause VERBATIM. Two days were lost re-diagnosing a mechanism the build had already named.

## THE LIVE-STATE LAW (the eyes are not a light switch)

**A LAYER IS UP IFF ITS FACT CHANGED A VERDICT.** Existence ≠ intelligence. A register that
counts FILES (`up=11/11`) is worthless; the count that matters is `consumed:8`. NEVER treat
a substrate as a precondition to satisfy; it is THE INPUT TO EVERY DECISION.

## THE FALLBACK LAW

**NO SILENT FALLBACKS.** A missing substrate returns a NAMED, LOUD refusal
(`GI_STORE_SCOPE_MISMATCH` / `GI_LAYER_STALE` / `GI_LAYER_UNCONSUMED`) — NEVER `rows=0`,
NEVER ALLOW+warn. An empty answer and a wrong-scope answer are INDISTINGUISHABLE unless you
make them distinguishable.
```

---

# §3 · ★ BLOCK B — THE `RULES.md` ADDITIONS (non-decaying invariants, paste after rule 7)

**These are sticky on every request. They are the invariants that decay least.**

```
8. **The dist is the artifact.** A source file is not delivered until its symbols are in
   the binary the runtime loads. Every wave's terminal deliverable is the ARTIFACT, not a
   file. Verify with `sha256sum <dist>` AND a symbol grep — or report UNBUILT.

9. **The subject of verification is the thing that runs.** A test that never loads the
   deployed artifact cannot fail on the artifact. Label every verification
   SOURCE-UNIT | LIVE-ARTIFACT | CONTAINER. An unlabeled test's result is ambiguous.

10. **Every check records the SHA it ran against, and the SHA must match the build's.**
    A container/host/checkpoint PASS without the sha-match is a verdict about an unknown
    binary. A checkpoint's NAME is proven by its BINARY, never by its manifest.

11. **A gate that cannot BLOCK is not a gate.** A "BLOCKED" dependency is a TASK to start,
    never a verdict to ship past. A warning is documentation. Only an exit code is a gate.

12. **Prevention is a MECHANICAL PREDICATE, never an instruction.** "Wire X" is skippable.
    "X is UP iff consumers>=1, else NAMED_ERROR" is not. If nothing exits nonzero when the
    error recurs, it is documentation.

13. **The scope is the operator's.** A build delivering fewer components is a FAILED build,
    not a smaller scope. Never re-specify a smaller target and call it the plan.

14. **Read the existing specs before authoring.** An existing spec is the operator's prior
    analysis. A build's own post-mortem is the highest-value artifact in the project —
    quote its root cause VERBATIM. Re-deriving it is the waste.

15. **A layer is UP iff its fact changed a verdict.** Existence ≠ intelligence. A register
    counting FILES is worthless; the count that matters is CONSUMED. A substrate is an
    INPUT, never a precondition.

16. **No silent fallbacks.** A missing substrate returns a NAMED, LOUD refusal — never a
    `rows=0` that reads as "nothing there", never ALLOW+warn.
```

---

# §4 · ★ BLOCK C — THE TTSR RULES (the theatre-killers, LIVE FILES)

**These are the mid-stream aborts. Each is a real file at `~/.omp/agent/rules/<name>.md`.
TTSR matches the STREAM (text + thinking), ABORTS MID-TOKEN, and re-injects.**

**THE FORMAT (proven live in `rules/allowed-models.md`):**
```
---
description: "<what it catches — an ACTION, never a mention>"
condition:
  - '<regex 1>'
  - '<regex 2>'      # OR-ed; no native negation -> write ACTION VERB + OBJECT frames
scope: [text, thinking]
interruptMode: always
---
```

## RULE 1 · `dist-not-built.md` — THE UNBUILT DELIVERY (F-95, the master act)

```markdown
---
description: "Catches CLAIMING a build/feature complete when the artifact was not rebuilt — the claim without the dist. An ACTION (a completion claim), never a mention."
condition:
  # A completion claim + a build/feature noun
  - '(?i)\b(build|feature|module|kernel|layer|fix|change|implementation|system)\b[^.]{0,40}\b(is )?(done|complete|completed|finished|shipped|working|ready|green|passing)\b'
  - '(?i)\b(done|complete|completed|finished|shipped|ready to ship|production ready|all green|everything (works|passes))\b[^.]{0,40}\b(build|feature|module|kernel|layer|system|implementation)\b'
  # THE BYPASS FRAMES (the explicit theatre)
  - '(?i)\b(no need to (rebuild|redeploy)|skip the (build|rebuild)|the (dist|bundle) is fine|already (built|deployed))\b'
  # THE FALSE-CEILING FRAME (declaring a limit instead of finishing)
  - '(?i)\b(build|wire|do) (a|the) (2|two|3|three|partial|subset|first) (layers?|modules?|components?) (that work|only|first)\b'
scope: [text, thinking]
interruptMode: always
---
```

**WHY THIS SHAPE:** TTSR has no negation, so a bare "done" would fire on every reply. The
rule requires **a completion claim ADJACENT to a build noun** — an action frame, not a noun.
The bypass frames catch the explicit skip. The false-ceiling frame catches the scope shrink.

## RULE 2 · `theatrical-verification.md` — THE FORM WITHOUT THE SUBSTANCE (TL-95, TH-95)

```markdown
---
description: "Catches THEATRICAL verification claims — a PASS/verified claim that names no artifact, no sha, no tool result. An ACTION (claiming), never a mention."
condition:
  # a verification claim with no artifact evidence nearby
  - '(?i)\b(verified|validated|tested|confirmed|proven|checked)\b[^.]{0,30}\b(works?|passing|passes|green|correct|fine|good)\b'
  - '(?i)\b(the )?(tests?|suite|battery|container|host)\b[^.]{0,30}\b(all )?(pass|passed|passing|green|succeed|succeeded)\b'
  # the specific theatrical tells
  - '(?i)\b(structural(ly)? (pass|green)|pass by design|source[- ]inspection|asserted the behavior|it should work|trust me)\b'
  - '(?i)\b(no bugs? found|zero (bugs?|defects?|issues?))\b'
  - '(?i)\b(looks (correct|right|good)|seems (correct|fine|right))\b'
scope: [text, thinking]
interruptMode: always
---
```

**WHY:** `structural pass`, `pass by design`, `zero bugs found`, `it should work`, `looks
correct` are the measured theatrical tells (TH-01..TH-25). Each is a claim with no artifact.

## RULE 3 · `scope-shrink.md` — THE SCOPE LAW (the operator's ruling R1)

```markdown
---
description: "Catches SHRINKING the operator's scope — proposing to build fewer components, or declaring a smaller target as the plan. An ACTION (re-scoping), never a mention."
condition:
  - '(?i)\b(let'?s |we (should|could|can) |i'?ll )?(just |only )?(build|do|wire|implement|focus on) (the )?(first|2|two|3|three|partial|subset|core|minimal)\b'
  - '(?i)\b(start (with|small)|smaller scope|reduce the scope|narrow (the |it )?(scope|down)|scope (is )?too (big|large)|too ambitious)\b'
  - '(?i)\b(honest ceiling|the choice:|build a [0-9]-layer)\b'
scope: [text, thinking]
interruptMode: always
---
```

## RULE 4 · `fallback-slop.md` — THE NO-FALLBACK LAW (AB-5, S-1..S-9)

```markdown
---
description: "Catches proposing or accepting a SILENT FALLBACK — a substitute result presented as success, an ALLOW on a missing substrate, a rows=0 read as an answer. An ACTION, never a mention."
condition:
  - '(?i)\b(fallback|fall ?back|degrade|degraded|graceful(ly)? (degrade|fail)|best[- ]effort|best we can|good enough)\b[^.]{0,40}\b(instead|substitute|otherwise|if (it|that) fails)\b'
  - '(?i)\b(cancel\s*[:=]\s*false|allow\b.{0,20}\bwhen (no|missing)|return(s|ing)? (an )?empty|rows\s*[:=]\s*0\b)[^.]{0,30}\b(ok|fine|normal|expected|correct)\b'
  - '(?i)\b(regex|native[- ]?ast|simple (scan|parser|indexer)) (fallback|instead|as a fallback)\b'
scope: [text, thinking]
interruptMode: always
---
```

## RULE 5 · `phantom-and-claim.md` — THE PHANTOM + THE PROSE CLAIM (AR-01, AR-36)

```markdown
---
description: "Catches a completion claim with no artifact, and a claimed change with no disk diff. An ACTION (claiming), never a mention."
condition:
  - '(?i)\b(i (have |just )?(done|finished|completed|written|created|built|fixed|applied))\b[^.]{0,40}\b(and|now|so)\b[^.]{0,20}\b(it|that|this|the)\b[^.]{0,20}\b(works?|passes|is (done|fixed|ready))\b'
  - '(?i)\b(verified|tested|confirmed)\b[^.]{0,20}\b(and|,) (it )?(works?|passes|is (fine|correct|green))\b'
  - '(?i)\b(applied|landed|committed|deployed) the (fix|change|update)\b[^.]{0,30}\b(and|,)?\s*(it|that)?\s*(works?|should|passes)\b'
scope: [text, thinking]
interruptMode: always
---
```

## RULE 6 · `instruction-not-predicate.md` — THE PREDICATE LAW (D4, L3)

```markdown
---
description: "Catches a PREVENTION stated as an instruction instead of a mechanical predicate — a rule with no exit condition. An ACTION (authoring a fix), never a mention."
condition:
  - '(?i)\b(we (should|must|need to)|i('?ll| will)|let'?s) (just )?(make sure|ensure|remember to|be careful|always|never)\b'
  - '(?i)\b(the (fix|solution|plan) is to|to (fix|prevent|solve) (this|it),? (we )?(just )?(need to|must|should))\b'
  - '(?i)\b(add a (check|warning|reminder|note|comment) (that|to))\b'
scope: [text, thinking]
interruptMode: always
---
```

**WHY:** "remember to", "be careful", "add a warning", "we should ensure" are the
instruction-form fixes that were skipped for 7 passes. The rule fires on the FORM.

## RULE 7 · `stale-instrument.md` — THE STALE SERVE (AB-2, T-18, GT-3)

```markdown
---
description: "Catches ANSWERING from a substrate without asserting its freshness, and claiming a graph/index answer without a scope check. An ACTION (answering), never a mention."
condition:
  - '(?i)\b(the (graph|store|index|database|substrate)) (says?|shows?|reports?|contains?|has)\b[^.]{0,40}\b(no|none|zero|nothing|0)\b'
  - '(?i)\b(no (callers|edges|nodes|results|matches) (found|exist)|(it|there) (has|have) no (callers|edges|dependents))\b'
scope: [text, thinking]
interruptMode: always
---
```

**WHY:** `rows=0` read as "no callers" was the root of 7 derailments. This fires on the
ANSWER, forcing the scope/freshness check.

---

# §5 · ★ BLOCK D — THE EXTENSION (the mechanical block — GT-1 + GT-4 + GT-7)

**The TTSR rules abort the STREAM. The extension BLOCKS the TOOL CALL. Both are required:
TTSR catches the PROSE claim, the extension catches the TOOL act.**

```ts
// ~/.omp/agent/extensions/gi-gates/index.ts — register in config.yml extensions:
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { readFileSync, existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";

const LEDGER = process.env.GI_AUDIT_LEDGER ?? `${process.env.HOME}/.omp/agent/state/audit-ledger.json`;

export default function giGates(pi: ExtensionAPI): void {
  // -- GT-1 THE AUDIT GATE (the goal-completion sink) ----------------------
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "goal") return undefined;
    if ((event.input as any)?.op !== "complete") return undefined;
    let row: any = null;
    try { if (existsSync(LEDGER)) row = JSON.parse(readFileSync(LEDGER, "utf8")).at(-1); } catch {}
    if (!row || row.verdict !== "PASS") {
      return { block: true, reason:
        `AUDIT GATE: ${row?.verdict ?? "ABSENT"} — run the code audit and record ` +
        `AUDIT GATE: PASS in ${LEDGER} before completing the goal. ` +
        `Summary: ${row?.summary ?? "no audit recorded"}.` };
    }
    return undefined;
  });

  // -- GT-4 THE DEPLOY GATE (src newer than the dist) ----------------------
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "goal" || (event.input as any)?.op !== "complete") return undefined;
    const cwd = process.cwd();
    try {
      const newer = execSync(
        `find src -name '*.ts' -newer extensions/graph-intelligence/index.js 2>/dev/null | wc -l`,
        { cwd, encoding: "utf8" }).trim();
      if (Number(newer) > 0) {
        return { block: true, reason:
          `DEPLOY GATE: ${newer} source file(s) are NEWER than the deployed dist. ` +
          `REBUILD + REDEPLOY before claiming completion. The dist is the artifact.` };
      }
    } catch { /* not a GI project — pass through */ }
    return undefined;
  });

  // -- GT-7 THE PREFLIGHT GATE (probe on boot) ----------------------------
  pi.on("session_start", async () => {
    try {
      const dist = `${process.cwd()}/extensions/graph-intelligence/index.js`;
      if (existsSync(dist)) {
        const m = statSync(dist).mtime.toISOString();
        pi.appendEntry?.({ type: "gi-preflight", distMtime: m });
      }
    } catch {}
  });
}
```

**WIRING (`~/.omp/agent/config.yml`):**
```yaml
extensions:
  - ~/.omp/agent/extensions/gi-gates/index.ts
```
**★ THE 30s BUDGET CAVEAT:** the handler must NOT run an audit inline. It reads the LEDGER
(pre-computed out-of-band). A full audit run is ~1m25s; the handler budget is 30s.

---

# §6 · ★ BLOCK E — THE AGENT DEFINITIONS (the enforcement desks)

**`outputSchema` is the native structured-output gate. An enforcement agent CANNOT return
prose — the schema rejects it.**

```markdown
---
name: artifact-auditor
description: "Zero-trust auditor. Verifies a completion claim against the ARTIFACT — never the source. Returns structured verdicts. Use when any agent claims done."
tools: read, grep, glob, bash
model: @smol
output:
  type: object
  required: [artifact_exists, dist_sha, src_newer_than_dist, symbols_present, verdict]
  properties:
    artifact_exists:      { type: boolean }
    dist_sha:             { type: string }
    src_newer_than_dist:  { type: integer }
    symbols_present:      { type: array, items: { type: string } }
    symbols_missing:      { type: array, items: { type: string } }
    verdict:              { enum: [VERIFIED, REFUTED, BLOCKED] }
    refutations:          { type: array, items: { type: string } }
---

You verify a completion claim against the ARTIFACT. You never trust prose.

MANDATORY CHECKS (run every one, paste the output):
1. `sha256sum <dist>` — record the sha.
2. `find src -name '*.ts' -newer <dist> | wc -l` — MUST be 0.
3. for each symbol the claim names: `grep -c <symbol> <dist>` — MUST be > 0.
4. `grep -l "<dist-path>" tests/*.test.ts | wc -l` — MUST be >= 1.
5. if a container result exists: `jq -r .distSha <results>` == the build's sha.

VERDICT RULES:
- any check fails -> REFUTED, with the exact command + output as the refutation.
- a check cannot run -> BLOCKED, with the reason. NEVER VERIFIED on a skipped check.
- ALL pass -> VERIFIED.

NEVER return VERIFIED without the pasted output for every check.
```

```markdown
---
name: theatre-hunter
description: "Adversarial scanner for THEATRE — a test that cannot fail, a verdict without a sha, a checkpoint whose name its binary contradicts, a claim with no artifact. Use before any ship."
tools: read, grep, glob, bash
model: @smol
output:
  type: object
  required: [theatrical_acts, verdict]
  properties:
    theatrical_acts:
      type: array
      items:
        type: object
        required: [class, evidence, file]
        properties:
          class:    { enum: [T-20, T-21, T-22, T-23, T-24, T-25, CLASS_A_G] }
          evidence: { type: string }
          file:     { type: string }
    verdict: { enum: [CLEAN, THEATRICAL, BLOCKED] }
---

You hunt THEATRE: the FORM of verification without its SUBSTANCE.

THE SEVEN THEATRICAL CLASSES — grep each, report every hit:
A FIXTURE SUBSTITUTE    a suite named for a live proof, driven by fixtures
B ENCODES THE DEFECT    a test asserting the bug as the contract
C SOURCE-STRING         `.includes("Sym")` called a wiring proof
D UNWIRED-MODULE        a test of a module nothing imports / not in the artifact
E SHAPE-ONLY            an assertion of a shape, not an effect
F INFLATED COUNT        N from N firings, no resolutions
G STUB ALIAS            a stub tested under a second name

THE DETECTORS (run all, paste output):
  grep -l "mkdtemp\|stubJudge\|aFire()" tests/*.test.ts
  grep -nE '\.includes\("[A-Za-z]+"\)' tests/*.test.ts
  grep -l "<dist-path>" tests/*.test.ts | wc -l          # 0 = T-23
  jq -r .distSha <container-results> ; sha256sum <dist>   # mismatch = T-21
  for c in Checkpoints/*/; do grep -c <v2-symbol> "$c/dist/index.js"; done  # 0 = T-22

Report ONLY acts with mechanical evidence. No evidence = not a finding.
```

---

# §7 · THE MAPPING TABLE (every failure/theatrical item -> its killer)

```
+------+----------------------------------+---------------+------------------------------+
| ID   | THE FAILURE                      | THE NATIVE    | THE KILLER                   |
+------+----------------------------------+---------------+------------------------------+
| F-95 | THE UNBUILT DELIVERY             | TTSR + RULES  | dist-not-built.md + rule 8   |
| T-20 | (the same, ledger-level)         | RULES + EXT   | rule 8 + the DEPLOY GATE     |
| T-21 | THE VERDICT-WITHOUT-SHA          | RULES + AGENT | rule 10 + artifact-auditor   |
| T-22 | THE MISLABELED CHECKPOINT        | RULES + AGENT | rule 10 + theatre-hunter     |
| T-23 | THE SOURCE-SUBJECT SUITE         | RULES + TTSR  | rule 9 + theatrical-verif.   |
| T-24 | THE CONSISTENCY-AS-CORRECTNESS   | RULES + AGENT | rule 10 + artifact-auditor   |
| T-25 | THE BLOCKED GATE                 | RULES + DOCTR | rule 11 (a gate must BLOCK)  |
| T-16 | THE RITUAL QUERY                 | TTSR          | stale-instrument.md          |
| T-17 | THE HAND-DERIVED FINDING         | DOCTRINE      | the LIVE-STATE LAW           |
| T-18 | THE STALE INSTRUMENT             | TTSR + RULES  | stale-instrument.md          |
| T-19 | THE UNWIRED GRAPH                | DOCTRINE      | the LIVE-STATE LAW           |
| AB-1 | THE SILENT ABSENCE (rows=0)      | TTSR + RULES  | stale-instrument.md + rule 16|
| AB-5 | THE SILENT FALLBACK              | TTSR + RULES  | fallback-slop.md + rule 16   |
| AP-3 | THE PROSE CLAIM                  | TTSR          | phantom-and-claim.md         |
| AP-5 | THE CATEGORY ERROR               | DOCTRINE      | the LIVE-STATE LAW           |
| AA-1 | THE REGISTER-WITHOUT-CONSUMERS   | RULES         | rule 15                      |
| AA-2 | THE FILE-ORGANIZED WAVE          | DOCTRINE      | the ARTIFACT LAW             |
| AA-3 | THE LIGHT-SWITCH LAYER           | RULES         | rule 15                      |
| G-1-8| THE GOAL-LOOP FLAWS              | EXT           | the AUDIT GATE + DEPLOY GATE |
| G-9  | THE CALLEE-FIX-WITHOUT-CALLSITE  | RULES         | rule 9 (subject = the caller)|
| L1   | DOC-AFTER-DOC ABOUT THE STATE    | TTSR          | instruction-not-predicate.md |
| L2   | THE SYMPTOM DIAGNOSIS            | DOCTRINE      | the READ-FIRST LAW           |
| L3   | THE INSTRUCTION-FORM FIX         | TTSR          | instruction-not-predicate.md |
| L4   | THE FILE-ORGANIZED WAVE          | DOCTRINE      | the ARTIFACT LAW             |
| L5   | THE SCOPE SHRINK                 | TTSR          | scope-shrink.md              |
| L6   | THE POSITIVE-ONLY TEST           | RULES + AGENT | rule 9 + theatre-hunter      |
| L7   | THE PROSE ENFORCEMENT            | RULES         | rule 12                      |
| R2   | THE UNREAD PRIOR ANALYSIS        | DOCTRINE      | the READ-FIRST LAW           |
+------+----------------------------------+---------------+------------------------------+
* 28 MAPPED. EVERY ONE HAS A NATIVE HOME. ZERO NEW INFRASTRUCTURE.
```

---

# §8 · THE INSTALL (the exact commands, paste-ready)

```bash
# -- BLOCK A + B: the sticky doctrine (append to the live files) ---------------
cat >> ~/.omp/agent/APPEND_SYSTEM.md << 'GIEOF'
<the §2 content>
GIEOF
cat >> ~/.omp/agent/RULES.md << 'GIEOF'
<the §3 content>
GIEOF

# -- BLOCK C: the TTSR rules (the mid-stream killers) -------------------------
for r in dist-not-built theatrical-verification scope-shrink fallback-slop \
         phantom-and-claim instruction-not-predicate stale-instrument; do
  cat > ~/.omp/agent/rules/$r.md << 'GIEOF'
<the rule frontmatter + body>
GIEOF
done

# -- BLOCK D: the extension ---------------------------------------------------
mkdir -p ~/.omp/agent/extensions/gi-gates
cat > ~/.omp/agent/extensions/gi-gates/index.ts << 'GIEOF'
<the §5 extension>
GIEOF

# -- BLOCK E: the agents ------------------------------------------------------
cat > ~/.omp/agent/agents/artifact-auditor.md << 'GIEOF'
<the §6 agent 1>
GIEOF
cat > ~/.omp/agent/agents/theatre-hunter.md << 'GIEOF'
<the §6 agent 2>
GIEOF

# -- VERIFY (same turn, mechanical) -------------------------------------------
ls ~/.omp/agent/rules/*.md | wc -l                    # expect 8 (1 existing + 7)
grep -c "ARTIFACT LAW" ~/.omp/agent/APPEND_SYSTEM.md  # expect 1
grep -c "The dist is the artifact" ~/.omp/agent/RULES.md  # expect 1
```

---

# §9 · THE ADVERSARIAL PROOF (how to know the gates BITE)

```
FOR EACH TTSR RULE - the false-positive test AND the true-positive test:
  + the rule must NOT fire on a MENTION ("the docs say the dist is the artifact")
  + the rule MUST fire on the ACTION ("the build is done" with no sha in the turn)
* TTSR conditions are OR-ed with no negation - write ACTION-VERB + OBJECT frames only.

FOR THE EXTENSION - the block test:
  + goal({op:"complete"}) with no ledger -> BLOCKED with AUDIT GATE: ABSENT
  + goal({op:"complete"}) with a FAIL ledger -> BLOCKED with the reason
  + goal({op:"complete"}) with PASS + fresh dist -> ALLOWED

FOR THE AGENTS - the schema test:
  + artifact-auditor returns a bare sentence -> REJECTED by outputSchema
  + theatre-hunter returns a finding with no evidence -> REJECTED

* A GATE THAT HAS NEVER BEEN SHOWN TO BLOCK IS A DOCUMENTED WISH.
```

---

# §10 · THE RESIDUAL

```
WHAT THIS IS:      12 GI enforcements mapped onto 12 native surfaces, with paste-ready
                   content for the 5 blocks (APPEND_SYSTEM - RULES - TTSR x7 - EXT - AGENTS x2).
WHAT IS NOT DONE:  nothing is installed. NO code written (the standing order). The blocks
                   are content, not deployed.
THE RISK:          a TTSR rule with a too-broad regex fires on legit prose (the
                   allowed-models.md rewrite is the cautionary instance - a bare noun list
                   fired on an article title). EVERY rule needs the mention/action test.
THE ONE THING TO INSTALL FIRST: RULES 8 + 9 (the artifact + the subject). Two lines that
                   would have stopped 48 hours of waste.
```
