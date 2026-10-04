# W6 CONTAINER TEST PLAN — GI KERNEL V2.2 (runtime-grade, plan-first)
**Rig:** the `container-testing` tool · image omp-ct:master · container `omp-ct-gi20`
**Written:** 2026-09-26 (BEFORE any container interaction — the plan-first law)

## 1 · OBJECTIVE
Prove the V2.2 capability IN A CONTAINER ON A REAL PROJECT: the kernel self-populates a target's
graph, the register reads on the target's OWN scope, and a source-less target is a NAMED refusal —
NOT the 0/8 the script battery hid (D-3). This is the CAPABILITY PROOF (TIER 2); the script battery
is only the REGRESSION GUARD (TIER 1).

## 2 · TOOLS UNDER TEST (map every changed file + importer to a scenario)
| the changed surface | the scenario that covers it |
|---|---|
| scripts/gi-populate.ts (NEW) | S1, S2, S4 |
| src/hunter/profile/source-roots.ts (NEW) | S1, S2, S3 |
| src/omp/typed-write.ts + store-open.ts (build_root) | S2, S4, S5 |
| src/omp/adapters/jevk5.ts (NEW) + layer-consumption.ts | S3 |
| src/omp/claim-firewall.ts (NEW) | S6 |
| the deployed bundle extensions/graph-intelligence/index.js | ALL (the register reads it) |

## 3 · TEST SCENARIOS (each: input · tool · passToken · failToken · evidence · timeout · cleanup)
**S1 — a REAL multi-package project populates.** Input: a real pnpm-workspace project (e.g. a
clone of a 200+ file repo) at `/work/target`. Tool: `bun scripts/gi-populate.ts --target /work/target`.
passToken `POPULATE_OK` + the per-layer table all >0. failToken `GRAPH_EMPTY`. Evidence: the stdout
table + `.omp/graph-intelligence/` under the TARGET. timeout 600s. cleanup: none (inspect after).
**S2 — the register reads on the fresh project.** Input: the same target. Tool:
`bun scripts/consumption-audit.ts /work/target <a real symbol>`. passToken `consumed:8/8` OR a
per-layer `GI_LAYER_DOWN:`/`GI_LAYER_UNCONSUMED:`. failToken `GI_POPULATE_FAILED` on a target that
HAS sources. Evidence: the register line + the store's `gi_meta.build_root`. timeout 300s.
**S3 — the meaning gate names jevk5.** Input: the same target. Tool: the register | grep TSG.
passToken `jevk5` + the port (`:8090` or `:8008`). failToken `kev` as the SOLE evidence. Evidence:
the TSG line. timeout 120s.
**S4 — a SOURCE-LESS target refuses (D5).** Input: an empty dir. Tool:
`bun scripts/gi-populate.ts --target /work/empty`. passToken `GI_NO_SOURCE_ROOT:`. failToken
`GRAPH_EMPTY` (the wrong-path answer). Evidence: the refusal string + exit 1. timeout 120s.

## 4 · ADVERSARIAL (run FIRST, before the happy path)
**A1 — the WRONG-SCOPE read (D4).** Build a store for target A, then read with subject root B →
passToken `GI_STORE_SCOPE_MISMATCH:` (a NAMED refusal). failToken a confident row set (the
false-confidence class).
**A2 — the CROSS-SCOPE CONTAMINATION.** Populate A then B; assert B's store `build_root` == B and
A's unchanged — never one store serving both. failToken: identical `build_root` across the two.
**A3 — the FABRICATED CLAIM (D7).** Submit a done-shaped claim with no THIS-TURN span →
passToken `FABRICATED` + REJECTED. failToken: the claim accepted.
**A4 — the SOURCE-LESS TARGET (D5) as an adversarial probe** — a dir with only a `package.json`
and no `.ts` → must refuse, not emit an empty graph.

## 5 · EVIDENCE (the artifact that makes the claim valid)
`.trident/ct-results.json` with per-scenario `{id, passTokenMatch, failTokenAbsent, toolResultContext,
timedOut, byteOffset, verdict}` + the overall verdict. Screenshots of the TUI render. The container
name + the deployed dist sha. A claim with no artifact is VOID.

## 6 · PASS CRITERIA (all must hold before any ship claim)
S1-S4 + A1-A4 executed · every passToken matched IN A TOOL RESULT (not agent prose) · every failToken
absent · the results artifact written · the auth probe (a model-backed call) succeeded FIRST · the
container alive at the end. A GENERIC gate preempting a specific one = UNOBSERVED, never PASS.
