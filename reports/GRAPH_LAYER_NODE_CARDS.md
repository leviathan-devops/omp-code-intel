# THE GRAPH LAYER — NODE CARDS (self-contained reference)
# Every record below was pulled LIVE from the stores on 2026-10-04 via the exact commands noted.
# This file is self-contained: the records ARE the data. Read it alone.

## HOW TO REPRODUCE EVERY RECORD IN THIS FILE
```
# L1 SEMANTICA
python3 -c 'import json;d=json.load(open(".omp/graph-intelligence/layers/semantica/kg.json"));print(len(d["entities"]),len(d["relationships"]))'
# L2 ARSUMBRIS (LIVE socket)
bun scripts/au-read.ts types .        # 29 types
bun scripts/au-read.ts instances au-engine .
bun scripts/au-read.ts files .
# L3 UA
cat .ua/knowledge-graph.json          # nodes 1,150 · edges 1,412
# L4 C2KG
cat .c2kg/index.json                  # symbols 232 · edges 0
# L5 CORBELL
sqlite3 corbell-data/.corbell/workspace.db 'SELECT id,data FROM graph_nodes LIMIT 5'
# L6 GRAPHIFY
python3 -c 'import json;d=json.load(open("graphify-out/graph.json"));print(len(d["nodes"]),len(d["edges"]))'
# THE CARDS (the injection)
bun scripts/gi-lsp.ts --selftest src/omp/jev.ts
```

---

# L1 · SEMANTICA — the DECISION rung
```
store  .omp/graph-intelligence/layers/semantica/kg.json   1.27 MB
has    entities 1,281 · relationships 1,560
       entity types {symbol 1,058 · file 220}
       rel types    {defines 1,061 · imports 499}
built  scripts/semantica-ingest.py
used   src/omp/adapters/semantica.ts  (the L1 probe) via consumptionAudit()
```
**ENTRY:** `semantica-ingest.py` walks the tree; emits `entity{id:"file::<path>"}` per file and
`entity{id:"symbol::<path>::<name>"}` per declared symbol; derives `relationships` from import/define
analysis. **RETRIEVAL:** `consumptionAudit(root,subject)` → `semanticaProbe(root).facts(subject)`.
**ROUTING:** answers the *decision* rung of the consumption audit → `union=8/8` predicate.

## CARD L1-1 · `file::scripts/graphify-build.ts`
```
RAW   {"id":"file::scripts/graphify-build.ts","name":"scripts/graphify-build.ts",
       "type":"file","source":"scripts/graphify-build.ts"}
```
- DATA: a `file` entity, `file::`-namespaced; `source` = the path.
- KNOWLEDGE: the L6 warm-index builder is itself a graph node.
- RELEVANCE: provenance root of graphify-out/graph.json.
- RETRIEVAL: `facts("graphify-build")` matches id/name.
- ENTRY: the file scan.
- TRIGGER: any audit asking about graphify-build.
- ROUTING: entity → `LayerFact{consumer:"L1_SEMANTICA",rung:"decision"}` → audit verdict → agent.

## CARD L1-2 · `file::src/hunter/graph/graphify-adapter.ts`
```
RAW   {"id":"file::src/hunter/graph/graphify-adapter.ts", ...}
REL   file::scripts/graphify-build.ts ──imports──▶ file::src/hunter/graph/graphify-adapter.ts
```
- DATA: a file entity + an inbound `imports` edge.
- KNOWLEDGE: the L6 adapter is imported by the L6 builder.
- RELEVANCE: builder↔adapter coupling; an API break propagates.
- RETRIEVAL: `facts("graphify-adapter")`.  ENTRY: import scan.  TRIGGER: an adapter query.
- ROUTING: relationship row → decision-rung fact.

## CARD L1-3 · `file::src/omp/populate-graphify.ts`
```
RAW   {"id":"file::src/omp/populate-graphify.ts","type":"file", ...}
REL   file::scripts/graphify-build.ts ──imports──▶ file::src/omp/populate-graphify.ts
```
- DATA: file entity + inbound `imports`.
- KNOWLEDGE: the L6 populate leg, imported by the builder.
- RELEVANCE: names the module that copies the warm graph into the session store.
- RETRIEVAL: `facts("populate-graphify")`.  ENTRY: import scan.  TRIGGER: a populate query.
- ROUTING: decision-rung fact.

## CARD L1-4 · `symbol::scripts/graph-health.ts::computeHealth`
```
RAW   {"id":"symbol::scripts/graph-health.ts::computeHealth","name":"computeHealth",
       "type":"symbol","source":"scripts/graph-health.ts"}
REL   file::scripts/graph-health.ts ──defines──▶ symbol::…::computeHealth
```
- DATA: a `symbol` entity + a `defines` edge.
- KNOWLEDGE: the per-layer health computation is a named symbol.
- RELEVANCE: the graph records its own metric source (self-measurement).
- RETRIEVAL: `facts("computeHealth")`.  ENTRY: symbol scan.  TRIGGER: a health query.
- ROUTING: decision-rung fact.

## CARD L1-5 · `symbol::scripts/kev-probe.ts::KevQuestion`
```
RAW   {"id":"symbol::scripts/kev-probe.ts::KevQuestion","name":"KevQuestion",
       "type":"symbol","source":"scripts/kev-probe.ts"}
```
- DATA: a `symbol` entity.
- KNOWLEDGE: the KEV judge's question TYPE is recorded.
- RELEVANCE: ties L1 to the KEV decision substrate vocabulary.
- RETRIEVAL: `facts("KevQuestion")`.  ENTRY: symbol scan.  TRIGGER: a KEV query.
- ROUTING: decision-rung fact.

---

# L2 · ARSUMBRIS — the KNOWLEDGE rung (the LIVE engine)
```
store  ~/.arsumbris/au-engine/run/<hash>.sock   (LIVE, schema_version 29)
wire   4-byte big-endian length prefix + JSON frame
has    types 29 · instances 7 · files 15,293
built  the au-engine daemon itself
used   src/omp/adapters/arsumbris.ts -> scripts/au-read.ts (exec bridge)
```
**ENTRY:** the au-engine indexes the workspace into typed *types*, *instances*, *files*.
**RETRIEVAL:** `arsumbrisProbe.facts(subject)` exec's `au-read.ts <read> <subject>`.
**ROUTING:** the knowledge rung. (The W1 symbol-space read took L2 from 0 → facts=50.)

## CARD L2-1 · TYPE `adapter-presentation-meta`
```
RAW   {"name":"adapter-presentation-meta","repo":"au-mcp-sdk","abstract":false,
       "parents":["au.engine.meta::au-engine"],"hash":"72ff15ea24401c86",
       "fields":[{"name":"description","required":true,"shape":"String"},
                 {"name":"label","required":false,"shape":"String"}]}
```
- DATA: a type, 2 fields, parents, content hash.
- KNOWLEDGE: the shape a "presentation meta" must have — description required, label optional.
- RELEVANCE: a schema contract the engine enforces (the L2 vocabulary).
- RETRIEVAL: `au-read.ts types .` → the type catalog (29).
- ENTRY: the engine's type indexer over au-mcp-sdk.
- TRIGGER: a `types` read or a symbol-space facts query.
- ROUTING: reply → `arsumbrisProbe` → `LayerFact{rung:"knowledge"}` → audit → agent.

## CARD L2-2 · TYPE with a REFINED shape
```
RAW   {"fields":[{"name":"contractVersion","required":true,
       "shape":"Number{>=0 & integer}","shape_ast":{"kind":"refined","base":"Number",
       "refinement":{"integer":true,"lower":{"inclusive":true,"value":"0"}}}}]}
```
- DATA: a refined number (`>=0 & integer`).
- KNOWLEDGE: the engine carries a REFINEMENT AST — constraints, not just primitives.
- RELEVANCE: refined shapes are how au enforces contracts.
- RETRIEVAL: `types`.  ENTRY: type indexer.  TRIGGER: a types read.
- ROUTING: knowledge-rung fact.

## CARD L2-3 · INSTANCE `au.engine.repo::au-engine`
```
RAW   {"claim":["au.engine.repo::au-engine"],"closure":["au.engine.repo::au-engine"],
       "effective_shape":[{"field":"deps","shape":"au.engine.dep::au-engine[]",
         "origins":[{"name":"au.engine.repo",
           "origin_path":"<au-engine-builtin>/au.engine.repo.type.yaml"}]},
         {"field":"description","shape":"String", ...}]}
```
- DATA: a typed instance — claim + closure (type ancestry) + effective_shape with origins.
- KNOWLEDGE: the engine repo instance declares `deps` + `description`, each with an origin path.
- RELEVANCE: instances are the engine's FACTS; the origin_path proves provenance (no fabrication).
- RETRIEVAL: `au-read.ts instances au-engine .` → count 7.
- ENTRY: the instance loader over .arsumbris/repo.yaml.
- TRIGGER: an `instances` read.  ROUTING: knowledge-rung fact.

## CARD L2-4 · FILE `.abide/events.jsonl`
```
RAW   {"kind":"asset","path":"…/Graph_Intelligence/.abide/events.jsonl",
       "repo":"Graph_Intelligence","stem":"events"}
```
- DATA: an `asset` file row (kind, path, repo, stem).
- KNOWLEDGE: the engine knows the ABIDE ledger exists as an asset.
- RELEVANCE: bridges L2 to the ABIDE repair-path data.
- RETRIEVAL: `au-read.ts files .` → 15,293 rows.
- ENTRY: file indexer.  TRIGGER: a `files` read.  ROUTING: knowledge-rung fact.

## CARD L2-5 · FILE `.arsumbris/repo.yaml`
```
RAW   {"kind":"instance","path":"…/Graph_Intelligence/.arsumbris/repo.yaml",
       "repo":"Graph_Intelligence","stem":"repo"}
```
- DATA: an `instance`-kind file row.
- KNOWLEDGE: the repo's own au manifest is indexed as an instance source.
- RELEVANCE: the engine's self-description (where instances originate).
- RETRIEVAL: `files`.  ENTRY: file indexer.  TRIGGER: a files read.
- ROUTING: knowledge-rung fact.

---

# L3 · UA — the CONTEXT rung
```
store  .ua/knowledge-graph.json   641 KB    version 1.0.0
has    nodes 1,150 · edges 1,412
       node types {function 908 · file 194 · class 48}
       edge types {contains 956 · imports 456}
project{"name":"Graph_Intelligence","analyzedAt":"2026-10-05T05:34:50.751Z",
        "gitCommitHash":"2a79f1412094"}
built  scripts/ua-ingest.ts   used  src/omp/adapters/ua.ts
```
**ENTRY:** `ua-ingest.ts` AST-walks the tree → `file:`/`function:`/`class:` nodes with `lineRange` +
weighted `contains`/`imports` edges. **RETRIEVAL:** `uaProbe.facts(subject)`. **ROUTING:** context rung.

## CARD L3-1 · `function:src/kernel/graph-gate.ts:gateCheck`
```
RAW   {"id":"function:src/kernel/graph-gate.ts:gateCheck","type":"function",
       "name":"gateCheck","filePath":"src/kernel/graph-gate.ts",
       "lineRange":[32,85],"summary":"","tags":[],"complexity":"simple"}
EDGE  file:src/kernel/graph-gate.ts ──contains──▶ function:…:gateCheck  (weight 1)
```
- DATA: a function node with exact lines [32,85] + a contains edge.
- KNOWLEDGE: the gate's decision function lives at 32–85.
- RELEVANCE: the function that decides STRUCTURAL drift (the T2/T3 enforcement hit this session).
- RETRIEVAL: `facts("gateCheck")`.  ENTRY: UA AST walk.  TRIGGER: a gate query.
- ROUTING: context-rung fact.

## CARD L3-2 · `class:….graphify-adapter.ts:GraphifyAdapter`
```
RAW   {"id":"class:src/hunter/graph/graphify-adapter.ts:GraphifyAdapter","type":"class",
       "name":"GraphifyAdapter","lineRange":[799,1093],"complexity":"complex"}
```
- DATA: a class node, `complex`, 294 lines.
- KNOWLEDGE: the L6 map→typed adapter, complexity-flagged.
- RELEVANCE: the class that converts graphify nodes/edges into typed rows.
- RETRIEVAL: `facts("GraphifyAdapter")`.  ENTRY: UA AST walk.  TRIGGER: an L6 query.
- ROUTING: context-rung fact.

## CARD L3-3 · `class:….corbell-adapter.ts:CorbellAdapter`
```
RAW   {"id":"class:…corbell-adapter.ts:CorbellAdapter","type":"class",
       "lineRange":[570,1369],"complexity":"complex"}
```
- DATA: a 799-line `complex` class.
- KNOWLEDGE: the L5 parse adapter — the largest adapter.
- RELEVANCE: highest change-risk file in L5.
- RETRIEVAL: `facts("CorbellAdapter")`.  ENTRY: UA AST walk.  TRIGGER: an L5 query.
- ROUTING: context-rung fact.

## CARD L3-4 · `class:….lsp-injector.ts:DiagnosticsServer`
```
RAW   {"id":"class:src/hunter/surface/lsp-injector.ts:DiagnosticsServer","type":"class",
       "lineRange":[85,377],"complexity":"complex"}
```
- DATA: a class node, 292 lines.
- KNOWLEDGE: the LSP diagnostics server — the injection surface.
- RELEVANCE: the class that publishes fact cards to the editor.
- RETRIEVAL: `facts("DiagnosticsServer")`.  ENTRY: UA AST walk.  TRIGGER: an LSP query.
- ROUTING: context-rung fact.

## CARD L3-5 · `file:src/kernel/graph-test-target.ts`
```
RAW   {"id":"file:src/kernel/graph-test-target.ts","type":"file","tags":["ts"],
       "complexity":"simple"}
EDGE  file:…graph-test-target.ts ──imports──▶ file:src/omp/typed-write.ts  (weight 0.7)
```
- DATA: a file node + a weighted imports edge.
- KNOWLEDGE: the test-target resolver imports typed-write.
- RELEVANCE: the file that picks tests from graph degree.
- RETRIEVAL: `facts("graph-test-target")`.  ENTRY: UA AST walk.  TRIGGER: a test-target query.
- ROUTING: context-rung fact.

---

# L4 · C2KG — the CONTEXT rung  *** 0 EDGES ***
```
store  .c2kg/index.json   33 KB
gen    code-to-knowledge-graph (Bevel) via the no-comms parser
has    symbols 232 · edges 0
built  scripts/c2kg-produce/run.sh  (the Bevel Kotlin/JVM toolkit)
used   src/omp/adapters/c2kg.ts
```
**ENTRY:** run.sh runs the Bevel parser → `{symbols:[{name,file,line,kind,id}]}`.
**DEFECT:** the W5 seal had 411 edges; a 2026-10-04 no-comms regen wrote `edges: []` — the edge read
is DEAD, and L4 reads CONSUMED only via a SYMBOL subject (facts=1), never via an edge.

## CARD L4-1 · `{"name":"<global>","kind":"Package"}`
```
RAW   {"name":"<global>","file":"","line":0,"kind":"Package","id":"<global>"}
```
- DATA: the synthetic Package root.
- KNOWLEDGE: the index's root anchor.
- RELEVANCE: the anchor of the (now edge-less) package tree.
- RETRIEVAL: `c2kgProbe(root).facts(subject)` reads `idx.symbols`.
- ENTRY: Bevel parse.  TRIGGER: a --gate/subject read.  ROUTING: context-rung fact.

## CARD L4-2..5 · four `File` symbols
```
{"name":"demo",         "file":"packages/paragon-runtime-encryption/demo.ts",         "kind":"File","line":0}
{"name":"helpers",      "file":"packages/paragon-runtime-encryption/tests/helpers.ts","kind":"File","line":0}
{"name":"battery.test", "file":"packages/paragon-runtime-encryption/tests/battery.test.ts","kind":"File","line":0}
{"name":"signing",      "file":"packages/paragon-runtime-encryption/src/signing.ts",   "kind":"File","line":0}
```
- DATA: four File symbols with Bevel ids (`<hash>.<b64>.<global>.<name>`).
- KNOWLEDGE: the index knows the paragon-runtime-encryption package files — files only, line:0, no
  relations.
- RELEVANCE: this IS the whole value of L4 right now — a file list, because the parser ran no-comms.
- RETRIEVAL: a symbol-space `facts(subject)` matching a filename.
- ENTRY: the Bevel no-comms parse.  TRIGGER: a matching subject read.  ROUTING: context-rung fact.

---

# L5 · CORBELL — the SETTLEMENT rung
```
store  corbell-data/.corbell/workspace.db   2.94 MB (sqlite)
has    graph_nodes 1,353 · graph_edges 5,196
       edge kinds {method_call 2,758 · flow_step 2,435 · git_coupling 2 · http_call 1}
       node types {method 1,318 · flow 33 · service 2}
built  scripts/corbell-build.ts   used  src/omp/adapters/corbell.ts
```
**ENTRY:** `corbell-build.ts` parses the tree into method nodes (with typed signatures) +
`method_call`/`flow_step` edges carrying LINE NUMBERS. **RETRIEVAL:** `corbellProbe.facts(subject)`
→ `whoCallsInDb`.

## CARD L5-1 · `gi-omp-1::graph-gate.ts::gateCheck`
```
RAW   {"id":"gi-omp-1::graph-gate.ts::gateCheck",
       "repo":"…/Graph_Intelligence/src","file_path":"…/src/kernel/graph-gate.ts",
       "class_name":null,"method_name":"gateCheck","signature":"gateCheck","docstring":null,
       "line_start":32,"line_end":85,"service_id":"gi-omp-1",
       "typed_signature":"gateCheck(diff: GraphDiffResult, criteria: GateCriteria) -> GateResult"}
```
- DATA: a method node with a TYPED SIGNATURE, line span, service id.
- KNOWLEDGE: the exact contract — takes (GraphDiffResult, GateCriteria) → GateResult.
- RELEVANCE: the contract a caller must satisfy; the drift gate's entry.
- RETRIEVAL: `facts("gateCheck")` / `whoCallsInDb`.  ENTRY: corbell parse.  TRIGGER: a gate query.
- ROUTING: settlement-rung fact; its callers feed a CALLERS card.

## CARD L5-2 · `gi-omp-1::fire-ledger.ts::get`
```
RAW   {"id":"…::fire-ledger.ts::get","method_name":"get","signature":"get",
       "typed_signature":"get(target, prop)","line_start":688,"line_end":697,
       "service_id":"gi-omp-1"}
```
- DATA: a method with a Proxy-shaped signature.
- KNOWLEDGE: `get(target, prop)` — the fire-ledger's lazy accessor.
- RELEVANCE: the accessor behind the ledger the fire-log writes.
- RETRIEVAL: `facts("fire-ledger")`.  ENTRY: corbell parse.  TRIGGER: a ledger query.
- ROUTING: settlement-rung fact.

## CARD L5-3 · `gi-omp-1::graph-test-target.ts::getTestTargetsFromDb`
```
NODE   {"method_name":"getTestTargetsFromDb","line_start":27,"line_end":133,"service_id":"gi-omp-1"}
EDGES  (method_call, each with its call LINE)
   ──L34──▶ typed-write.ts::whoCallsInDb
   ──L48──▶ map-reader.ts::GraphifyMapReader.query
   ──L52──▶ fire-ledger.ts::get
   ──L52──▶ policy-store.ts::PolicyStore.get
   ──L57──▶ scope-resolver.ts::has
```
- DATA: a method + FIVE outbound method_call edges with exact call lines.
- KNOWLEDGE: the test-target resolver's full dependency set.
- RELEVANCE: the richest fan-out — the exact set to touch when changing test targeting.
- RETRIEVAL: `whoCallsInDb("getTestTargetsFromDb")`.  ENTRY: corbell parse.  TRIGGER: a CALLERS card.
- ROUTING: settlement-rung fact → CALLERS card → agent (file:line per caller).

## CARD L5-4 · `gi-omp-1::graph-diff.ts::captureSnapshot`
```
EDGES  ──L41──▶ typed-write.ts::openTypedStore
       ──L43──▶ map-reader.ts::GraphifyMapReader.query
       ──L64──▶ fire-ledger.ts::get
```
- DATA: a method + three method_call edges.
- KNOWLEDGE: the snapshot capturer opens the store, queries the map reader, reads the ledger.
- RELEVANCE: the "before" the gate diffs against.
- RETRIEVAL: `whoCallsInDb("captureSnapshot")`.  ENTRY: corbell parse.  TRIGGER: a diff query.
- ROUTING: settlement-rung fact.

## CARD L5-5 · the `http_call` + `git_coupling` edges
```
http_call     gi-omp-1 ──▶ external:env_url
              {"env_var":"OPENCODE_API_KEY","file":"go-key-pool.ts"}
git_coupling  gi-omp-1 ──▶ gi-omp-1   (strength 0.8)
   {"file_a":"reports/GI_KERNEL_REBUILD_DPL1_SPEC.md",
    "file_b":"reports/SLOP-CODING-METHOD.md",
    "note":"…co-change 80% of the time — consider updating both when modifying either."}
```
- DATA: an http_call to an external env-var-gated URL + git co-change edges.
- KNOWLEDGE: the code reaches an external HTTP endpoint gated by OPENCODE_API_KEY; two reports
  co-change 80%.
- RELEVANCE: the http_call names a secret-bearing external surface; the git_coupling is PREDICTIVE.
- RETRIEVAL: edge queries.  ENTRY: corbell parse + git-history coupling.  TRIGGER: a co-change query.
- ROUTING: settlement-rung fact.

---

# L6 · GRAPHIFY — the SETTLEMENT rung (the big one)
```
store  graphify-out/graph.json   102 MB
has    nodes 38,215 · edges 162,404
rels   calls 108,949 · contains 34,883 · indirect_call 7,876 · imports 3,624 ·
       imports_from 3,180 · method 2,502 · references 667 · re_exports 500 ·
       dynamic_import 108 · inherits 61 · implements 26 · defines 11
built  scripts/graphify-build.ts (graphify extract)   used  adapters/graphify.ts
```
**ENTRY:** `graphify-build.ts` runs `graphify extract` → AST nodes/edges.
**RETRIEVAL:** `graphifyProbe.facts(subject)` → `whoCallsInDb` on the checkout store.

## CARD L6-1 · `src_omp_jev_asktoolgate`
```
RAW   {"id":"src_omp_jev_asktoolgate","label":"askToolGate()","file_type":"code",
       "source_file":"src/omp/jev.ts","source_location":"L437","_callable":true,"_origin":"ast"}
EDGES calls -> scrubSecrets() · sanitizeForJudge() · JevError · logFire()
INBOUND (verbatim)
   {"source":"scripts_gate_control_set_main","target":"src_omp_jev_asktoolgate",
    "relation":"calls","confidence":"EXTRACTED","source_file":"scripts/gate-control-set.ts",
    "source_location":"L155","weight":"1.0","_origin":"ast"}
```
- DATA: a callable function node at jev.ts:L437 + 4 outbound calls + 1 inbound call.
- KNOWLEDGE: the TSG judge calls the secret-scrubber, the sanitizer, JevError, and **logFire** — the
  fire-log wiring is IN the graph.
- RELEVANCE: proves the TSG path is observable; the inbound edge names gate-control-set.ts:L155.
- RETRIEVAL: `facts("askToolGate")` / `whoCallsInDb("askToolGate")`.
- ENTRY: graphify AST extract.  TRIGGER: a CALLERS query.  ROUTING: settlement-rung fact.

## CARD L6-2 · `src_omp_card_hud_attachcardhud`
```
RAW   {"id":"src_omp_card_hud_attachcardhud","label":"attachCardHud()",
       "source_file":"src/omp/card-hud.ts","source_location":"L75","_callable":true}
EDGES calls -> fileOf() · cwdOf() · resolveStorePath() · formatHud()
```
- DATA: a callable node + 4 calls.
- KNOWLEDGE: the HUD calls the store resolver + the HUD formatter.
- RELEVANCE: names the exact function that prepends fact cards to a tool_result.
- RETRIEVAL: `facts("attachCardHud")`.  ENTRY: graphify AST.  TRIGGER: a HUD query.
- ROUTING: settlement-rung fact.

## CARD L6-3 · `registerGiOmpTools()`
```
RAW   {"label":"registerGiOmpTools()","source_file":"…/extension.ts","source_location":"L302"}
EDGES calls -> textResult() · graphProbeWipeAudited() · confineTargetPath() · withPopulateLane()
```
- DATA: a callable node + 4 calls.
- KNOWLEDGE: tool registration calls the populate lane + confinement.
- RELEVANCE: the 7-tool surface's entry; the populate lane is the serialization fix.
- RETRIEVAL: `facts("registerGiOmpTools")`.  ENTRY: graphify AST.  TRIGGER: a tool-surface query.
- ROUTING: settlement-rung fact.

## CARD L6-4 · `whoCallsInDb()`
```
RAW   {"label":"whoCallsInDb()","source_file":"…/typed-write.ts","source_location":"L516"}
EDGES calls -> resolveLiveIds() · ph()
```
- DATA: a callable node + 2 calls.
- KNOWLEDGE: the caller-lookup calls `resolveLiveIds` (label→canonical_id) + `ph`.
- RELEVANCE: the graph holds the SOURCE OF THE DEFECT — `resolveLiveIds` does an exact label match.
- RETRIEVAL: `facts("whoCallsInDb")`.  ENTRY: graphify AST.  TRIGGER: a caller query.
- ROUTING: settlement-rung fact.

## CARD L6-5 · `populateSessionStore()`
```
RAW   {"label":"populateSessionStore()","source_file":"…/populate.ts","source_location":"L29"}
EDGES calls -> populateGraphifySessionStore() · populateFromCorbellCheckout() · setMeta()
```
- DATA: a callable node + 3 calls.
- KNOWLEDGE: the populate router branches to the graphify OR corbell leg, then writes meta.
- RELEVANCE: the exact build→session-store fan-out; the substrate switch lives here.
- RETRIEVAL: `facts("populateSessionStore")`.  ENTRY: graphify AST.  TRIGGER: a populate query.
- ROUTING: settlement-rung fact.

---

# HOW A NODE REACHES THE AGENT — the universal routing
```
source file ──(builder)──▶ warm index ──(populate)──▶ typed_nodes/typed_edges
   ──(card, src/gi-lsp/cards.ts)──▶ 5 shapes ──▶
     LSP diagnostics  |  Card-HUD steer note  ──▶ THE AGENT
```
The 5 card shapes and their exact query (src/gi-lsp/cards.ts):
- CALLERS  → `whoCallsInDb(db, symbol)` → real `caller (file:line)` rows.
- UNWIRED  → `whoCallsInDb` returns 0 (the F-95 dead-machinery class).
- MEANING  → `jevk5Probe(root).facts(symbol)` → {meaning, confidence, noul, model} (fail-OPEN).
- CONFLICT → corbell-vs-graphify caller-set diff.
- SCOPE    → `meta(db,"build_root")` != the file's root.

THE LIVE CARD (bun scripts/gi-lsp.ts --selftest src/omp/jev.ts):
  [gi-lsp/callers] resolveKey — 5 callers
      evaluate (src/omp/jev.ts:129) · redactSecrets (src/omp/jev.ts:204) · RunWorkLayerFlow (?:0)
  [gi-lsp/meaning] TYPESAFE_URL — meaning drift (confidence 0.509)
      judge jevk5-4b-v0.2-Q8_0 · :8090 · 115.2ms

# THE TWO DEFECTS THIS DATA EXPOSES
1. L4 C2KG = 0 edges — the W5-seal 411 edges were overwritten by the 2026-10-04 Bevel regen.
2. The UNWIRED card mis-fires — `resolveLiveIds` does `WHERE label = ?` (exact), but graphify labels
   carry `()` (resolveKey()) while declarationsIn emits bare names → every function reads 0 callers;
   and declarationsIn's scan includes const/let locals → noise cards.
