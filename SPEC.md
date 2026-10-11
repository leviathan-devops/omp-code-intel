job: fence
seat: graph-intelligence
mission: >
  The GI enforcement kernel — a system-level copilot that surfaces relevant critical data on
  every tool call so the agent cannot make ignorant or unaware decisions. The five gates
  (G1 retrieval · G2 query-edit · G3 substrate · G4 derail-class · G5 done) sit ON THE ACTION
  PATH; the LOCAL Jev judge (jevk5-4b, :8090, free) decides; the enforcer is mechanical
  (throw-with-a-named-remedy or serve); every decision is ledgered. A layer is LIVE IFF a
  decision passed through it, else GI_NOT_GATED. The failure this fence prevents: a gate that
  fires on every turn end, fail-closed, on an uncalibrated judge (the v2.4 turn-brick — 5/5
  normal turns blocked). The trigger is "a completion claim" (a claim atom), never every turn;
  the negative half runs FIRST; the threshold is derived from a control set; the proof is
  /prove-it, never a direct-call probe.
artifact: reports/CASTRATE_THE_TURN_BRICK_BLUEPRINT_v1.md
steps:
  - id: step-0-typecheck
    run: bunx tsc --noEmit
    expect: EXIT 0 (no type errors in the restored v2.3 src)
  - id: step-1-battery
    run: bun test
    expect: 0 fail (the ST suite green)
  - id: step-2-spec-reconciliation
    run: test -f reports/SPEC_VS_BUILD_V24_RECONCILIATION.md
    expect: present (the spec-vs-build audit is committed)
  - id: step-3-no-turn-brick
    run: grep -rlE 'GI_DONE_UNPROVEN|GI_RETRIEVAL_GATE|GI_NO_SUBSTRATE' src/ | wc -l
    expect: 0 (the v2.4 turn-brick markers are gone from the live src)
sha16:
