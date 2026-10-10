# ⚠️ GI KERNEL V2.4 — DO NOT DEPLOY TO THE LIVE HOST

**Status: UNTESTED ON LIVE. REVERTED 2026-10-10.**

## What happened
The v2.4 gates (W1-W6) were deployed to the LIVE host WITHOUT a container test. A live session
was BROKEN: `GI_DONE_UNPROVEN: DONE_ROUTE_ACT: judge refuse p=0.643` blocked a legitimate read
(The DOC-ROUTE-ACT judge misfired on a normal `Read` call).

## The law this violated
"NEVER SHIP BROKEN UNTESTED GARBAGE TO LIVE. TEST IN A CONTAINER PROPERLY."
The v2.4 "proofs" were DIRECT FUNCTION CALLS (bun run on the source), NOT a runtime test on the
live host. A direct call does not prove the gate behaves under the REAL tool_call path.

## The revert (done)
- The live extension reverted to v2.3: sha `2e2a39031c6059ca` (0 v2.4 markers).
- The lexicon-gate re-enabled → DISABLED (the sentinel `~/.omp/run/lexicon-gate.OFF` restored).
- config.yml `bash.patterns` removed. ttsr stays `false`.
- The repo's dist reverted to v2.3.

## To ship v2.4 (the ONLY path)
1. Build the container rig (the deep-container-testing skill).
2. Run the DPL1 §10 suite: the POSITIVE (every gate refuses) + the NEGATIVE (legit ops serve,
   ZERO misfire — the F-6-class misfire is what broke live).
3. The artifact at `.omp/ct-results.json`. NO ARTIFACT, NO DEPLOY.
4. Only after Phase E (all 10) + the negative half green → deploy.
