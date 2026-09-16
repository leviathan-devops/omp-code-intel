# WAVE PLAN — OMP_CODE_INTEL (frozen at cycle 0 — 2026-09-12)

WAVES: 4
Ship target: omp-code-intel plugin LOCKED per OMP_CODE_INTEL_DPL1_SPEC.md (SC-20 = container artifact pass + toggle-off reboot proof).

## Disjoint write-sets

W1 anchor loop (OPEN):
- W1-A scaffold-shim: package.json, tsconfig.json, .gitignore, src/types.ts, src/config.ts, src/shim.ts, src/tagstore.ts
- W1-B ast-tools: src/ast.ts
- W1-C edit-tool: src/edit.ts
- W1-D entry: src/index.ts
- W1-E tests: tests/st/harness.ts, tests/st/ast.st.ts, tests/st/edit.st.ts, tests/st/run.ts

W2 governance + rules: src/merkle.ts, src/evidence.ts, src/ttsr.ts, edits to src/index.ts (hooks), tests/st/merkle.st.ts, tests/st/ttsr.st.ts
W3 kernels: src/eval/kernels.ts, src/eval/rpc.ts, src/eval/prelude.ts, tests/st/eval.st.ts
W4 shadows + ship: src/lsp/client.ts, src/lsp/tool.ts, src/grep.ts, src/advisor.ts, THIRD-PARTY-NOTICES, npm prep

No file appears in two waves' write-sets (index.ts: W1-D creates, W2 edits — sequential waves, no overlap in time).

## Gates

W1 GATE: `bun install` exit 0 + `bun x tsc --noEmit` 0 + `bun run tests/st/run.ts` exit 0 + container spot RB-01 RB-02 (tool-result tokens: "matchCount": / STALE_ANCHOR + exec sha unchanged).
W2 GATE: ST merkle+ttsr green + RB-03 ("integrity": false on corrupt row) + negative half (legit edits unmuted).
W3 GATE: ST eval green + RB-05 RB-06 RB-07.
W4 GATE (TERMINAL): full container suite §12 → .trident/container-test-results.json overallVerdict pass + toggle-off reboot proof (SC-20).

## Script-test known-bad (MUST refuse)

- stale tag omp_edit → STALE_ANCHOR, sha256 unchanged
- hunk old != line → ANCHOR_MISMATCH at line N, sha unchanged
- corrupt jsonl (drop middle row) → integrity false
- missing python → KERNEL_MISSING
- empty pat → named non-empty-pattern error

## Container plan (RB tokens — full text in spec §7/§12)

RB-01 TOOLS "matchCount": / unknown tool
RB-02 FIREWALL STALE_ANCHOR + sha unchanged / bytes changed
RB-03 STATE "integrity": false / "integrity": true
RB-04 LIFECYCLE ids() swap on toggle / ast_grep present after off
RB-05 INTEGRATION kernel var echo / undefined
RB-06 CONCURRENCY exactly one applied / double success
RB-07 ERRORS KERNEL_MISSING / stack dump
RB-08 CONFIG named disabled-error / py executes
