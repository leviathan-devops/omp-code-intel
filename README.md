# Graph Intelligence (GI) — the 6L+2E decision kernel

A **6-layer + 2-kernel graph intelligence substrate** for the OMP agent runtime. Every
decision the kernel makes is grounded in six typed graph layers and two judgment kernels,
each one **proven consumed** — not merely installed.

## The 6 layers + the 2 kernels

| the consumer | the rung | the substrate it reads |
|---|---|---|
| `L1_SEMANTICA` | decision | the semantica knowledge graph (precedent retrieval) |
| `L2_ARSUMBRIS` | knowledge | the au-engine's typed repo graph |
| `L3_UA` | context | the understand-anything graph |
| `L4_C2KG` | context | the code-to-knowledge-graph LSP index |
| `L5_CORBELL` | settlement | the parse-grade call/type graph (the PRIMARY settlement substrate) |
| `L6_GRAPHIFY` | settlement | the graphify extract (the SECOND settlement substrate) |
| `TSG` | meaning | the local **KEV-0.6b-ONNX** model — a decision model, not a generator |
| `ABIDE` | repair | the abide event ledger |

## What the kernel does

`gi-decide` runs a stage machine over the layer registry:

```
PREFLIGHT → CLASSIFY → BIND → DETECT → VERDICT → RECORD
```

- **PREFLIGHT** asks every layer; a DOWN layer refuses the stack with `GI_STACK_INCOMPLETE:<id>`.
- **DETECT** weighs the registry's **evidence** — the anchored facts each layer returns — against
  the dumb / theatrical / destructive detectors.
- **VERDICT** returns `ALLOW | STEER | REFUSE | ABORT` with the class it found.
- **RECORD** writes the decision to the fire ledger (`fire-decisions.db`) — the runtime record.

## The evidence discipline

The kernel's core law: **an unanchored claim is not a fact.** Every layer returns
`{consumer, rung, subject, value, source}` — a fact with its **evidence anchor** (the file, the
store row, the graph node). The registry DISCARDS any fact whose `source` is empty, so a layer
that answers without evidence contributes nothing.

`bun scripts/consumption-audit.ts <root> <subject> --gate` reports the register —
`consumed:N/8` — and **exits 1** when N is below the expected bar. The exit code IS the claim.

## The freshness gate (A3)

A settlement store carries a `populated_at` marker. Past its TTL the probe **throws**
`GI_LAYER_STALE` rather than serving a stale graph — a stale answer is worse than no answer.
Rebuild with:

```bash
bun scripts/corbell-build.ts --target <root> --rebuild   # L5
bun scripts/graphify-build.ts --target <root>            # L6
```

## The tools

| the tool | what it does |
|---|---|
| `gi-decide` | the full decision — the registry's facts through the kernel |
| `gi-consumption` | the register — which layers are consumed, with their evidence |
| `graph-query` | a typed graph query |
| `graph-probe` | a structural probe |
| `bug-hunt` | the black-hat hunt |
| `aether-code-audit` | the code audit |

## The tests

```bash
bun run test        # 391 pass / 0 fail — the *.test.ts default + the st-*.ts suites
bun run test:unit   # the *.test.ts default only
bun run test:st     # the st-*.ts suites (the explicit ./ path)
bun run test:goal   # the five DONE conditions, as a mechanical predicate
```

## The layout

```
src/omp/                the kernel — the stage machine, the registry, the decision
src/omp/adapters/       the 8 consumers (one file per substrate)
src/hunter/             the extraction + the graph build
scripts/                the CLIs — the audits, the builds, the probes
tests/                  the suites (the artifact-coverage suite MOUNTS the deployed bundle)
extensions/             the built dist — the artifact the runtime loads
```
