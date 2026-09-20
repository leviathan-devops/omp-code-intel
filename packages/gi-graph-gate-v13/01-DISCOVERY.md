# DISCOVERY — GI Kernel v1.3 Graph Gate

## Measured inventory (this turn, first-hand)
- GI repo: /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence @ 8599500 [jarvis/gi-main]
- src/omp/extension.ts: 598 lines — the extension bundle entry, registerGiOmpTools()
- src/omp/typed-write.ts: 964 lines — store + typed writes + session scoping
- src/omp/graph-gate.ts: ABSENT — greenfield module (~500 lines to write)
- src/omp/: 10 files (extension, gate-hook, gate-middleware, gi-registry, populate-corbell, populate-graphify, populate, ripwire-bridge, store-open, typed-write)
- TTSR rules live: 5 files in ~/.agent/rules/ (anti-scope-shrink, anti-theatrical, basic-logic-check, red-team-default, verification-before-declaration)
- APPEND_SYSTEM.md: 31 lines (graph-first doctrine + hard-dependency law + anti-theatrical law + semantic commit tokens)
- OMP hook surface: beforeToolCall/afterToolCall in wrapper.ts:178 area (extension hook contract confirmed in vendor source)
- Battery: 218 pass / 0 fail / 1759 expect() × 30 files
- Dist: ee0829c735cc5a1a deployed ×2 + HOST-EXEC-OK

## What was NOT read
- The full OMP vendor source beyond wrapper.ts hook surface (the OMP hook bible research agent failed on quota)
- The v4.4.2 warhead bodies beyond the port map (already ported into APPEND_SYSTEM.md)
- The V2 context-graph/knowledge-graph systems (explicitly out of scope — PROPOSED only)

## Landing zone constraints
- The gate lives INSIDE the existing extension bundle (no new extension to register)
- Session state follows the existing sessions/{sid}/store.sqlite scoping law
- TTSR rules use the established frontmatter format (name/scope/condition/contextMode/repeatMode)
- The 613KB bundle grows by ~40KB (graph-gate.ts bundled) — no size gate risk
