# CONTAINER TEST PLAN — mimo-code-intel v4 OBSERVABILITY battery

## OBJECTIVE

Convert every plugin surface that is currently ST-only (script-test), tool-layer-only
(in-container module probe), image-blocked, or structurally unobservable into a LIVE TUI
observation with a typed tool part in the session database (or, for hook paths, a
plugin-written receipt file). Changed surface vs v3c: NO source change — this battery is
purely observational; it exercises src/ast.ts (ast_edit, resolve), src/evidence.ts,
src/eval/rpc.ts (negative paths), src/grep.ts (shadow grep), src/lsp/tool.ts (shadow lsp),
src/eval/kernels.ts (js driver), src/diag.ts (image-dependent), src/ttsr.ts (reminder
receipt), src/advisor.ts (advisor receipt). Rig: mimo-intel-v2-t4, image mimo-ct:master,
plugin tree /root/MIMOCODE_WORKSPACE/mimo-code-intel (file-source plugin entry in
/root/.config/mimocode/mimocode.jsonc). HONEST SCOPE: the diag row depends on the image
shipping typescript-language-server; if it is absent the row must be recorded as an honest
skip with the image proof, never claimed. Tokens must appear in typed tool parts
({"type":"tool",...}) or a receipt file, never in agent prose (circular = FAIL). Never reuse
omp-intel-term (wedged), gi-ct8 or mode-guard-ct2 (foreign).

## TOOLS UNDER TEST

- ast_edit + resolve (src/ast.ts) → Scenario 2, Scenario 3
- evidence (src/evidence.ts + src/merkle.ts) → Scenario 4, Scenario 5
- eval + intel_read RPC negative paths (src/eval/rpc.ts, src/eval/kernels.ts) → Scenario 6
- js driver re-entry (src/eval/kernels.ts PREAMBLE_JS) → Scenario 8
- kernel persistence + concurrency (src/eval/kernels.ts) → Scenario 7, Scenario 9
- shadow grep (src/grep.ts) → Scenario 10
- shadow lsp tool (src/lsp/tool.ts) → Scenario 11
- diag-on-write (src/diag.ts + src/edit.ts step 6) → Scenario 12
- ttsr reminder path (src/ttsr.ts + receipt) → Scenario 13
- advisor hook (src/advisor.ts + receipt) → Scenario 14
- blast radius: src/index.ts wires every surface above; Scenario 1 covers auth + registry.
Every changed file has a scenario; no coverage gap remains.

## TEST SCENARIOS

### Scenario 1: AUTH + registry probe
- Feature under test: live TUI auth + the additive tool registry
- Prompt: Call ast_grep with pat console.log($$$) on work/fixture.ts and return the tool result.
- Pass token: matches= in a tool part
- Fail token: 401 / unauthorized
- Max wait: 120000
- Evidence capture: check the tool part + status bar

### Scenario 2: ast_edit propose (dry)
- Feature under test: ast_edit stages a pending op, writes nothing
- Prompt: run ast_edit on work/sel-probe.ts with a pattern that matches line 1 and a staged replacement; report the tool result verbatim.
- Pass token: proposed
- Fail token: applied before resolve
- Max wait: 180000
- Evidence capture: tool part output + exec sha256sum unchanged

### Scenario 3: resolve applies
- Feature under test: resolve consumes the staged op and writes with a fresh tag
- Prompt: run resolve with reason "observability row" and report the raw tool result.
- Pass token: applied and a #[0-9a-f]{4} tag in the same card
- Fail token: NOTHING_STAGED
- Max wait: 180000
- Evidence capture: tool part + disk content + sha moved

### Scenario 4: evidence integrity true
- Feature under test: merkle chain reads fresh from disk
- Prompt: run evidence and report the raw tool result.
- Pass token: integrity=true
- Fail token: integrity=false with an intact chain
- Max wait: 180000
- Evidence capture: tool part output

### Scenario 5: evidence integrity false after middle delete
- Feature under test: middle-row deletion invalidates the chain
- Prompt: (shell) delete the middle row of .mimocode/mimo-intel/merkle-chain.jsonl, then run evidence again and report the raw result.
- Pass token: integrity=false
- Fail token: integrity=true after the delete
- Max wait: 180000
- Evidence capture: tool part + exec wc -l of the chain

### Scenario 6: intel_read negative paths
- Feature under test: RPC dispatch confinement + size cap
- Prompt: eval py that calls intel_read on a path outside the workspace root, then on a 2MB file; report both raw results.
- Pass token: RPC_UNKNOWN_TOOL:read
- Fail token: a raw absolute path echo or a traceback
- Max wait: 240000
- Evidence capture: tool part outputs

### Scenario 7: kernel persistence
- Feature under test: two-cell state
- Prompt: eval py x = 41 then eval py print(x + 1).
- Pass token: 42
- Fail token: undefined / NameError
- Max wait: 240000
- Evidence capture: tool part

### Scenario 8: js-side re-entry
- Feature under test: PREAMBLE_JS intel_read
- Prompt: eval js that prints intel_read("work/data.txt").
- Pass token: hello-rpc
- Fail token: RPC_CJS_ONLY / RPC_TIMEOUT
- Max wait: 240000
- Evidence capture: tool part

### Scenario 9: three-cell concurrency
- Feature under test: per-language queue serializes envelopes
- Prompt: three eval py cells in one turn, each printing a distinct marker.
- Pass token: three distinct markers, no RPC_TIMEOUT
- Fail token: interleaved output or a timeout
- Max wait: 300000
- Evidence capture: three tool parts

### Scenario 10: shadow grep grammar
- Feature under test: opt-in grep replacement keeps the shared grammar
- Prompt: with shadow grep enabled, grep for a literal in work/.
- Pass token: matches= with [path]#tag rows
- Fail token: raw native output without the header
- Max wait: 180000
- Evidence capture: tool part

### Scenario 11: shadow lsp tool
- Feature under test: lsp tool reports NO_LSP_SERVER when the server is absent
- Prompt: with shadow lsp enabled, ask for a definition at a symbol.
- Pass token: NO_LSP_SERVER (named) when the server binary is absent
- Fail token: a thrown stack trace
- Max wait: 180000
- Evidence capture: tool part

### Scenario 12: diag-on-write
- Feature under test: diagnostics appended in the same mimo_edit card
- Prompt: mimo_edit a .ts line into a type error and report the SAME card.
- Pass token: [error] in the card
- Fail token: silence with the language server present
- Max wait: 240000
- Evidence capture: tool part metadata.diag; honest skip with image proof if absent

## ADVERSARIAL

### Scenario 13: ttsr receipt
- Feature under test: the reminder path is observable via a receipt
- Prompt: run a tool whose output contains console.log, then read the receipt file.
- Pass token: [mimo-intel rule in the receipt
- Fail token: no line while the trigger output matched
- Max wait: 180000
- Evidence capture: receipt file bytes

### Scenario 14: advisor receipt
- Feature under test: advisor hook with a model option set
- Prompt: post a trajectory containing console.log with advisor.model set.
- Pass token: advisor marker in the receipt
- Fail token: nothing on a matching trajectory
- Max wait: 180000
- Evidence capture: receipt file bytes

### Scenario 15: fork-storm timeout
- Feature under test: group kill leaves no survivors
- Prompt: eval py with an unguarded forking payload at timeout 3.
- Pass token: EVAL_TIMEOUT
- Fail token: any surviving python3 after the kill
- Max wait: 120000
- Evidence capture: tool part + exec ps count

### Scenario 16: malformed request burst
- Feature under test: named refusals, no stack traces
- Prompt: ast_grep with an empty pat; read a binary file; read a 10MB file.
- Pass token: named tokens (pat must be non-empty / READ_BINARY)
- Fail token: a stack trace or a hang
- Max wait: 300000
- Evidence capture: tool parts + bounded output

## EVIDENCE

Per scenario: the typed tool part from the session database
(select data from part where data like '%"type":"tool"%'), the pane capture where a card is
the artifact, and exec outputs (sha256sum, wc -l, ps) for disk truth. Receipt rows read the
receipt file bytes. Results append-only to
projects/omp-code-intel/.trident/container-test-results.json as the suite v4-battery; v1/v3
rows are never mutated. OMP private notes only in
/home/leviathan/JARVIS_WORKSPACE/OMP/mimo-code-intel-v2-campaign (corrected path:
/home/leviathan/JARVIS_WORKSPACE/OMP/mimo-code-intel-v2-campaign).

## PASS CRITERIA

All Scenarios 1-11 PASS with the passToken present in a typed tool part or receipt and the
failToken absent. Scenario 12 PASSES with [error], or is recorded as an honest skip with the
image proof (typescript-language-server absent) — a silent card with the server present is a
FAIL. Scenarios 13-16 PASS or honest-skip with a recorded reason. Any failToken hit = suite
FAILED. Skipped-without-reason = FAILED. overallVerdict pass only after every row is L1
(typed tool part) or L2 (receipt); a tool-layer-only probe does not close a row. ST 79/79
does not close this plan. classifier may not weaken. Legal inner stop is SC-14, the seal.
