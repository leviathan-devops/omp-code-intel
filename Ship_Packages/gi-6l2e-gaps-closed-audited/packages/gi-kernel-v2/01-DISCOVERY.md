# 01 — DISCOVERY (measured, not remembered)

Everything below was measured on this host in this session. Nothing is estimated.

## THE LANDING ZONE

```
repo      /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
branch    jarvis/gi-main
HEAD      1889ef3cc34d2cda        (the compat-map commit)
runtime   bun 1.4.2 · node >= 22
```

## THE DELTA BUILT THIS SESSION (line counts via wc -l)

```
src/omp/typed-write.ts   1243 L   pre-existing 975 + the v2 store work
src/omp/kernel-v2.ts      390 L   NEW — STAGE 0..6 + the three detectors
src/omp/rsi.ts            440 L   NEW — the reflex store + VERIFIED RETIREMENT
src/omp/hard-deps.ts      220 L   NEW — the dependency register
src/omp/enforcement.ts    270 L   NEW — TSG + Abide, the two-layer kernel
────────────────────────────────
                        2563 L   the v2 source delta
```

## THE TESTS (all NEW this session)

```
tests/st-gi-store.test.ts       211 L   11 tests
tests/st-gi-v2-gate.test.ts     192 L   14 tests
tests/st-gi-v2-kernel.test.ts   199 L    8 tests
tests/st-gi-v2-deps.test.ts     146 L   11 tests
tests/st-gi-v2-enforce.test.ts  170 L   16 tests
──────────────────────────────────────────
                                918 L   60 tests
```

## THE MEASURED GATES (this session, verbatim)

```
full battery     194 pass / 0 fail / 688 expect / 19 files [1309ms]
typecheck        191 errors == the pre-existing baseline, 0 new
gate suite       st-gi-graph-gate 12 pass (v1.3, unchanged — SC-1's first half)
```

## THE LIVE STORE (the real artifact the kernel reads)

```
path      <scope>/.omp/graph-intelligence/sessions/gi-baseline000000000000/store.sqlite
size      2,007,040 B
nodes     1266 live   (Function 1000 · File 266)
edges     2713 live   (declares 1283 · calls 842 · imports 575 · implements 14)
layers    1 of 6 populated — all `graphify:`
confidence  ONE distinct value (1.0)   ← the B1 defect, now fixed at the writer
populated 2026-09-19T12:31:09Z         ← 2 days stale at read time (the B3 defect)
```

**After the W1 migration (executed live):**
```
[gi-omp] DDL MIGRATION: added typed_nodes.layer_id, typed_edges.layer_id, typed_edges.derivation
live nodes: 1266 | layer_id NULL: 0 | by layer: [{"layer_id":"graphify","n":1266}]
FRESHNESS: {"stale":true,"code":"GI_LAYER_STALE:explicit",
            "ageMs":128234269,"ttlMs":86400000}
```

## THE REGISTER AUDIT (what is actually UP on this host)

```
ok=false  down=6/11  firstCode=GI_LAYER_SEMANTICA
  DOWN L1_SEMANTICA / L2_ARSUMBRIS / L3_UA / L4_C2KG / L5_CORBELL   (ENOENT)
  UP   L6_GRAPHIFY   graphify-out/graph.json (14,085,516 B)
  UP   TSG (dir) · ABIDE (dir) · RSI_STORE (dir) · GI_STORE_DIR (dir)
  DOWN JEV           TYPESAFE_AI_API_KEY ABSENT
```

**Read this honestly:** with the register live, the v2 stack REFUSES every act with
`GI_STACK_INCOMPLETE:...`. That is the T-6 law working as written — and it names the real
blocker for the live end-to-end: **no TypeSafe key, and TSG is an unbuilt Rust CLI.**

## WHAT I DID NOT READ

```
· the semantica source beyond its README + ARCHITECTURE.md
· c2kg's Kotlin/ANTLR internals (docs/queries.md + programming_constructs.md only)
· UA's 30+ docs under docs/superpowers/specs + plans
· the Abide compile pipeline (Abide_abide-compile_SKILL.md, 13,286 B)
· arsumbris' Rust crates beyond the README/au-engine/au-mcp docs
```

## VARIANT LINEAGE

```
no competing variants for the v2 modules — they are NEW this session.
the v1.3 lineage remains sealed in SHIP_PACKAGES/Graph_Intel_v1.3 (dist 83eb7bba9c5e76db).
```

## CONSTRAINTS DISCOVERED

```
· openTypedStore REFUSES a symlinked store path (W24) and enforces a session-path regex:
  /sessions/[A-Za-z0-9_-]{8,24}/store.sqlite — fixtures must use sessionStorePath()
· applyTypedDdl's error contract is TESTED with a db double implementing `run` alone:
  a new step that introspects must REPORT a skip rather than throw
· ripwire is cwd-jailed (a path escaping cwd is denied); cwd here is a worktree of a
  DIFFERENT repo, so a cwd-relative symlink to the GI repo is the compliant map path
· bun:sqlite returns snake_case columns; a domain type in camelCase needs an explicit mapper
```
