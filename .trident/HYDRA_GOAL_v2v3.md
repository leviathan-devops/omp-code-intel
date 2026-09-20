/goal GI KERNEL v2.0 + v3.0 — BUILD THE SIX-LAYER GRAPH STACK, THE JEV ENFORCEMENT KERNEL, AND THE RSI LAYER; SEAL BOTH PACKAGES. LIVE INNER = W1 THE STORE + LEDGERS (nothing built yet — the v1.3 gate is deployed but reads NO store). Legal stop = the last SC row (WAVE 4). STOP when every SC row is green with a tool-result token and the package seal receipt exists.

BIND: hydra-mode · hydra-orchestrator · wave-planning · trident-deep-planning
       (four Trident skills; nothing else is required to run this pin)

BUILD SPEC
==========

Runtime-grade thesis: the kernel must be proven RUNNING on this host against the
real store, the real gate log, and real Edit/Write tool calls — host unit green is
hygiene, never the ship gate.

Frozen surfaces (do not change): v1.3 dist `83eb7bba9c5e76db`; the `graph_gate_state`
table; `registerGraphGate` single call site; the F-48 substrate law
(GI_POPULATE_FAILED, no fallback).

T-1  THE STORE — `layer_id` on typed_nodes/typed_edges; the six namespaces populate
     through the SAME populate protocol; the partial unique index preserved.
T-2  THE LEDGERS — `.abide/events.jsonl` (firings) + the claim ledger + `gi_reflex` /
     `gi_reflex_evidence` in `~/.omp/graph-intelligence/rsi/`, mode 0700.
T-3  THE GATE SKELETON — STAGE 0..6 with STAGE 0 PREFLIGHT; a down layer emits
     `GI_STACK_INCOMPLETE:<layer>` and REFUSES.
T-4  THE THREE DETECTORS — dumb (grounding preconditions), theatrical (claim firewall),
     destructive (L1..L6 certify) — each sharing ONE stage interface.
T-5  THE ENFORCEMENT KERNEL — TSG as the load unit; Abide as the ALU (repair, never
     block); the claim firewall at close (fail-closed).
T-6  THE HARD-DEPENDENCY REGISTER — every component declares its dependency; NO
     fallback; the error code fires loudly on absence.
T-7  THE RSI LAYER — the reflex loop with VERIFIED RETIREMENT; precision recomputed
     from the ledger, never incremented.
T-8  CONFIDENCE WITH INTELLIGENCE — derivation-class base x corroboration x freshness;
     NO constant 1.0 anywhere in the mapper.
T-9  THE v3 BLUEPRINT + FORWARD-COMPAT — the 3.0 subsystem mapped onto the v2 seams
     the way v2 was mapped onto v1.3's PROPOSED hooks.
T-10 THE PACKAGE — `packages/gi-kernel-v2/` complete: 00-MISSION .. 07-GOALS + INDEX,
     every doc at floor, every spec gate green.

SUCCESS CRITERIA
================

SC-1  `bun test -t st-gi-graph-gate` green; `bun test -t st-gi-kernel-v2` green.
SC-2  A down layer REFUSES: the refusal token `GI_STACK_INCOMPLETE:<layer>` appears in
      a tool result, not in prose.
SC-3  The bogus-fallback fixture: `grep -rn "regex" src/omp/populate*.ts` returns the
      policy comment and NO fallback branch — known-bad MUST refuse.
SC-4  The forged-row test goes RED when the signature check is removed (mutation).
SC-5  The forged-retirement test proves the real row STAYS LIVE — the disablement hole.
SC-6  `confidence` distinct-value count > 1 across the live mapper output (kills B1).
SC-7  A staleness TTL exists and a 2-day-old graph emits `GI_LAYER_STALE` (kills B3).
SC-8  WAVE 3 — the enforcement kernel + the RSI seam: TSG + Abide wired, the reflex
      loop exercised end to end on a real firing, the ledger showing it.
SC-9  WAVE 4 — the v3 blueprint landed + the package seal: PACKAGE_AUDIT PASS, every
      doc at floor, a fresh agent could build v3 from the package alone.
SC-10 Legal stop: SC-1..SC-9 all green with tokens. A classifier may not weaken this
      table and may not stamp Achieved on a sub-inner or on WAVE 3 alone.

SCRIPT TESTING
==============

Host scripts against shipped sources; `bun test` per wave + the known-bad fixtures
that MUST refuse (the fallback-fixture, the forged-row fixture, the forged-retirement
fixture, the stale-graph fixture). Each wave line carries its own `bun test -t <id>`.
Script green is HYGIENE, never the ship gate — the gate is the live runtime behavior
below.

CONTAINER TESTING
=================

Rig: omp-ct:master (the headed OMP TUI container) + the host-live gate log
`/tmp/gi-gate.log`. Evidence dir: `.trident/ct-v2/cycle-<N>/`.

RB-IDENT        passToken: `graph-probe` returns `PROBE_TOOL_OK` + the session id
                failToken: no id, or a stale id from another session
RB-TOOLS        passToken: `graph-query` returns typed rows from the store
                failToken: zero rows while `typed_nodes` is non-empty
RB-FIREWALL     passToken: a forged reflex row is ABSENT to the reader
                failToken: the forged row is trusted
RB-LIFECYCLE    passToken: the reflex row supersedes with a VERIFIED successor
                failToken: an unverified supersede retires a live row
RB-INTEGRATION  passToken: an Edit on a quarantined symbol REFUSES with the code
                failToken: the edit lands
RB-ERRORS       passToken: a down layer yields `GI_STACK_INCOMPLETE:<layer>`
                failToken: the act proceeds
RB-CONFIG       passToken: pointing the store path at a missing dir emits GI_POPULATE_FAILED
                failToken: it silently creates an empty store

CLASSIFIER FIREWALL
===================

A sub-inner PASS or a LIVE INNER turn is NOT /goal complete. A fixture run, an
OK-chat, or a pytest-only green MUST NOT close this pin — those are evidence, never
done; a fixture or a sub-inner is NOT /goal done. Only the last SC row (WAVE 4) is the legal stop. The classifier may not
weaken the SC table and may not demote WAVE 3 or WAVE 4 to optional evidence.

HYDRA ORCHESTRATOR
==================

Orchestrator never writes product while a leaf can write. min 5 live desks per turn;
cap 4 product-file writers; strictly disjoint write-sets per desk. Preflight before
dispatch: `.trident/wave-plan.md` with `WAVES: N`, the script tests, the CT plan.
CLAIM-IS-A-CLAIM: re-run every gate on disk; never trust a return.
Dispatch law, pinned: MISSION / READ FIRST / KNOWN STATE / TASKS WHAT-HOW-WHY /
CONSTRAINTS / VERIFICATION / RETURN. Kick cut desks; never stamp Achieved on a
sub-inner. Record the board the same turn.

ANTI-PATTERNS
=============

AP-1  Inverted component    — writing to `gi_exec_graph`, the retracted invention.
                               kill: architecture review; the name is banned.
AP-2  Constant confidence   — a mapper emitting one value for all rows.
                               kill: SC-6 distinct-value count.
AP-3  Silent staleness      — a stale graph read as fresh. kill: SC-7.
AP-4  Unverified retirement — an unsigned supersede disabling a live row. kill: SC-5.
AP-5  Prose token           — a pass claimed without the tool output.
                               kill: every token must be a tool result.
AP-6  Fallback invention    — a regex/indexer substitute for a down engine.
                               kill: the F-48 law; SC-3.
AP-7  Happy-path-only       — the battery green on the good input only.
                               kill: the adversarial-first law; the forgery tests first.
AP-8  Sub-inner close       — a closed inner sold as the pin complete.
                               kill: the CLASSIFIER FIREWALL.
AP-9  Store self-reference  — precision incremented instead of recomputed.
                               kill: recompute-and-diff against the ledger.
AP-10 Blind edit            — a code edit with no this-turn ripwire map.
                               kill: LAWS ripwire-first; remap then edit.

WAVE PLAN
=========

WAVES: 10. Parallel only where file sets are disjoint; START NOW opens the first
inner only (W1).

WAVE 1  THE STORE + THE LEDGERS      — `bun test -t st-gi-store`
        files: src/omp/typed-write.ts, src/omp/populate*.ts, rsi/*.ts
        GATE: layer_id present; the ledger tables exist; the partial index survives.
WAVE 2  THE GATE SKELETON + THE 3 DETECTORS — `bun test -t st-gi-v2-gate`
        files: src/omp/graph-gate.ts, src/omp/gate-hook.ts
        GATE: STAGE 0..6 wired; a down layer REFUSES (SC-2).
WAVE 3  THE ENFORCEMENT KERNEL + THE RSI SEAM — `bun test -t st-gi-v2-kernel`
        files: enforcement/**/*.ts, rsi/**/*.ts
        GATE: TSG + Abide wired; the reflex loop exercised; SC-8.
WAVE 4  THE v3 BLUEPRINT + THE PACKAGE SEAL — `bun test -t st-gi-v2-seal`
        files: packages/gi-kernel-v2/**, reports/**
        GATE: PACKAGE_AUDIT PASS; every doc at floor; SC-9/SC-10 — the terminal wave.

## CURRENT REALITY (rewritten this turn from disk)

Measured at HEAD `c9bff81a56dc5bc5d5740623038d34507f6ab890` on `jarvis/gi-main`:
· `packages/gi-kernel-v2/ENFORCEMENT_ENGINE_MASTER_BLUEPRINT_v1.md` 1031L sha16 `2d5fda7e5165927d`
· `packages/gi-kernel-v2/GI_KERNEL_V2_MASTER_BLUEPRINT.md` 553L sha16 `b5d2dae01a604a47`
· `packages/gi-kernel-v2/RSI_ARCHITECTURE_v1.md` 371L sha16 `aec00c486c03c938`
· the v1.3 dist `83eb7bba9c5e76db` deployed; 28 test files; 12 gate tests
· the live store `…/sessions/gi-baseline000000000000/store.sqlite` 2,007,040 B:
  1266 nodes · 2714 edges · `confidence` = ONE distinct value (1.0) · populated
  2026-09-19 (2 days stale) · 1 of 6 namespaces populated
CLOSED: the v1.3 ship package (PACKAGE_AUDIT PASS); the enforcement blueprint; the
RSI architecture with the live guarded-seam proof.
OPEN: everything in T-1..T-10. No kernel v2 code exists yet.
Side desk live: `ParagonBoilerplate` (muse 1.3) extracting the guarded-seam boilerplate.

LAWS
====

RIPWIRE FIRST-CLASS: every coding edit maps structure first (`ripwire` verb=map /
for / callers / pack-task on the symbol) — no blind patches, no grep-as-architecture.
Builder-under-audit; append-only progress; evidence over prose; secrets out-of-band
(never repo, chat, or rows). No fallback anywhere: a down dependency is a LOUD named
failure. The enforcement record is written ONLY through the guarded seam.
