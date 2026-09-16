# CONTAINER TEST PLAN — mimo-code-intel v2 battery (T2 deliverable, T3 executes)

## 1. OBJECTIVE

Prove the v2 production zeros in a live mimo-ct TUI rig: 0 runtime errors
(no crash/hang/unhandled rejection on any path), 0 misfires (every named
rejection fires exactly; legit flows unmuted), 0 destructive actions (no
rejection/timeout/shadow path corrupts state it doesn't own). Covers the v2
diff (read shadow, diag-on-write, eval RPC, willRename, renamed surface) plus
v1 regression (anchor loop, kernels, merkle, toggle lifecycle). Every claim
lands in a real MiMo session; tokens are tool-result-bound (⚙ card context);
exec sha/diff/ps is disk truth. Agent prose as evidence is CIRCULAR → FAIL.

## 2. TOOLS UNDER TEST

Plugin `mimo-code-intel` v0.2.0 (projects/omp-code-intel, 20 src modules):
additive ids ast_grep/ast_edit/resolve/mimo_edit/eval/evidence/mimo_mv +
opt-in shadows read/grep/lsp + hooks (execute.after merkle+ttsr, transforms,
compacting, file.edited, session.post). Blast radius: registration set per
options, all execute paths, chain file, kernel lifecycle, server-cwd RPC dir.
Builtins untouched except under explicit shadow opt-in. Zero MiMo-core edits.
Diff under test vs v1 LOCK: src/read.ts, src/diag.ts, edit.ts step-6,
ast.ts resolve path, src/eval/rpc.ts + kernels preamble hook, src/mv.ts +
client.willRename, index.ts wiring, renamed surface (mimo_edit etc).

## 3. TEST SCENARIOS (each: prompt shape / passToken / failToken / max)

S1 AUTH PROBE (first, always): trivial tool call. PASS: live status bar +
rendered result. FAIL: provider/credit error. Max 120s.
S2 RB-11 read shadow: read work/fixture.ts under shadow:["read"]. PASS:
`[work/fixture.ts]#` + `Symbols:` in card. FAIL: raw dump, no tag. Max 180s.
S3 RB-11b selector: read work/fixture.ts#<symbol>. PASS: window centered on
symbol line. FAIL: NO_SYMBOL on a present symbol. Max 180s.
S4 RB-12 diag-on-write: mimo_edit writes a type error into .ts fixture.
PASS: `[error]` diagnostics row in SAME card. FAIL: silence. Max 240s.
S5 RB-13 eval re-entry: eval py `intel_read("data.txt")` then print. PASS:
file content in kernel stdout. FAIL: RPC_TIMEOUT. Max 240s.
S6 RB-14 willRename: mimo_mv module with importer. PASS: `imports updated
in 1 file(s)` + rewritten import on disk. FAIL: broken import. Max 240s.
S7 RB-02/RB-15 stale firewall: mimo_edit tag ffff. PASS: STALE_ANCHOR +
exec sha unchanged. FAIL: bytes changed. Max 180s.
S8 RB-05 kernel persistence (regression): eval py x=41 then print(x+1).
PASS: `42`. FAIL: undefined. Max 240s.
S9 RB-03 corruption (regression): 3 chain rows → sed delete middle →
evidence. PASS: `integrity=false`. FAIL: true post-corruption. Max 180s.
S10 RB-04 toggle-off reboot (regression): remove plugin entry → fresh boot →
ast_grep probe. PASS: "No such tool exists" + builtin read works. FAIL: any
plugin tool renders. Then restore → ast_grep back (toggle-on sanity). Max 300s.
S11 renamed-id proof: mimo_edit named on-screen in a real card (closes the
prior inconclusive spot). PASS: `⚙ mimo_edit` renders + applied/retag.
FAIL: id absent. Max 180s.
S12 concurrency: two prompts same-file same-tag (sequential sends, race at
the tool). PASS: exactly one applied + loser STALE_ANCHOR + sha == winner.
FAIL: double success. Max 240s.

## 4. ADVERSARIAL (each its own round, never mixed into golden path)

A1 fork-kill: eval `import multiprocessing; [Process(...).start() for _ in
range(50)]` @ 3s timeout. PASS: EVAL_TIMEOUT + 0 surviving procs (tree kill).
FAIL: hang or survivor. Max 120s.
A2 malformed burst: empty pat, 10MB file read, binary read, unicode name.
PASS: named rejection each (incl. READ_BINARY), outBytes bounded. FAIL: stack
trace or hang. Max 300s.
A3 readonly: chmod 444 fixture → mimo_edit valid tag. PASS: READ_ONLY_FILE +
sha unchanged. FAIL: bytes changed. Max 180s.
A4 corrupt kernel binary (binOverrides equivalent in-container: PATH without
python): eval py. PASS: KERNEL_MISSING. FAIL: stack dump. Max 120s (skip
honestly if python cannot be hidden in the image; ST covers it).

## 5. EVIDENCE

Fresh mimo-ct rig per wave (never reuse stale rigs: restart ACTION wipes
config+workspace; hand-relaunch preserves; action=connect on CT misroute).
Per scenario: on-screen ⚙ card + exec outputs (sha256sum, wc -l, sed, ps,
config greps). Results appended (never mutated) to
projects/omp-code-intel/.trident/container-test-results.json as `v3-battery`
suite + Phase E block. Crash handlers + unhandledRejection tee wired from
round zero; soak log inspected, not assumed.

## 6. PASS CRITERIA

S1–S12 all PASS in tool-result context; A1–A4 PASS or honest-skip with
recorded reason; shaEq on every rejection; residue sweep empty (0 drivers,
0 tmp, chain frozen); core-tree sha identical before/after; tsc 0 + ST green
at every fix round; overallVerdict pass written. Any FAIL →
two-sided adjudication → minimal fix → identical-scenario retest →
zero regressions. Legal stop: SC-11 rows green.
