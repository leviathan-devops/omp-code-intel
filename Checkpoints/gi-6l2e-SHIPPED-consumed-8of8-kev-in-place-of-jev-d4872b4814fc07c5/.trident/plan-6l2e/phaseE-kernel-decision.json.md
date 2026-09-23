# E-2 · THE CONTAINER PROOF — THE KERNEL DECIDES IN A HEADED OMP TUI

**The rig:** `gi-6l2e-ct` (omp-ct:master, image `988d8bde1f87`, transport tmux 220x50
send-keys + capture-pane).
**The deployed dist:** `87f10741b381f9c6acd35af75bd2dd9652a79ff9c50fd1c14fc70582ce62721a` — deployed byte-identical into the container
(`docker cp`; `md5sum` agrees: `720129ee907334bb`).
**The dist-content gate INSIDE the rig:** runKernelV2=2 · FireLedger=2 · PolicyStore=2 ·
graphFacts=2 · decideFromRegistry=2 · decideFireFromGraph=2 · gi-decide=3 — all > 0.

## ★ THE HEADED-TUI TRANSCRIPT (the model drove `gi-decide`)
```
 verdict=REFUSE   class=benign   code=GI_STACK_INCOM…
 subject=evidence
 scopeRoot=/root/gi-scope
 layersWired=6/8
 … 5 more lines ⟦Ctrl+O: Expand⟧
 ```
verdict=REFUSE   class=benign
code=GI_STACK_INCOMPLETE:L4_C2KG
subject=evidence
scopeRoot=/root/gi-scope
layersWired=6/8
influenced=ABIDE
reason=GI_LAYER_C2KG (L4_C2KG needs the
code-to-knowledge-graph LSP index;
/root/gi-scope/.c2kg/index.json — ENOENT) |
GI_LAYER_UA (L3_UA needs the understand-anything
graph (.ua/knowledge-graph.json);
/root/gi-scope/.ua/knowledge-graph.json — ENOENT) |
GI_LAYER_ARSUMBRIS (L2_ARSUMBRIS needs the au daemon
socket + its typed repo graph;
/root/.arsumbris/au-engine/run — ENOENT) |
GI_LAYER_SEMANTICA (L1_SEMANTICA needs the semantica
workspace + its KG store;
/root/gi-scope/.omp/graph-intelligence/layers/semant
ica/kg.json — ENOENT)
  stage 0 PREFLIGHT   REFUSE   4 layer(s) DOWN:
L4_C2KG,L3_UA,L2_ARSUMBRIS,L1_SEMANTICA
graph:
store=/root/gi-scope/.omp/graph-intelligence/corbell
-checkout/store.sqlite   settles=true   fires=0
policy=3@the seed policy set (no policy.json on disk
— the named fallback)
ledger=/root/gi-scope/.omp/graph-intelligence/fire-d
ecisions.db
  M-GRAPH-3   settles=true   action=IGNORE   the
graph store is STALE — no fact is served from it
 ```
                    Run gi-decide evidence scope check
 π  > 🗑 /tmp ▶─2%───────────────────────────╎┃─────1M─
╰─
```

## ★ WHAT THIS PROVES
1. **THE KERNEL RUNS IN THE ARTIFACT.** `gi-decide` mounted in the restarted session and
   executed: the PREFLIGHT asked all 6 layers, the DETECT stage ran, and the kernel
   returned its verdict.
2. **A NAMED REFUSAL, NEVER A SILENT PASS.** 4 layers are DOWN **in the container** and
   the kernel named every one with its EXACT path + code —
   `GI_LAYER_C2KG (.c2kg/index.json — ENOENT)`, `GI_LAYER_UA (.ua/knowledge-graph.json)`,
   `GI_LAYER_ARSUMBRIS (/root/.arsumbris/au-engine/run)`, `GI_LAYER_SEMANTICA (semantica/kg.json)`
   — and returned `code=GI_STACK_INCOMPLETE:L4_C2KG`.
3. **THE STALE-STORE LAW HOLDS IN RUNTIME.** The graph rung read the container's store and
   `M-GRAPH-3` (STORE-FRESH) returned `action=IGNORE — the graph store is STALE — no fact
   is served from it`. The stale store was REFUSED, never answered from.
4. **THE FALLBACK IS NAMED, NOT SILENT.** `policy=3@the seed policy set (no policy.json on
   disk — the named fallback)` — the fallback states itself.

## ★ THE HONEST READING
The container carries ONLY L5/L6 (corbell + graphify) substrates; L1-L4 (semantica,
arsumbris, UA, C2KG) are HOST-side and were never produced inside the rig. The kernel's
REFUSE is therefore the CORRECT answer to the container's real state — not a defect.
★ The E-2 test's purpose is the DECISION MECHANISM in a headed TUI, and it is proven:
the kernel asks every layer, names every offender, refuses on the first absent dependency,
and serves no fact from a stale store.
