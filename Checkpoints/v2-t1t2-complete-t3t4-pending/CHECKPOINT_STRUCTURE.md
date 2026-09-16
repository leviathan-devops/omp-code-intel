# CHECKPOINT STRUCTURE — v2-t1t2-complete-t3t4-pending

- `src/` — 20 modules: index, shim, config, types, tagstore, ast, edit,
  read, diag, merkle, evidence, ttsr, advisor, grep, mv, lsp/{client,tool},
  eval/{kernels,prelude,rpc}. 32 .ts with tests/, verified count match.
- `tests/st/` — harness, run, ast, edit, merkle, ttsr, hooks, eval,
  eval-gates, w4, v2w1, safety (12 files, 79 scenarios).
- `.trident/` — PROGRESS.md, wave-plan.md, container-test-results.json,
  CT-PLAN-V2.md.
- Root docs — package.json, tsconfig.json, README.md, THIRD-PARTY-NOTICES,
  bun.lock, OMP_CODE_INTEL_DPL1_SPEC.md, CONTRACTS.md, CONTRACTS-V2-W1.md,
  CONTRACTS-W2.md, CONTRACTS-W3.md, CONTRACTS-W4.md.
- `CHECKPOINT_MANIFEST.md` — state, SHAs, gates, honest gaps, re-verify cmds.
- No node_modules (rebuilt via `bun install`; pi-natives 18.1.18 pinned).
- No dist/ (source-only plugin), no context_management/ (canon in PROGRESS +
  workspace memory), no standalone ship logs (PROGRESS is the build log).
- Mode B mutable snapshot — no chattr lock (guardian-owned layer).
- Per-file roles: index.ts (entry+hooks) / shim.ts (ctx+options) /
  config.ts (defaults) / types.ts (Ctx) / tagstore.ts (hash tags) /
  ast.ts (ast_grep/edit/resolve) / edit.ts (mimo_edit) / read.ts (shadow
  read) / diag.ts (diagnostics helper) / merkle.ts + evidence.ts (chain) /
  ttsr.ts (rules+store) / advisor.ts (trajectory scan) / grep.ts (shadow) /
  mv.ts (mimo_mv) / lsp/client.ts + tool.ts (vendored client+tool) /
  eval/kernels.ts + prelude.ts + rpc.ts (drivers+bridge).
- Test roles: harness (Effect spine) / run (concat+timeout runner) / ast,
  edit, merkle, ttsr, hooks, eval, eval-gates, w4, v2w1, safety suites.
- State: v1 LOCKED + V2 T1/T2 done; T3/T4 open. Honest gaps in manifest.
