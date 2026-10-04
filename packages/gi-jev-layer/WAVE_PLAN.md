WAVES: 5

# WAVE PLAN — THE JEV DECISION LAYER (the gates route through the judge)

Authority: `PLAN-CLEANUP-JEV.md` (the DPL1-lite) + `reports/JEV_DECISION_LAYER_ShowMe.md` (the blueprint).
The mandate (verbatim): "ALL DECISION MAKING TO BE DOEN THROUGH JEV" · "everything needs to be recoverable".

## THE INTERFACE (lands in W1, before any implementer — the hydra-mode law)
```ts
// src/omp/jev.ts — THE ONE NEW EXPORT (the existing adapter, extended)
export type GateCandidate = { kind: "NONE" | "QUOTE_CONCAT" | "READ_VERB_HIJACK" | "SHELL_CHAIN" | "FORMAT_CONTROL"; signals: string[]; severity: "security" | "info" };
export type GateVerdict = { choice: "serve" | "refuse"; confidence: number; judge: string; ms: number };
export function askToolGate(candidate: GateCandidate, state: string): Promise<GateVerdict>;   // the Jev call
export function detectCandidate(command: string): GateCandidate;                              // the regex DEMOTED — no verdict
export function recordGateDecision(c: GateCandidate, v: GateVerdict): void;                   // the ledger row
```

## THE WAVES (parallel after W1 — DISJOINT file ownership)

| wave | owner | DISJOINT files | deliverable | the mechanical gate | the test ids |
|---|---|---|---|---|---|
| W1 | the interface desk | `src/omp/jev.ts` (the 3 exports only) | the interface + detectCandidate demoted from the regex; askToolGate on the LIVE judge | `bunx tsc --noEmit` exit 0 AND detectCandidate("") returns kind NONE | test_gate_detector_emits_candidates |
| W2 | the judge desk | `src/omp/adapters/jevk5.ts` + the calibration artifact | the Jev call wired (choice+criteria), the threshold DERIVED from the control set | a live call returns "choice" + a `confidence` (the verbatim reply) | test_gate_jev_decides_with_confidence |
| W3 | the policy desk | `pbk-v2/src/firewalls/semantic-smoke-firewall.ts` + `src/omp/extension.ts` | the 4 gates call askToolGate; the per-surface polarity; the refusal NAMES its remedy | `grep -rn "return 'inline_exec'" src/` = 0 (the regex cannot return a verdict) | test_gate_attack_blocks · test_gate_judge_down_polarity |
| W4 | the corpus desk | `scripts/gate-control-set.ts` (NEW — the 40 cases) | the control set: 10 attacks · 10 legit · 10 QUOTED-legit (incl. the operator's exact broken command) · 10 boundary | the runner exits 0 with 0 misfires AND the broken command PASSES verbatim | test_gate_quoted_legit_passes |
| W5 | the rig desk | `src/omp/extension.ts` (the load path) + the build script | the GI extension LOADS in the container (the typescript resolution) | 0 `Failed to load extension` on a fresh boot; the tools visible | test_extension_loads_in_rig |

Boundary checks: W1's interface is the ONLY cross-wave contract; W2-W5 consume it and never edit each other's files.
NEVER dispatch W2..W5 on a CLAIMED-complete W1 — the interface is verified (`tsc` exit 0 + the named test) first.

## THE ROUND-ZERO CHECKPOINT (before W1)
`Checkpoints/gi-kernel-v2.3-reflexive-kernel-4694b1323fcc6887/` — the current sealed baseline (the restore point).

## THE TERMINATION
The plan closes when W1..W5's gates are green AND the Jev ledger shows every gate verdict carrying
a judge call + a confidence AND the recoverability matrix (every refusal -> its named remedy -> the
work proceeds) is complete.

## THE ANTI-DERAIL (this tree's nouns)
1. a REGEX returning a verdict (the F-140 class) — the verdict belongs to the judge.
2. a misfire probe set narrower than the breaking shapes (the F-141 class) — quoted args, `&&` chains, `--flag "value"`, the exact broken command.
3. a deploy without a clean-boot verification (the F-142 class) — DEPLOYED-NOT-RUNNING.
4. a gate refusal with no named remedy — the recoverability law.
5. a container claim while the extension fails to load (the F-144 class) — VOID.

## THE ANTI-STOP (these never close the run)
- a green battery presented as the Jev wire (the battery predates the change).
- the judge's presence reported as the wire (the adapter existing is not the gate deciding).
- W1's interface landed reported as the plan complete.
- the container's DEAD-on-load state reported as PASS.
