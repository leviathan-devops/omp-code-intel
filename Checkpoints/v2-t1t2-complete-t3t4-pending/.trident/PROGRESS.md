# PROGRESS — OMP_CODE_INTEL goal loop (append-only)

## cycle-0 · 2026-09-12 · orchestrator

- Pin minted + validator PASS (exit 0). Loop scheduled: cron 9f5ffdce, */20 * * * *.
- Preflight: .trident/wave-plan.md written (WAVES: 4, disjoint write-sets, known-bad, RB tokens).
- CONTRACTS.md written (interface-first: shim/tagstore/ast/edit/entry signatures pinned for all desks).
- W1 (T8) STARTED. Dispatching 5 desks in one batch: W1-A scaffold-shim, W1-B ast, W1-C edit, W1-D entry, W1-E tests.
- NEXT: collect returns → tsc + ST gate → fix → RB-01/RB-02 container spot.

## cycle-0b · 2026-09-12 · orchestrator — W1 collection + fixes

- WAVE 1 collected: 5/5 desks returned. A/C/D success, B success-with-bug, E partial (ST spine correct, 6 FAILs isolating B's bug).
- claim-is-a-claim: orch re-ran everything. Two real bugs found + FIXED surgically:
  1. src/ast.ts toAbs: file-root search targets resolved native-relative paths against the FILE → fixture.ts/fixture.ts ENOTDIR (6 ST FAILs). Fix: statSync base → dirname for file roots. All 4 call sites covered.
  2. src/index.ts: `export const id` string export poisons the 0.1.14 legacy loader (getLegacyPlugins throws on non-function exports; swallow → silent plugin drop). Fix: FUNCTIONS ONLY (id removed, lives in package.json). Loader law documented in header.
  3. src/shim.ts toPathList("") → ["."] (W1-B promoted finding).
- W1 GATE (orch-run): bun x tsc --noEmit EXIT 0; bun run tests/st/run.ts → 11/11 PASS, EXIT 0.
- Post-fix entry: ids = ast_edit,ast_grep,omp_edit,resolve; exports = default,server (functions only).
- package.json main/exports → src/index.ts (Bun-native TS import for file-source loading).

## cycle-0c · 2026-09-12 · orchestrator — W1 CONTAINER GATE PASS

- Rig: mimo-ct container omp-intel-w1 (image mimo-ct:master); plugin deployed to /root/MIMOCODE_WORKSPACE/dist/omp-code-intel; registered via mimocode.jsonc file-source entry; bun install resolved pi-natives-linux-x64 in-container.
- Rig lessons: container restart re-seeds config + workspace from image (config edits + fixtures re-applied AFTER restart; plugin dir + node_modules survive). TUI binary = /root/.mimocode/bin/mimo; restart boot script's bare `mimo` PATH miss poisoned a bash pane — killed the tmux session, relaunched directly.
- S1 AUTH PROBE PASS: status bar "Build · Muse Spark 1.3 Contributor OpenCode Go".
- S2 PASS (RB-01): on-screen tool result "matches=3 files=1 searched=1 limitReached=false" + "[work/fixture.ts]#b537" + 1:/2:/3: anchor lines; tag == sha256 prefix of fixture.
- S3 PASS (RB-02): omp_edit tag=ffff → "STALE_ANCHOR: ... changed since" in tool-result context; exec sha256sum UNCHANGED. Zero bytes written on rejection.
- S4 PASS: omp_edit tag=b537 valid hunk → "applied 1 hunk(s) → work/fixture.ts#e29e"; disk line2 = logger.debug(2); new sha e29e93c4 == new tag e29e. FULL ANCHOR LOOP PROVEN LIVE.
- Results artifact: .trident/container-test-results.json (overallVerdict pass, phaseE all-10 true). T8 (W1) → done.
- NEXT: dispatch W2 (merkle+evidence, ttsr, index hook wiring, ST suites).

## cycle-0d · 2026-09-12 · orchestrator — W2 dispatched

- CONTRACTS-W2.md written (merkle port spec, evidence tool, ttsr API, index hook wiring, ST rows).
- WAVE 2 dispatched, 5 desks one batch: W2-A merkle+evidence (6), W2-B ttsr (7), W2-C index hook wiring (8), W2-D merkle ST (9), W2-E ttsr+hooks ST (10).
- OPEN INNER = WAVE 2. On collection: tsc + ST suite (expect 17+ scenarios) + fix + RB-03 spot (corrupt row → "integrity": false) in omp-intel-w1 (container kept alive).
- Container omp-intel-w1: ALIVE, plugin registered, config+fixture re-seeded post-restart. RB-01/02 evidence on record.

## cycle-1 · 2026-09-12 · orchestrator — W2 LOCKED

- W2 collected 5/5 (merkle+evidence, ttsr, index hooks, merkle ST, ttsr+hooks ST). Orch gates: tsc 0; ST 31/31 exit 0.
- Orch fixes this wave: evidence tool was specced but never registered — added to tool map (gated opts.merkle); container proved the miss ("No tool named exactly evidence") then the fix.
- Container RB-03 (omp-intel-w2b, fresh rig after omp-intel-w1 was recreated under us by foreign CT state — connect() remedy documented): S1 auth PASS; S2 PASS chain=3 integrity=true (rendered); S3 PASS exec sed 2d → chain=2 integrity=false (rendered). SC-8/SC-9 + RB-03 done. SC-12/13 proven at hook level in ST (inject marker + compaction persistence + zero-misfire + byte-identical outputs).
- Rig lessons: CT tool session state can drift to a foreign container (deploy/cp misrouting to gi-ct8) — remedy action=connect <name>; hand-relaunch (kill tmux + new-session) preserves workspace/config, only the restart ACTION wipes.
- NEXT: dispatch W3 (eval kernels: KernelManager, RPC bridge, prelude, index eval wiring, ST suites) per CONTRACTS-W3.

## cycle-2 · 2026-09-12 · orchestrator — W3 dispatched

- CONTRACTS-W3.md written (driver-protocol kernels, prelude strings, rpc v1 scope, eval gates, ST rows, suite-ordering law).
- WAVE 3 dispatched, 5 desks one batch: W3-A kernels (11), W3-B prelude (12), W3-C index eval wiring (13), W3-D eval ST (14), W3-E gates ST (15).
- OPEN INNER = WAVE 3. On collection: tsc + ST (expect ~38 scenarios) + fix + RB-05/06/07-class container spot (kernel persistence, concurrency, KERNEL_MISSING) in a fresh rig.
- Rig notes banked: CT session state can drift (deploy/cp misroute) → remedy action=connect <name>; hand-relaunch (kill tmux + new-session mimo) preserves workspace+config; only the restart ACTION wipes.
- W2 evidence: .trident/container-test-results.json suites += W2-spot-RB03 (overallVerdict pass).

## cycle-4 · 2026-09-12 · orchestrator — W3 LOCKED + W4 dispatched

- W3 collected 5/5. Orch gate: tsc 0; ST 47/47 exit 0 (zombie-hardened psScan orch fix; honest exit capture — prior exit-0-on-FAIL was my pipeline measurement trap, runner correct).
- Container RB-05 PASS on-screen (omp-intel-w2b): eval py two-cell persistence → 42. RB-06/07 ST-form with deferral notes in artifact. SC-19 satisfied (T5 done).
- CONTRACTS-W4.md written. WAVE 4 dispatched, 5 desks one batch: W4-A lsp vendor (16), W4-B grep shadow (17), W4-C index+advisor+store refactor (18), W4-D notices/npm prep (19), W4-E W4 ST suites (20).
- OPEN INNER = WAVE 4 (TERMINAL). On collection: tsc + ST (~55) → fix → FULL §12 battery in a fresh rig: all RB rows + RB-04 toggle-off reboot (config removed → restart → ids absent, builtins present) → SC-20 → LOCKED (T7).
- Note: advisor v1 = rule-scan over trajectory via W2 store (no model call) — honest scope documented in CONTRACTS-W4 + code header.

## cycle-6 · 2026-09-13 · V2 T1 (W1 v2 ports) DONE

- Built directly (actor spawn schema friction — subagents unavailable this tick; interface-first contracts carried the wave instead).
- src/read.ts NEW (shadow read: [path]#tag + Symbols + file#symbol selectors + NO_SYMBOL/READ_NOT_FOUND/READ_BINARY named).
- src/diag.ts NEW + edit.ts step-6 + ast.ts resolve apply: diagnostics-on-write in the SAME card; DIAG_UNAVAILABLE never fails a good write.
- src/eval/rpc.ts NEW + kernels.ts preamble hook (once-per-process, queue-ordered, warn-once): intel_read proven end-to-end inside py kernel (hello-rpc). JS re-entry NOT wired (preamble only py) — honest gap for T2 notes.
- src/mv.ts NEW (omp_mv) + client.willRename: LIVE-PROVEN import rewrite (./util → ./lib on disk). Mechanism fix found: tsserver needs didOpen before willRename (zero-edit answer without it).
- src/index.ts: omp_mv always-additive; read shadow opt-in-only; RPC watcher lifecycle (start on eval-enabled init, stop on session.post) + watcher unref (process-exit hygiene).
- NATIVE QUIRK (measured): astGrep file-scope drops statement patterns; extension-class globs don't rescue; fix = parent-dir + *ext + client-side filter + recomputed totals (src/ast.ts). astEdit/grep natives unaffected (proven).
- TS-GENERATION GUARD (measured): typescript-language-server needs TS≤5 w/ tsserver.js on disk (this env has TS 6); diagSection probes node resolution first → DIAG_UNAVAILABLE instead of a doomed handshake.
- Orch gate: tsc 0; ST 65/65 exit 0 (10 new v2w1 rows); registration probe (7 base ids + read under shadow); clean process exit; no cwd residue.
- NEXT: T2 battery construction (safetyProbe + malformed/concurrency/hygiene/soak + 6-section CT plan) per spec T2.

## cycle-7 · 2026-09-13 · V2 T2 (battery) DONE — host gate green

- tests/st/safety.st.ts NEW (14 rows): destructive sha-diff (stale-tag shaEq, readonly-file READ_ONLY_FILE, stale-resolve count-drift), malformed (empty/10MB/binary/unicode/wrong-types→INVALID_ARGS), concurrency (parallel edits exactly-one, parallel eval serialized), hygiene (no tmp leftovers, killAll-zero), soak ×3, tree-stability control.
- Product fixes the battery forced: omp_edit INVALID_ARGS guard (wrapper doesn't enforce zod — raw values reached path.join); READ_ONLY_FILE bit check (atomic tmp+rename bypasses file bits); read.ts literal-path-wins for `#`-in-filenames.
- Native behaviors measured + documented (not bugs): file-scope statement-pattern drop → parent-dir+ext-glob+filter fix in ast.ts; identical-content cross-file dedup; sub-second dir-scan cache staleness (soak pre-creates fixtures); typed-const needs `: $T` pattern form.
- Orch gate THIS TURN: tsc 0; ST 79/79 exit 0 (/tmp/st-t2final.log); no cwd residue. CT plan written: .trident/CT-PLAN-V2.md (4,987 chars ≥2000 floor).
- BLOCKER for T3: this session has NO container tool (mimo-ct absent from tool surface; raw docker run/exec into test rigs is lock-blocked). T3 container execution must run in the equipped session. T9 → done; T10 open, blocked on tool surface.

## cycle-8 · 2026-09-13 · tick — gates fresh, T3 still blocked

- Re-ran host gates: tsc 0; ST 79/79 exit 0 (/tmp/st-tick.log); cwd clean.
- RB-20 before-shas snapshotted for T3: mimo-tree `81062406e7767b46` (packages/opencode/src + packages/plugin/src), project `c26667431a4a5da9` (src+tests+package.json+tsconfig). T3 compares these after the battery.
- Container tool still absent this session — no rig work attempted (prior lock probes stand). T10 open, T11 open.

## cycle-9 · 2026-09-13 · re-pin reconciled, gates fresh, T3 still blocked

- Operator re-pasted the goal pin (stale snapshot: said 65/65 + START NOW = T2). Reconciled against ground truth: T1✓ + T2✓ (ST 79/79), T3 open, T4 open. No work regressed; no duplicate dispatch.
- Re-ran host gates this turn: tsc 0; ST 79/79 exit 0 (/tmp/st-repin.log); cwd clean. Memory continuity confirmed via session checkpoint (ses_-ffe5f6d829ed1ffesMfmJJDy6 owns the compose-next V2 loop; T10 in_progress, T11 open).
- Lock re-probed: docker exec into test rigs still BLOCK_MUTATION. T3 needs the equipped session. Standing by.

## cycle-10 · 2026-09-13 · tick — gates fresh, T3 still blocked

- Re-ran host gates: tsc 0; ST 79/79 exit 0 (/tmp/st-tick2.log); cwd clean.
- No container tool in this session; T10/T11 stay open. No code moved this tick (nothing to fix — suite green).

## cycle-11 · 2026-09-13 · tick — gates fresh, T3 still blocked

- Re-ran host gates: tsc 0; ST 79/79 exit 0 (/tmp/st-tick3.log); cwd clean.
- Noted: cycle entries append out of order (cycle-5/cycle-3 sit after cycle-10) — cosmetic only, no content lost; normalize if the file is ever machine-parsed.
- T10/T11 open, blocked on container tool surface.

## cycle-5 · 2026-09-12 · orchestrator — W4 LOCKED + TERMINAL GATE MET (SC-20)

- W4 collected 5/5: lsp client+tool (533/800 LoC, live-proven vs real tsserver: hover/definition/references/diagnostics/rename), grep shadow (d.ts-wins: native `grep` export, ignoreCase/maxCount), index shadow+advisor wiring + ttsr store refactor (W2 suite byte-identical), THIRD-PARTY-NOTICES + README + npm pack dry-run (24.8 kB, 17 files, publish NOT executed), w4.st.ts 8 rows.
- Orch gate: tsc 0; ST 55/55 exit 0 (direct capture). lspTool flat contract shape confirmed at every return path (W4-C's mid-flight mismatch resolved in W4-A's landed version).
- TERMINAL BATTERY (omp-intel-term, 4100-char plan validated): S1 auth ✓; S2 RB-01/SC-3/4 ✓ (matches=3 + #b537); S3 RB-02 ✓ (STALE_ANCHOR + sha unchanged); S4 ✓ (applied → #2f41, disk + chain row); S5 SC-17 ✓ (out-of-band append → STALE_ANCHOR, exec bytes preserved); S6 RB-05 ✓ (42); S7 RB-03 ✓ (3 rows → sed middle → chain=2 integrity=false; first 2-row geometry was a test error — single-node truncation is true per ported semantics, corrected); S8 SC-14 ✓ (shadow grep native grammar in-container); S9 RB-04/SC-15 ✓✓ THE LEGAL STOP: plugin entry removed → fresh boot → "No such tool exists" + builtin read works (fixture edits persisted); S10 ✓ (restore → ast_grep back); A1 zero zombies; A2 named rejection; A3 tsserver absent in image → honest skip (SC-16 proven at ST + W4-A host live-probes).
- SC-20 ARTIFACT: .trident/container-test-results.json suites += W4-terminal, overallVerdict "pass". ALL TASKS T1-T7 DONE. GOAL LOCKED.
- Final surface: 6 additive tools (ast_grep, ast_edit, resolve, omp_edit, eval, evidence) + 2 opt-in shadows (grep, lsp) + advisor (opt-in), 7 hooks, 55 ST scenarios green, 4 container suites green across 3 rigs.

## cycle-3 · 2026-09-12 · orchestrator — W3 LOCKED

- W3 collected 5/5. Orch gate: tsc 0; ST 47/47 exit 0 (REAL exit via direct capture — prior ST_EXIT=0-on-FAIL was my pipeline trap reading tail's exit; runner was correct).
- Orch fix: psScan zombie-hardening (defunct/Z rows excluded — a killed-but-unreaped driver raced the 2s window; ground truth showed 0 live procs after).
- Container RB-05 PASS on-screen: eval py two-cell persistence (42) in omp-intel-w2b. RB-06/RB-07 proven ST-form with honest deferral notes in artifact.
- W3-B contract deviation accepted: node:vm persistent context for js drivers (new Function+with cannot persist const across cells — proven by experiment). Await-keyword limitation documented for tool help (W4-D).
- NEXT: dispatch W4 (shadows + ship): lsp vendor, grep shadow, advisor, index wiring, notices/npm prep, W4 ST — then TERMINAL battery + toggle-off proof (SC-20).

## cycle-12 · 2026-09-13 · tick — gates fresh, goal re-pinned for hydra+qwen-gate

- Re-ran host gates: tsc 0; ST 79/79 exit 0; cwd clean.
- Operator ordered: remaining work under /hydra-mode with /qwen-code-review (= qwen-code-audit skill, verified on disk) as ship-gate guardian judge enforced by the goal loop. Re-pin minted this turn.
- T10/T11 open, blocked on container tool surface in this session.

## cycle-13 · 2026-09-13 · tick — gates fresh, T3 still blocked

- Re-ran host gates: tsc 0; ST 79/79 exit 0 (/tmp/st-tick4.log); cwd clean.
- No container tool in this session; T10/T11 stay open. No code moved (suite green).

## cycle-14 · 2026-09-13 · re-pin accepted, gates fresh, T3 still blocked

- Operator re-pinned the hydra-mode + qwen-judge goal (WAVES: 3, START NOW = T3 preflight). Memory continuity confirmed (ses_-ffe5f6d829ed1ffesMfmJJDy6 owns the loop; prior fires established skill loads + terminal-battery laws).
- Re-ran host gates: tsc 0; ST 79/79 exit 0 (/tmp/st-tick5.log); cwd clean.
- No container tool in this session; T10/T11 stay open. T3 preflight cannot proceed past P3 without a rig — standing by for an equipped tick.
