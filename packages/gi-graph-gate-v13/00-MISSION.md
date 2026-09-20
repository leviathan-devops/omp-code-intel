# MISSION — GI Kernel v1.3 Intelligent Graph Gate

## The operator's mission (verbatim)
"Build an intelligent graph gate inside the GI kernel that enforces graph-tool usage before structural code edits — NOT a blind 'call the graph before every edit', but an event-aware, temporal, intent-based LASME system: lexicon classifies the edit, a temporal drift state machine decides, and a tier ladder enforces proportionally. Doc-only edits never trigger. Test edits trigger at LOW severity. Only actual code edits (export changes, import changes, function deletions, type modifications) escalate. The gate must reward graph usage (queries reset drift) and give a reasonable window of chained edits without graph calls before tightening."

## Restated understanding
A new module `src/omp/graph-gate.ts` (~500 lines) inside the existing GI kernel extension bundle. It hooks `beforeToolCall`/`afterToolCall` via the OMP extension API, classifies every edit/write call through an intent lexicon, computes temporal drift from a 5-minute decayed edit window, and escalates T0 pass → T1 advise → T2 block → T3 TTSR abort. Graph calls reset drift. Session state persists in `graph_gate_state` table. V2 extension points (spec drift, blast-radius weighting, context graphs) scaffolded as empty interfaces, NOT built.

## Open questions (max 5)
1. TTSR rule for T3: new rule file or reuse an existing abort surface? (default: new `graph-gate.md` rule)
2. Drift thresholds (0.3/0.4/0.6/0.8): accept blueprint values or tune via tetris session first? (default: blueprint values, tetris-tune in W5)
3. Should the gate consult live graph stores for caller counts (BlastRadiusWeighter) in v1.3 or defer to V2? (default: defer — static severity weights in v1.3)
4. Session state table: new `graph_gate_state` in the session store, or separate file? (default: session store table, same scoping law)
5. tetris tuning before or after the gate build? (default: AFTER — gate built to blueprint, then tetris-tuned as W5)

## Non-negotiables
- Doc-only edits (.md/.json/.yaml/.toml) NEVER trigger — zero friction
- Graph calls reset drift — the gate rewards, never punishes coding
- Minimum escalation path: T1 (advise) before T2 (block); T3 only at drift ≥ 0.8 + 5 consecutive structural edits
- V2 extension points are EMPTY interfaces — no V2 implementation in this package
- HARD DEPENDENCY preserved: the gate never substitutes, only advises/blocks/aborts

## Forbidden list
- No blind "graph call before every edit" — the operator explicitly ruled this retarded
- No hardcoded edit-count thresholds (the "3 edits" derailment) — drift score only
- No trident references, no trident dist involvement
- No silent fallbacks anywhere in the gate path
