# GI KERNEL V2.2 — THE REBUILD SPEC (self-populating · root-asserting · GPU-judged)

**Series:** GI-Kernel-V2.2 (the rebuild after the operator's 2026-09-25 rejection)
**Date:** 2026-09-25 · **Baseline:** HEAD 75d2586 · dist 3595ff900bf6581b (752 KB)
**Authority:** this spec + `GI_KERNEL_V2.2_MASTER_BLUEPRINT.md`
**class:** system (the GI kernel's V2.2 rebuild — an infra spine, not a library)
**Mission:** make the 6L+2E kernel build its graph FROM ANY TARGET, keep it correctly scoped, judge
with JevK5 on the GPU, and BLOCK hallucinated completion — so the operator can deploy it immediately.

---

## §0 THE ONE-PARAGRAPH PROBLEM

The kernel is a demo that works on exactly one codebase: its own repo, because that repo carries
pre-built stores. On any other target it reads `consumed:0/8` with every layer DOWN, and the build
itself fails `GRAPH_EMPTY` because it assumes `<target>/src`. Worse, two of the stores it DOES carry
describe trees that no longer exist (`/tmp/corbell-scoped`, a Checkpoints archive) — so the `7/8` it
reports is real data about dead things. And the half of the architecture that is supposed to BLOCK
(the L2 claim firewall) was never built, while the model that should judge (JevK5-4b, live on the GPU
at `:8008`/`:8090`) is unwired, and the meaning gate runs a 0.6B CPU model instead.

**THE FIX, IN ONE SENTENCE:** make the graph a *function of the target* — discover the target's
source roots, build its stores into its own scope, assert the build root in every store, judge with
the GPU model, and refuse loudly when any of that is impossible.

---

## §1 THE MEASURED EVIDENCE (every claim below traces here)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  E1  THE GHOST STORES                                                     │
│    corbell store:  9,565 nodes / 29,541 edges                             │
│      gi_meta: corbell_checkout = "corbell-build-mugf4ml8"                 │
│      nodes point at: /tmp/corbell-scoped/src/kernel/graph-gate.ts         │
│      /tmp/corbell-scoped  →  GONE                                         │
│      SELECT COUNT(*) FROM typed_nodes WHERE file LIKE 'src/%'  →  0       │
│    graphify store: 40.5 MB                                                │
│      nodes point at: …/Checkpoints/gi-gatefail-pre-v20/…                  │
│                                                                           │
│  E2  THE NON-REPRODUCIBLE 7/8                                             │
│    the GI repo carries: .omp/graph-intelligence 90M · corbell-checkout    │
│      16M · graphify-checkout 39M · layers/semantica 6.8M · .c2kg 28K ·    │
│      .ua 3.2M                                                             │
│    a fresh project carries: NONE of them                                  │
│                                                                           │
│  E3  THE REAL RUNTIME TEST (container omp-ct-gi20, 222-file real project) │
│    graph-probe        → PROBE_TOOL_OK                                     │
│    graph-query        → rows=0 · reason=GI_POPULATE_FAILED:               │
│                          CORBELL_NOT_WARM:absent                          │
│    gi-consumption     → consumed:0/8 · ALL 8 LAYERS GI_LAYER_DOWN         │
│                                                                           │
│  E4  THE HOST BUILD on a real target                                      │
│    corbell: "✗ NOT FOUND understand-anything → …/Understand-Anything/src" │
│    GRAPH_EMPTY: corbell graph build produced zero nodes                   │
│    (that project's sources live in understand-anything-plugin/packages/*/src)│
│                                                                           │
│  E5  THE MISSING L2                                                       │
│    grep -rln "claim.firewall|ClaimFirewall" src/  →  EMPTY                │
│    the blueprint: "WHERE: JARVIS/extension/jev-claim-firewall             │
│                    (DESIGN, NOT BUILT)"                                   │
│                                                                           │
│  E6  THE ABIDE LEDGER READ                                                │
│    adapters/abide.ts:212  tailEvents(.abide/events.jsonl, 4000)           │
│    the spec: "Abide asks Jev one question per model rule against the DIFF"│
│                                                                           │
│  E7  JEVK5 ON GPU, UNWIRED                                                │
│    pid 2486 llama-server -m jevk5-4b-Q8_0.gguf :8008 (5128 MiB VRAM)      │
│    pid 8433 systemone-server.py :8090 → {"ok":true,                       │
│              "model":"jevk5-4b-v0.2-Q8_0","runtime":"gguf"}               │
│    grep -rn "8008|8090|jevk5" src/ scripts/  →  0                         │
│    adapters/kev.ts:22  KEV_MODEL = "onnx-community/kev-0.6b-ONNX" (CPU)   │
│                                                                           │
│  E8  THE TESTING GAP                                                      │
│    st-gi-6l2e.test.ts 28 pass · st-gi-v2-enforce.test.ts 16 pass          │
│    BOTH are script tests against the GI repo's OWN stores. Neither runs   │
│    the graph on a real codebase.                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## §2 THE DEFINITION OF DONE (mechanical, command-checkable)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  D1  A FRESH PROJECT POPULATES                                            │
│    cmd:  bun scripts/gi-populate.ts --target <fresh-project>              │
│    pass: exit 0 AND the target's .omp/graph-intelligence/ gains a store   │
│          with >0 nodes AND gi_meta.build_root == the target's realpath    │
│                                                                           │
│  D2  THE REGISTER READS ON THE FRESH PROJECT                              │
│    cmd:  bun scripts/consumption-audit.ts <fresh-project> <real-symbol>   │
│    pass: consumed:8/8  OR  every non-consumed layer names its reason      │
│          (GI_LAYER_DOWN:<component> or GI_LAYER_UNCONSUMED:<domain>)      │
│                                                                           │
│  D3  THE GI REPO'S 7/8 IS REPRODUCIBLE, NOT CARRIED                       │
│    cmd:  rm -rf .omp/graph-intelligence .c2kg .ua && gi-populate --target .│
│    pass: the register re-reads >= 7/8 from a FRESH build                  │
│                                                                           │
│  D4  A WRONG-SCOPE READ IS A NAMED REFUSAL                                │
│    cmd:  gi-query who-calls <symbol> --scope <project-B>  (store from A)  │
│    pass: GI_STORE_SCOPE_MISMATCH: store built for A, subject root is B    │
│                                                                           │
│  D5  A SOURCE-LESS TARGET IS A NAMED REFUSAL                              │
│    cmd:  gi-populate --target <dir-with-no-sources>                       │
│    pass: GI_NO_SOURCE_ROOT: no source root discovered under <dir>         │
│          (never GRAPH_EMPTY after a wrong-path attempt)                   │
│                                                                           │
│  D6  THE MEANING GATE USES JEVK5 ON GPU                                   │
│    cmd:  bun scripts/consumption-audit.ts . <symbol>  | grep TSG          │
│    pass: the TSG evidence line names jevk5 + the :8090 (or :8008) port    │
│                                                                           │
│  D7  THE CLAIM FIREWALL BLOCKS                                            │
│    cmd:  a fabricated completion claim ("523 tests pass" with no span)    │
│    pass: FABRICATED — no tool-result span bound; the turn is REJECTED     │
│                                                                           │
│  D8  ABIDE JUDGES LIVE                                                    │
│    cmd:  a diff that violates a compiled rule                             │
│    pass: a repair verdict derived from a LIVE judge call on THIS diff,    │
│          not a row read from events.jsonl                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## §3 THE WORK — W1..W6 (each with its mechanism, files, and gate)

### W1 — PURGE THE GHOST STORES (delete, don't patch)

**WHY:** E1 — two stores describe dead trees. A store that describes a tree that does not exist is
worse than no store: it answers with confidence about nothing.

**WHAT:**
```
  rm -rf .omp/graph-intelligence/corbell-checkout/store.sqlite
  rm -rf .omp/graph-intelligence/graphify-checkout/store.sqlite
  rm -rf .omp/graph-intelligence/layers/semantica/kg.json     (0 entities — empty)
  KEEP   .ua/knowledge-graph.json    (real, correctly scoped: project=Graph_Intelligence, 4,884 nodes)
  REBUILD .c2kg/index.json           (182 shallow module names → rebuild at symbol depth)
```

**THE MECHANISM (why a purge and not a fix):** the stores carry no `build_root`, so their content
cannot be validated — only replaced. The rebuild (W2/W3) produces stores that CAN be validated.

**FILES:** the store paths above (data, not code).

**GATE (D3-partial):** after W2/W3, `gi-populate --target .` must regenerate all of them from the
repo's own sources.

### W2 — TARGET-DRIVEN SOURCE-ROOT DISCOVERY

**WHY:** E4 — the build assumes `<target>/src`. Real projects put sources anywhere:
`packages/*/src`, `apps/*/src`, `lib/`, a pnpm/yarn/npm workspace, a single `src/`.

**WHAT — a new module `src/hunter/profile/source-roots.ts`:**
```
  discoverSourceRoots(targetRoot: string): { roots: string[]; evidence: string } | { error: string }

  THE ALGORITHM (in order, first hit wins per candidate):
    1. the target's own profile (.omp/graph-intelligence/profile.yaml) `sources:` key — EXPLICIT WINS
    2. a workspace manifest (pnpm-workspace.yaml | package.json workspaces | lerna.json)
       → each glob's dir + `/src` if it exists
    3. tsconfig.json `include` / `files` → their common ancestor
    4. a conventional root that EXISTS and CONTAINS .ts files: src/ · lib/ · app/ · packages/*/src
    5. a bounded walk (depth ≤ 4) collecting every dir that contains ≥1 .ts and whose PARENT does
       not (the "root-most source dirs" heuristic)
    NO HIT → { error: "GI_NO_SOURCE_ROOT: no source root discovered under <target>" }  ← D5
```

**THE REFUSAL LAW (the anti-`GRAPH_EMPTY` law):** a build that finds no source root returns
`GI_NO_SOURCE_ROOT` with the target path and the candidates it tried. It NEVER proceeds to produce an
empty graph. **An empty graph is indistinguishable from a wrong-path graph; only a named refusal is
diagnosable.**

**FILES:**
```
  src/hunter/profile/source-roots.ts            NEW — the discovery
  src/hunter/profile/source-roots.test.ts       NEW — the matrix (pnpm / tsconfig / plain src / none)
  src/hunter/graph/corbell-adapter.ts:611       MODIFIED — use the discovery, not `<root>/src`
  scripts/corbell-build.ts                      MODIFIED — accept --source-root, default to discovery
  scripts/graphify-build.ts                     MODIFIED — same
  scripts/structural-extract.py                 MODIFIED — same
```

**GATE (D5):** a source-less target returns `GI_NO_SOURCE_ROOT`; `Understand-Anything` builds >0 nodes.

### W3 — CONTENT SCOPING (the store asserts its build root)

**WHY:** E1/E2 — the store's PATH is scoped but its CONTENT is not. A store built from tree A is
served as if it described tree B.

**WHAT:**
```
  1. EVERY store's gi_meta gains:
       build_root        = fs.realpathSync(targetRoot)      (the tree it was built from)
       build_root_sha    = sha256(the sorted file list + sizes + mtimes)   (the tree's identity)
       built_at          = ISO timestamp
       builder           = "corbell" | "graphify" | "structural" | "c2kg" | "ua" | "semantica"

  2. EVERY READ asserts:
       readBuildRoot = the store's gi_meta.build_root
       subjectRoot   = fs.realpathSync(the scopeRoot the caller passed)
       if (readBuildRoot !== subjectRoot) →
         throw GI_STORE_SCOPE_MISMATCH: store built for <readBuildRoot>, subject root is <subjectRoot>
       (the one exception: an explicit --allow-foreign-store flag for inspection tooling)

  3. THE SCOPE TIERS (adopt the boilerplate VERBATIM — no fork drift):
       TIER 1  explicit projectToken (existsSync-gated) → PINS
       TIER 2  the sticky session cache (never re-derives mid-session)
       TIER 3  auto-detect: the session's file activity → workdir anchors (×2) → the root scorer
       TIER 4  cwd (last resort)
```

**FILES:**
```
  src/omp/typed-write.ts                        MODIFIED — write build_root/build_root_sha to gi_meta
  src/omp/store-open.ts                         MODIFIED — assert build_root == subjectRoot on read
  src/scoping/scope-resolver.ts                 MODIFIED — re-sync to the boilerplate's 4 tiers
  src/scoping/scope-binding.ts                  MODIFIED — same
  src/scoping/db-path.ts                        MODIFIED — same
  src/scoping/scoped-store.ts                   MODIFIED — same
  src/scoping/session-state.ts                  MODIFIED — same
```

**GATE (D4):** a cross-scope read is a NAMED refusal.

### W4 — THE SELF-POPULATE PATH (the capability, proven)

**WHY:** E2/E3 — the kernel is not self-populating; its 7/8 is carried, not produced.

**WHAT — a new entry point `scripts/gi-populate.ts`:**
```
  gi-populate --target <dir> [--rebuild] [--layers <csv>]

  THE PIPELINE (each stage LOUD on failure, never a silent skip):
    1. discoverSourceRoots(target)                      → W2; GI_NO_SOURCE_ROOT on no hit
    2. for each layer in [corbell, graphify, structural, c2kg, ua, semantica]:
         a. run the layer's builder against the discovered roots
         b. write the store into {target}/.omp/graph-intelligence/...   ← THE TARGET'S SCOPE
         c. write gi_meta.build_root = realpath(target)                 ← W3
         d. verify: the store has >0 nodes; else GI_LAYER_BUILD_EMPTY:<layer>
    3. print the per-layer result table (layer · nodes · edges · store path · build_root)
    4. exit 0 iff EVERY requested layer built; else exit 1 with the named failures
```

**THE CRITICAL LAW:** the store is written into **the TARGET's** `.omp/graph-intelligence/`, never
the GI repo's. A build for target X that writes into Y's scope is the exact defect F-124 recorded.

**FILES:**
```
  scripts/gi-populate.ts                        NEW — the single entry point
  src/omp/populate.ts                           MODIFIED — route through it; no repo-root default
  src/omp/populate-graphify.ts                  MODIFIED — same
```

**GATE (D1/D2/D3):** a fresh project populates; the register reads 8/8 or NAMED reasons; the GI repo's
7/8 is reproducible after `rm -rf` + repopulate.

### W5 — THE JEV LAYERS (L2 built · ABIDE live · JevK5 wired)

**WHY:** E5/E6/E7 — the blocking half is absent, Abide reads a ledger, and the GPU model is idle.

**W5a — WIRE JEVK5 (the shift the operator ordered):**
```
  STEP 1  PROBE the contract (do NOT assume it matches kev-decide.ts):
    curl -s http://127.0.0.1:8090/v1/systemone -d '{"state":"…","questions":{"q1":{"type":"noul","instructions":"…"}}}'
    → record the EXACT request/response shape into the spec's appendix
  STEP 2  a new adapter client `src/omp/adapters/jevk5.ts`:
    - reads JEVK5_URL (default http://127.0.0.1:8090/v1/systemone)
    - the SAME ConsumerProbe contract (id "TSG", rung "meaning")
    - a health probe on :8008/health + :8090/health
    - a NAMED refusal when the server is down (GI_JEVK5_DOWN), never a silent empty
  STEP 3  layer-consumption.ts:75  →  jevk5Available ? jevk5Probe() : kevProbe() : tsgProbe()
  STEP 4  keep kev-decide.ts as the OFFLINE fallback (the no-GPU case), never the default
```

**W5b — ABIDE JUDGES LIVE (not the ledger):**
```
  the adapter gains a `judge(diff)` path:
    - on a write/edit, take the CURRENT hunk diff
    - compile the warhead-derived model rules (the blueprint §2.1's recipe)
    - call JevK5 per rule against the diff
    - band act (>=0.8) → the repair reason; band flag → a notice; clear → silent
    - FAIL-OPEN on a missing key/judge (the blueprint: "Abide fail-open on missing key")
  the events.jsonl read becomes the OFFLINE fallback (no live judge available)
```

**W5c — BUILD L2, THE CLAIM FIREWALL (the missing blocking layer):**
```
  from JevClaimFirewall_Blueprint.md, the complete design:
    DETECT   done-shaped text / goal.complete / child yield
    BIND     every claim atom → a THIS-TURN tool-result span
             no span → FABRICATED (no Jev needed — the span IS the proof)
             span present → Jev Choice: supports | contradicts
    DECIDE   FAIL-CLOSED: a claim without a bound span is REJECTED
    SURFACE  the OMP tool-result + stop hook (the same surface ABIDE uses)
  THE ONE LAW: "THE RUNTIME HOLDS THE GATE; THE MODEL CANNOT CLOSE ITS OWN TURN."
  THE POLARITY LAW (blueprint, verbatim): "Do not unify those polarities."
             ABIDE fail-OPEN · CLAIM FIREWALL fail-CLOSED
  FILES: src/omp/claim-firewall.ts (NEW) + its test + the hook wiring in extension.ts
```

**GATE (D6/D7/D8):** the TSG evidence names JevK5; a fabricated claim is REJECTED; a rule-violating
diff gets a LIVE judge verdict.

### W6 — THE HONEST TESTING REGIME (runtime, not script)

**WHY:** E8 — 44 passing script tests said nothing about the 0/8 on a real project.

**WHAT — three tiers, ALL mandatory before a ship claim:**
```
  TIER 1 SCRIPT   bun test (the existing battery)              — the regression guard
  TIER 2 CONTAINER the deployed dist in omp-ct-gi20, a REAL project, the tools driven through
                  the real registration path (the /tmp/realtest.mjs shape) — THE CAPABILITY PROOF
  TIER 3 HOST      the deployed plugin on the operator's machine against a real project — THE
                  DEPLOYMENT PROOF
  A claim may cite TIER 1 only for REGRESSION. Any capability claim ("the graph works") REQUIRES
  TIER 2, and any ship claim REQUIRES TIER 3.
```

**GATE:** the TESTING_LOG carries all three tiers for every capability claim.

---

## §4 THE EXECUTION ORDER (dependencies are real; do not reorder)

```
  W1 purge ──► W2 discovery ──► W3 content-scoping ──► W4 self-populate ──► D1/D2/D3 green
                                        │
                                        └──► W5a JevK5 ──► W5b ABIDE-live ──► W5c L2 firewall
                                                                                    │
                                                          W6 the 3-tier testing ◄────┘
```

**WHY THIS ORDER:** W2 without W1 rebuilds the ghost; W4 without W3 writes a store that cannot be
validated; W5 is independent of W1-W4 and can run in parallel from the start.

---

## §5 THE ANTI-PATTERNS (this design's failure classes + their detections)

| the failure class | the detection (mechanical) |
|---|---|
| a store describing a dead tree | `gi_meta.build_root` ≠ `realpath(subject)` → `GI_STORE_SCOPE_MISMATCH` |
| a hardcoded source-root assumption | a build on a workspace-shaped project returns `GRAPH_EMPTY` |
| a pre-built store masquerading as capability | `rm -rf` the stores, repopulate; the register must re-read |
| an empty graph from a wrong path | a build with no discovered root → `GI_NO_SOURCE_ROOT` (never empty) |
| a ledger read standing in for live judging | the adapter's verdict has no judge call in its trace |
| a GPU model installed but unwired | `grep -rn "<port>" src/` → 0 |
| a "blocking" layer that never blocks | a fabricated claim passes → the firewall is absent |
| a green script battery as a capability proof | the container run on a real project disagrees |
| an audit treadmill as the goal | the register on a real project is unchanged across N days |

---

## §6 THE OPEN DECISIONS (forks + defaults)

| # | the fork | the default | the ruling |
|---|---|---|---|
| 1 | the JevK5 request contract — assume it matches kev-decide.ts, or probe it? | **PROBE IT** | pending the probe (W5a step 1) |
| 2 | the store's `build_root` — realpath, or the declared token? | **realpath** (it is what the FS serves) | proposed |
| 3 | the L2 firewall's surface — the tool-result hook, or the stop hook, or both? | **both** (the blueprint names both) | proposed |
| 4 | ABIDE's live judge — per-edit or per-turn? | **per-edit** (the blueprint's §2.3) | proposed |
| 5 | the fallback when the GPU is down — KEV-CPU, or the remote TypeSafe key, or refuse? | **KEV-CPU** (the local chain) | proposed |
| 6 | whether to keep the GI repo's pre-built stores at all | **NO** — they must be reproducible (D3) | the operator's law |

---

## §7 THE RESIDUAL (what this spec does NOT settle)

1. **The JevK5 contract is unprobed.** W5a step 1 produces it; until then the adapter's request shape
   is a plan, not a fact.
2. **The `corbell` binary in a container.** The container lacked it; the container-testing rig must
   either bake it into the image or the populate must run on the host and copy the store in. This
   spec does NOT choose — it records the gap.
3. **The ABIDE live-judge latency.** The blueprint measures ~300ms per 13-rule check on the REMOTE
   Jev. JevK5 on the GPU is a different machine — the per-edit budget is unmeasured.
4. **The c2kg symbol-depth rebuild.** `code-to-knowledge-graph` produced 182 module names; the
   symbol-depth run is unexercised.
5. **The L2 firewall's false-positive rate.** A fail-CLOSED claim gate that rejects legitimate claims
   is worse than none; the rate is unmeasured.

---

## §8 THE HANDOFF

**The next artifact:** the master blueprint (`GI_KERNEL_V2.2_MASTER_BLUEPRINT.md`) — the guard against
derailment.
**The owner skill:** `build-package` (the dense package pipeline) → `trident-deep-planning` (the DPL1)
→ the wave plan.
**The first wave:** W1 + W5a in parallel (W1 is a delete; W5a is a probe — both are prerequisites for
everything else and neither blocks the other).

---

## §9 THE INTERFACE CONTRACTS (the new modules, exact signatures)

### §9.1 `src/hunter/profile/source-roots.ts` (NEW — W2)

```typescript
/** The discovered source roots + the evidence for the discovery (which rule fired). */
export interface SourceRoots {
  /** Absolute, realpath'd, de-duplicated, sorted. Never empty on success. */
  roots: string[];
  /** WHICH rule fired — the audit trail for why these roots. */
  evidence: string;
}

/** A named refusal — never an empty result dressed as success. */
export interface SourceRootError {
  error: string;   // "GI_NO_SOURCE_ROOT: no source root discovered under <target>"
  tried: string[]; // the candidates attempted, in order
}

/**
 * Discover the source roots of an arbitrary target.
 * The 5 rules, first-hit-wins per candidate; rule 1 (the explicit profile) always wins overall.
 * NEVER returns { roots: [] } — a no-hit is the SourceRootError.
 */
export function discoverSourceRoots(targetRoot: string): SourceRoots | SourceRootError;
```

**THE CONTRACT LAWS:**
- `roots` is non-empty on the success arm — an empty array is not a valid return.
- Every root is `fs.realpathSync`'d — a symlinked root is resolved before it is trusted.
- `evidence` names the rule (`"profile:sources"` | `"workspace:pnpm"` | `"tsconfig:include"` |
  `"convention:src"` | `"walk:depth4"`) so a wrong discovery is diagnosable.

### §9.2 `scripts/gi-populate.ts` (NEW — W4)

```
  gi-populate --target <dir> [--rebuild] [--layers corbell,graphify,structural,c2kg,ua,semantica]
              [--source-root <dir>]   (override; default = discovery)

  THE STAGE CONTRACT (each stage either SUCCEEDS or NAMES its failure):
    1  discoverSourceRoots(target)              → SourceRoots | GI_NO_SOURCE_ROOT (exit 1)
    2  for each requested layer:
         run the builder(roots)                 → { nodes, edges, storePath } | GI_LAYER_BUILD_FAILED:<layer>
         write gi_meta.build_root = realpath(target)
         write gi_meta.build_root_sha = treeSha(roots)
         assert nodes > 0                       → else GI_LAYER_BUILD_EMPTY:<layer> (exit 1)
    3  print the per-layer table; exit 0 iff ALL requested layers built

  THE OUTPUT TABLE (the operator-facing artifact):
    ┌──────────────┬────────┬────────┬──────────────────────────────┬─────────────┐
    │ layer        │ nodes  │ edges  │ store path                   │ build_root  │
    ├──────────────┼────────┼────────┼──────────────────────────────┼─────────────┤
    │ corbell      │ 9,565  │ 29,541 │ <target>/.omp/…/store.sqlite │ <realpath>  │
    │ graphify     │   …    │   …    │ …                            │ …           │
    └──────────────┴────────┴────────┴──────────────────────────────┴─────────────┘
```

### §9.3 `src/omp/adapters/jevk5.ts` (NEW — W5a)

```typescript
export const JEVK5_URL = process.env.JEVK5_URL ?? "http://127.0.0.1:8090/v1/systemone";
export const JEVK5_HEALTH = process.env.JEVK5_HEALTH ?? "http://127.0.0.1:8008/health";

/** The SAME ConsumerProbe contract as kevProbe — id "TSG", rung "meaning". */
export function jevk5Probe(scopeRoot: string): ConsumerProbe;

/** The raw judge call — the shape is PROBED (W5a step 1), then frozen here. */
export interface Jevk5Request  { /* the PROBED shape */ }
export interface Jevk5Response { /* the PROBED shape */ }

/** A NAMED refusal when the server is down — never a silent empty. */
// GI_JEVK5_DOWN: the JevK5 server at <url> did not answer (health=<code>)
```

### §9.4 `src/omp/claim-firewall.ts` (NEW — W5c)

```typescript
/** A claim atom — one done-shaped assertion extracted from the model's message. */
export interface ClaimAtom {
  text: string;            // "523 tests pass"
  kind: "count" | "state" | "completion" | "path";
  charRange: [number, number];
}

/** The binding — the atom's evidence, or its absence. */
export interface ClaimBinding {
  atom: ClaimAtom;
  span: ToolSpan | null;   // null ⇒ FABRICATED (no Jev needed — the span IS the proof)
  verdict: "SUPPORTED" | "CONTRADICTED" | "FABRICATED" | "UNCERTIFIABLE";
  evidence: string;        // the tool-result excerpt, or the reason for FABRICATED
}

/** The gate — FAIL-CLOSED. */
export function adjudicateClaims(
  message: string,
  thisTurnToolResults: ToolResult[],
  judge: Judge,            // JevK5 (or KEV-CPU / the remote key — the fallback chain)
): { ok: true; bindings: ClaimBinding[] } | { ok: false; fabricated: ClaimBinding[]; remedy: string };
```

**THE POLARITY LAWS (from the blueprint, verbatim):**
- *"ABIDE fail-OPEN on missing key. Claim firewall fail-CLOSED on goal.complete. Do not unify those
  polarities."*
- *"THE RUNTIME HOLDS THE GATE; THE MODEL CANNOT CLOSE ITS OWN TURN."*

---

## §10 THE DATA FLOWS (before → after, per layer)

### §10.1 TODAY (the defect)

```
  a fresh target X
       │
       ▼
  gi-query who-calls <sym> --scope X
       │
       ▼
  store-open: {X}/.omp/graph-intelligence/corbell-checkout/store.sqlite   ← DOES NOT EXIST
       │
       ▼
  GI_POPULATE_FAILED:CORBELL_NOT_WARM:absent
       │
       ▼
  rows=0 · consumed:0/8 · ALL LAYERS DOWN

  ★ AND on the GI repo itself:
  gi-query --scope <GI repo>
       │
       ▼
  store-open: {GI}/.omp/…/corbell-checkout/store.sqlite   ← EXISTS (committed)
       │
       ▼
  9,565 nodes whose `file` is /tmp/corbell-scoped/src/…   ← A DEAD TREE
       │
       ▼
  facts=50 · CONSUMED   ← A CONFIDENT ANSWER ABOUT NOTHING
```

### §10.2 AFTER W1..W4 (the capability)

```
  a fresh target X (any layout: src/ · packages/*/src · a workspace)
       │
       ▼
  gi-populate --target X
       │
       ├─ discoverSourceRoots(X) → { roots: [...], evidence: "workspace:pnpm" }
       │
       ├─ for each layer: build(roots) → { nodes, edges }
       │        │
       │        └─ write {X}/.omp/graph-intelligence/<layer>/store.sqlite   ← X's OWN SCOPE
       │           write gi_meta.build_root = realpath(X)
       │
       ▼
  gi-query who-calls <sym> --scope X
       │
       ├─ store-open: assert gi_meta.build_root == realpath(X)   ← W3
       │     mismatch → GI_STORE_SCOPE_MISMATCH (a NAMED refusal)
       │
       ▼
  rows > 0 · consumed:8/8 (or each DOWN layer names its reason)
```

### §10.3 THE MEANING GATE (W5a)

```
  TODAY:  layer-consumption.ts:75 → kevProbe → execFileSync(scripts/kev-decide.ts)
                                     → KEV-0.6b-ONNX on CPU → 1 fact
  AFTER:  layer-consumption.ts:75 → jevk5Probe → HTTP :8090/v1/systemone
                                     → JevK5-4b-GGUF on GPU (5128 MiB) → N facts
          the fallback chain: JevK5 (GPU) → KEV (CPU) → tsg CLI (the remote key)
```

---

## §11 THE PER-WAVE ACCEPTANCE MATRIX (the mechanical gates)

| wave | the deliverable | the gate command | the pass condition |
|---|---|---|---|
| **W1** | the ghost stores purged | `ls .omp/graph-intelligence/*/store.sqlite` | the two ghost stores ABSENT |
| **W2** | source-root discovery | `bun test src/hunter/profile/source-roots.test.ts` | ≥4 cases pass: pnpm · tsconfig · plain src · none→error |
| **W2** | the real target builds | `gi-populate --target research/…/Understand-Anything` | exit 0 · nodes > 0 |
| **W3** | the content assertion | `gi-query --scope <B> (store from A)` | `GI_STORE_SCOPE_MISMATCH` |
| **W3** | the scope tiers synced | `diff <boilerplate>/scope-resolver.ts src/scoping/scope-resolver.ts` | no drift (or the drift is documented) |
| **W4** | the self-populate path | `rm -rf .omp/graph-intelligence && gi-populate --target .` | exit 0 · all layers rebuilt |
| **W4** | the fresh-project proof | `gi-populate --target /tmp/fresh && consumption-audit /tmp/fresh <sym>` | `consumed:8/8` or NAMED reasons |
| **W5a** | the JevK5 probe | `curl :8090/v1/systemone -d <probe>` | the request/response shape recorded |
| **W5a** | the meaning gate on GPU | `consumption-audit . <sym> \| grep TSG` | the evidence names jevk5 + :8090 |
| **W5b** | ABIDE judges live | a rule-violating diff | a verdict from a LIVE judge call |
| **W5c** | the claim firewall | a fabricated claim | `FABRICATED` · the turn REJECTED |
| **W6** | the 3-tier testing | the TESTING_LOG | all 3 tiers present for the capability claim |

---

## §12 THE FILE:LINE ANCHOR INDEX (every claim in this spec)

```
  src/hunter/graph/corbell-adapter.ts:611        the build() that throws GRAPH_EMPTY
  src/hunter/graph/interface.ts:181              graphEmpty() — the named-empty constructor
  src/hunter/profile/loader.ts                   loadProfile (the profile the discovery extends)
  src/omp/adapters/abide.ts:161                  abideProbe
  src/omp/adapters/abide.ts:212                  tailEvents(eventsPath, 4000)  ← THE LEDGER READ
  src/omp/adapters/kev.ts:22                     KEV_MODEL = "onnx-community/kev-0.6b-ONNX"  ← CPU
  src/omp/adapters/kev.ts:81                     kevProbe — id "TSG"
  src/omp/adapters/tsg.ts:92                     tsgProbe — the CLI fallback
  src/omp/adapters/corbell.ts:16                 corbellProbe (scopeRoot normalized — R20 fix)
  src/omp/adapters/graphify.ts:13                graphifyProbe
  src/omp/layer-consumption.ts:75                tryProbe("TSG", "meaning", kevAvailable ? … )
  src/omp/layer-consumption.ts:24-26             the 3 probe imports
  src/omp/layer-registry.ts:37                   | "repair"; // ABIDE — the repair path (never a block)
  src/omp/enforcement.ts:151-153                 the JEV declaration + requireUp(jevDecl)
  src/omp/hard-deps.ts:395                       keyFileComponent("JEV", … "the TypeSafe API key")
  src/omp/typed-write.ts                         the store writer (build_root lands here)
  src/omp/store-open.ts                          the store opener (the assertion lands here)
  src/scoping/{scope-binding,scope-resolver,db-path,scoped-store,session-state}.ts
                                                 the 5 boilerplate files (all differ from the source)
  scripts/corbell-build.ts                       the build CLI (--target)
  scripts/graphify-build.ts · ua-ingest.ts · semantica-ingest.py · structural-extract.py
                                                 the other layer builders
  the blueprint: …/JEV_ABIDE_CONTEXT_HANDOVER/01_BINDING_SPEC/
    WarheadsAbide_Master_Blueprint_v1.md          the 4-layer stack + the polarities
    JevClaimFirewall_Blueprint.md                 the L2 design (DESIGN, NOT BUILT)
  the boilerplate: …/agent_plugin_boilerplates/workspace-scoped-state-boilerplate/README.md
```

---

## §13 THE DERIVATION (why THIS design — first principles)

**THE IRREDUCIBLE TRUTHS:**
1. A graph is a function of a target. `G = f(target)`. A store that does not record its `target` is
   not a graph — it is an unattributed data file.
2. An empty result and a wrong-scope result are the same bytes. Only a NAMED refusal distinguishes them.
3. A capability that exists only on its author's machine is not a capability. It is a demo.
4. A model cannot certify its own completion. The certification must live outside the model.
5. A guard whose condition can never be true is worse than no guard — it manufactures confidence.

**THE DERIVED LAWS:**
- From (1): every store carries `build_root` (W3). **A store without its root is unreadable.**
- From (2): a build with no discovered root returns `GI_NO_SOURCE_ROOT` (W2). **Never an empty graph.**
- From (3): the self-populate path is the deliverable (W4), proven on a project the kernel has never
  seen. **The GI repo's 7/8 must be reproducible, not carried.**
- From (4): L2 is built (W5c), fail-CLOSED. **The model cannot close its own turn.**
- From (5): every guard is proven to FIRE before it is trusted (W5b/W5c). **A guard without a
  positive test is assumed dead.**

**THE ONE MECHANISM:** *the graph is a function of the target, and every artifact it produces asserts
which target it describes.* Everything in §3 is that mechanism applied to a layer: the discovery (the
target's shape), the scope assertion (the target's identity), the self-populate (the function
applied), the judge (the target's semantics), the firewall (the claim against the target's evidence).

**THE TEST OF THE REDUCTION:** apply it to an unmentioned instance — a Rust project with no `src/`
(a `crates/*/src` layout). The mechanism says: discovery finds `crates/*/src` (rule 5), the store
asserts that root, the register reads on that scope. **The design covers an instance this spec never
mentioned** — which is the test a reduction must pass and a list cannot.

---

## §14 SUCCESS CRITERIA (the mechanical done-when — every line a command)

**Each criterion names a PROCESS ARTIFACT (a running process, a port, a served wire) and its
NON-STUB evidence (an exit code, a status field, a heartbeat, a tool result, an artifact on disk).**

| # | the criterion | the process artifact | the non-stub evidence |
|---|---|---|---|
| C-1 | the populate process RUNS and the build daemon completes | `gi-populate` (the process) | exit code 0 + the per-layer node/edge table printed |
| C-2 | the store SERVER serves the graph on the scope | the store-open path (serves reads) | the read returns rows > 0 via the adapter |
| C-3 | the JevK5 SERVER on the GPU serves the meaning gate | `:8090` / `:8008` (the live server) | the TSG evidence line names jevk5 + the port; a heartbeat on `/health` |
| C-4 | the claim-firewall LISTENS on the tool-result wire | the hook listener | a fabricated claim → the REJECTED status in a tool result |
| C-5 | the abide-live-judge RUNS on a live diff | the judge process (per-edit) | a verdict observed in a tool result (not a ledger row) |
| C-6 | the graph is a FUNCTION of the target, RUN against a real session | a live session on a real codebase | the `consumed:8/8` status observed in a tool result, exit code 0 |
| C-7 | a fresh project POPULATES and the register reads | the populate process + the register | exit code 0 + the register's consumed:N/8 (the self-populating + source-root-discovery + content-scoping waves proven together) |
| C-8 | the container rig RUNS the kernel on a real project | the container (a live runtime) | the deployed dist sha + the register reading, captured as an artifact — the three-tier-testing tier-2 proof |

**GS-5 NOTE (the battery is not a criterion):** `bun run test` (441/0 + 539/0) is a REGRESSION GUARD
and appears here only ALONGSIDE the process criteria above — never as the sole evidence of a
capability.

---

## §15 SCOPE (the mission nouns — every one a work item)

The mission's nouns, each a first-class scope item in §3's waves:

| the noun | the wave | the scope item |
|---|---|---|
| **self-populating** | W4 | `gi-populate` builds the stores from any target into the target's own scope |
| **source-root-discovery** | W2 | `discoverSourceRoots` finds the target's sources from its own config |
| **content-scoping** | W3 | every store asserts `build_root`; a cross-scope read refuses |
| **jevk5** | W5a | the meaning gate uses JevK5-4b on the GPU (:8090 / :8008) |
| **claim-firewall** | W5c | L2 — the fail-CLOSED completion gate (the missing blocking half) |
| **abide-live-judge** | W5b | ABIDE judges the current diff live, not a ledger of past verdicts |
| **three-tier-testing** | W6 | SCRIPT · CONTAINER · HOST — a capability claim requires the container tier |

---

## §16 COMPLETION CHECKLIST (every row names the PROCESS it RUNS, live)

| # | the check | the process it proves | the artifact |
|---|---|---|---|
| 1 | `gi-populate --target <fresh>` exits 0 | the populate process RUNS | the store + the node table |
| 2 | the store's `gi_meta.build_root` == `realpath(target)` | the scope assertion RUNS on read | the gi_meta row |
| 3 | a cross-scope read → `GI_STORE_SCOPE_MISMATCH` | the guard RUNS (observed firing) | the refusal string |
| 4 | a source-less target → `GI_NO_SOURCE_ROOT` | the refusal path RUNS | the refusal string |
| 5 | the TSG probe names jevk5 + the port | the GPU server SERVES | the evidence line |
| 6 | a fabricated claim → REJECTED | the firewall LISTENS on the tool-result wire | the tool-result status |
| 7 | a rule-violating diff → a live judge verdict | the ABIDE judge RUNS per-edit | the tool-result verdict |
| 8 | the register on a real project → 8/8 or named reasons | the kernel RUNS on a real session | the register output |
| 9 | `rm -rf` the stores + repopulate → the reading reproduces | the capability is REAL, not carried | the before/after register |
| 10 | the container rig captures the reading | the runtime RUNS in the deployed container | the results artifact JSON |

**THE LIVENESS ROW (the process proof):** every row above names a PROCESS that RUNS (the populate
process, the scope guard, the refusal path, the GPU server, the firewall listener, the judge, the
kernel session, the container runtime) — no row is satisfied by a file's existence.
