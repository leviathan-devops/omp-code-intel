# GI KERNEL V2.3 — THE MISSION

## THE MISSION, VERBATIM (the operator, 2026-09-27)

> *"it should literally be a system level copilot that highlights relevant critical data on every
> tool call so the agent cannot make any ignorant or unaware decisions. this is the right idea.
> Card based interactive HUD enforced by the system on all tool calls for data awareness and
> codebase intelligence."*

> *"this can be the exact mechanism that serves as the core intelligence backend of the Card-HUD.
> So this is a double layered LSP. 1 is the standard LSP functions and the 2nd is the intelligence
> backend of the Graph-Card-HUD from tier 1. so the GIK layers all route into the LSP, the LSP
> becomes the actual runtime kernel that gets plugged into everything. the 2 Jev based enforcement
> layers are wired into/connected to the LSP as well. LSP is a solid baseline kernel platform to
> route and enforce everything through"*

> *"there should be NO TRIDENT BRANDING ANYWHERE IN THIS PROJECT."*

> *"get context from the original …/Checkpoints/plutus-corbell-container-tested on the custom logic
> LSP anchored on every tool call like a normal LSP. OMP already has a native LSP integration and
> we had a working baseline for that in this checkpoint. how can be setup and wire a GI LSP in
> OMP's native runtime — that is the correct way to make it reflexive and automatic. custom LSP
> server build from the GIK layers wired natively in omp's runtime kernels."*

> *"ok clean semantica and tell me what the cleaned semantica data and knowledge structure is now"*

> *"...create the FULL v2.3 build package now w/ all of this so we can have a fresh clean v2.3
> build for all of this and get everything properly setup."*

## THE RESTATED UNDERSTANDING

V2.3 turns the GI kernel from a **QUERYABLE LIBRARY** into a **REFLEXIVE KERNEL**:

1. **THE GI LSP** — a stdio LSP server backed by the 6 graph layers, registered in OMP's NATIVE
   LSP runtime (`~/.omp/agent/lsp.json`) → **queried automatically on every write/edit** (OMP
   already runs `lsp.diagnosticsOnWrite`). Double-layered: the standard LSP ops (hover/definition/
   references) + the intelligence backend (the Card-HUD's fact cards).
2. **THE CARD-HUD** — a `tool_call` hook that injects interactive fact CARDS (callers · unwired ·
   conflicts · meaning · scope) into the agent's context. **The portable fallback** where no LSP.
3. **THE JEV KERNELS ROUTE THROUGH THE LSP** — TSG (JevK5) → the `meaning` diagnostic; ABIDE →
   a `Warning` on an edited hunk. The CLAIM FIREWALL stays at turn-end (fail-CLOSED).
4. **THE SEMANTICA CLEAN** — ✅ DONE (5,450 → 1,220 entities, 92% src).
5. **THE SHARED `WALK_SKIP`** — one skip law, imported by every producer (the class fix).
6. **THE GRAPH-HEALTH GATE** — 3 mechanical checks (resolve · root histogram · archive rows),
   wired into `gi-populate`; <90% in-scope = a LOUD failure.
7. **THE 6 CLAIM-FIREWALL FIXES** — the muse-go audit's findings (A-1 CRITICAL → A-6 MED).
8. **THE DE-BRAND** — 0 "trident" in `src/` + `scripts/`.
9. **THE BOOT-PERSISTENCE** — the refresh timer + the TTL widen.

## THE SCALE CLASS

**architectural** — a new subsystem (the GI LSP server + the Card-HUD hook) + a class-level
refactor (the shared skip law + the de-brand) + a correctness pass (the firewall).

## THE NON-NEGOTIABLES

- the LSP must be wired into OMP's NATIVE runtime (not a bespoke sidecar) — the reflex property
- the two Jev kernels must route through the LSP
- ZERO trident branding in `src/` + `scripts/`
- the Card-HUD is INFORMATIONAL (never blocks); the FIREWALL stays fail-CLOSED
- every layer <90% in-scope FAILS the graph-health gate

## THE FORBIDDEN (the anti-scope)

- NO new graph engine (the 6 layers exist; this wires them)
- NO stub for working machinery (the W23 law)
- NO weakening the firewall's polarity
- NO silent fallback where a substrate is absent (a NAMED refusal, always)

## THE OPEN QUESTIONS (max 5; only unresolvable ones)

1. **The `.trident/` store path** — rename to `.gi/` with a migration, or keep the path and
   de-brand only the strings? (RECOMMENDED: rename + a one-time migration + a read-fallback.)
2. **The LSP's diagnostic volume** — every file's callers, or only EDITED files? (RECOMMENDED:
   edited files + the open file; a full-tree sweep is a separate op.)
3. **The Card-HUD's byte budget** — the checkpoint uses `LOGIC_LSP_BYTE_COST = 500` per block.
   (RECOMMENDED: 500–1500 per tool call, capped, with a `shown=N total=M` disclosure.)
4. **The refresh cadence** — 30 min vs on-session-start. (RECOMMENDED: both — a 30-min timer +
   a session-start probe that refreshes only when a store is stale.)
5. **structural's archive skip** — the same shared `WALK_SKIP`, or a per-layer override?
   (RECOMMENDED: the shared law, no overrides.)

## THE HANDOFF

This package feeds **build-package** → the worker/wave dispatch. The planning artifact is
`PLANNING_SUITE_GI_KERNEL_V2.3.md`; the spec is `GI_KERNEL_V2.3_DPL1_SPEC.md`.
