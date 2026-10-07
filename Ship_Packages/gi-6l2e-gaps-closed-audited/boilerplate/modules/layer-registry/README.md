# BOILERPLATE — the 6L+2E layer-registry + the consumption predicate

The reusable machinery behind "which consumers actually contributed a fact?" — the pattern that turns
`up=11/11` (a health check on files) into `consumed:N/8` (which consumers CONTRIBUTED).

## The modules
| file | lines | role |
|---|---|---|
| `layer-registry.ts` | 315 | the `ConsumerProbe` contract (`id`/`rung`/`dependency`/`errorCode`/`up()`/`facts(subject)`) + the registry |
| `layer-consumption.ts` | 139 | `consumptionAudit(scopeRoot, subject)` — runs every probe's `facts()`, returns the per-consumer verdicts |
| `consumption-audit.ts` | 111 | the CLI predicate — `--gate` iterates the SUBJECT UNION; `--expect N` the raw count |
| `_shared.ts` | 264 | the probe helpers (`probePath`, `storeFacts`, …) |
| `c2kg.ts` | 96 | the L4 adapter (the context rung) — the null-parse guard, EDGES-FIRST, typed fields |
| `arsumbris.ts` | 172 | the L2 adapter (the knowledge rung) — the symbol/file-space read |
| `au-read.ts` | 131 | the au-engine framed wire client (the settled guard, the 64 MB frame cap) |

## The laws (verbatim from the source)
- **A substrate fault THROWS the named error, never `[]`.** `c2kg.ts`: `throw new Error("GI_LAYER_C2KG: …")`.
  A silent `[]` is indistinguishable from "healthy, zero facts" — the anti-false-green law.
- **Guard the CAST, not just the fields.** `JSON.parse(...) as T` is unchecked; normalize a non-object
  parse result to `{}` before any property read (the 2026-10-03 CRITICAL).
- **EDGES-FIRST.** A context rung's value is the RELATIONSHIP; `symbolFacts.concat(edgeFacts).slice(0,50)`
  let 50 symbols starve every edge (the 2026-10-03 CRITICAL).
- **`--gate` is the SUBJECT-UNION predicate.** No single subject is in all 8 domains; the goal's real
  condition is all 8 CONSUMED across the union of each consumer's own domain subjects.

## Provenance
Extracted from `Graph_Intelligence` @ `jarvis/gi-main` (HEAD `2a0682b` + the 2026-10-03 audit fixes).
The deployed dist `879cbbf80b9d9682` carries these modules. What was LEFT OUT: the host-specific gate
stack (`pbk-v2/src/ext/*`) and the hunter/diagnostics subsystem (they are the source's own use-case layer).
