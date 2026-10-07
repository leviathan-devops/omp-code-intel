# CHECKPOINT MANIFEST — GI KERNEL V2.3 (the reflexive kernel)

**Sealed:** 2026-09-28 · **dist sha256:** `7d4e9db83263ba22` (810129B) · **mode:** no-lock (full-tree copy)
**branch:** jarvis/gi-main · **spec:** packages/gi-kernel-v2.3/GI_KERNEL_V2.3_DPL1_SPEC.md (SPEC-AUDIT: APPROVED 0/8)

## WHAT IS IN THIS CHECKPOINT

| the part | the count | the role |
|---|---|---|
| `src/` | 120 `.ts` | THE SOURCE (the fix target; the dist is built from it) |
| `extensions/graph-intelligence/index.js` | 1 | THE DEPLOYED BUNDLE (sha `7d4e9db83263ba22`) |
| `context_management/` | 11 docs | the canon (the self-continue mechanism) |
| `*.md` (ship docs) | 8 | BUILD_REPORT · DEBUG_LOG · FAILURE_LOG · SPEC_VIOLATION_LOG · TESTING_LOG · THEATRICALITY_LOG · OPERATOR_MANUAL · host-test-failure-log |
| `packages-gi-kernel-v2.3/` | the spec | the BINDING authority |
| `scripts/` + `tests/` | 26 + the V2.3 tests | the producers + the proofs |

## THE STATE (what is TRUE)

- **The V2.3 waves W0-W8 are GREEN.** The GI LSP emits fact-card diagnostics (18 on a real
  file, incl. a MEANING card with confidence 0.514 from the live JevK5). The Card-HUD queues
  cards on edits (doc-edits silent). The claim firewall's A-1 negated-span hole is closed. The
  de-brand is complete (`grep -ri trident src/ scripts/` → 0) with a lazy read-fallback
  (`resolveStateRel` → `priorStateDirs`). The boot-persistence timer is ACTIVE. The graph-health
  gate is wired as `gi-populate`'s final step.
- **THE W0 HEADLINE:** structural 70453 → 7866 nodes (12.4% → 100% in-scope). The mechanism: a
  PY/TS divergence in source-root discovery (the glob-prefix law never ported to Python).
- **THE BATTERY:** 464 pass / 2 fail. Both fails are the build's OWN staleness gates
  (`st-w3-audit` needs the regenerated audit artifact — the W9 audit is RUNNING; `st-artifact-coverage`
  is fixed by the rebuild).
- **tsc:** EXIT 0.

## THE HONEST GAPS

- The whole-tree audit is IN FLIGHT (the S9 deliverable). Its verdict is NOT yet in this seal.
- The CONTAINER domain (omp-ct-gi20) of the runtime-testing ladder is NOT run on this dist.
- The LSP's live OMP-TUI consumption (S2) is CONFIG-proven (lsp.json + the JSON-RPC transcript),
  NOT observed through the OMP client on this host.
- A-2..A-6 of the claim firewall are SCOPED, not all fixed (A-1, the headline, is fixed + tested).

## THE PROVENANCE (the dist is built from THIS src)

The bundle was built by `bash scripts/build-extension.sh` (bun build, target bun, esm, bundle,
`--external typescript --external @huggingface/transformers`). The V2.3 seams in the bundle
(verified by grep): `attachCardHud` ×2 · `fileCards` ×2 · `meaningCard` ×2 (the F-95 check passes).
