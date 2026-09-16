# CONTRACTS-V2-W1 — v2 ports (addendum; same vocabulary + conventions)

## src/read.ts — shadow read (Desk W1-A owns ONLY this file)

`shadowReadTool` ToolDefinition: args `{file_path: z.string(), offset: z.number().int().min(1).optional(), limit: z.number().int().min(1).optional()}`.
Behavior:
1. Split selector: if `file_path` contains `#` after the last `/`, treat suffix as symbol name; resolve base path first via `resolveAbs`, then symbol lookup.
2. Directories (stat isDirectory): return sorted `name/` entries (mirror builtin shape), NO tag (dirs aren't content-addressed). metadata `{type:"directory"}`.
3. Files: read utf8 (binary sniff: first 4KB contains `\0` → named `READ_BINARY` + first 200 printable chars only). Caps mirror builtin: max 2000 lines (offset/limit slice, default limit 2000), per-line truncate 2000 chars + `... (line truncated)` suffix.
4. Output grammar EXACT: first line `[<relPath>]#<tag>` (TagStore.snapshot of FULL file text — tag always covers the whole file, not the slice); then `<N>:<line>` rows for the shown window; then symbol-map section `Symbols:\n  <name> (<kind>) @<line>` for top-level function/class/const-arrow defs found via pi-natives astGrep patterns per ext (ts/tsx/js: `function $N($$$)`, `class $N`, `const $N = ($$$) => $B`; py: `def $N($$$)`, `class $N`; other exts: no Symbols section).
5. Selector path: symbol found → output window centered on the symbol line (±40 lines within caps), header `[<rel>]#<tag> @<symbol>:<line>`; symbol missing → named `NO_SYMBOL: <name> not found in <rel>` + full-file tag header still emitted (so the caller can retry anchored).
6. Missing file → `READ_NOT_FOUND: <rel>` (metadata.error same). metadata `{tag, lines, type:"file"}` on success.
Exports: only `shadowReadTool`. Imports: TagStore store, resolveAbs, astGrep from pi-natives, z, tool from @mimo-ai/plugin.

## diag-on-write (Desk W1-C owns src/edit.ts + src/ast.ts edits ONLY)

- After successful write+retag in `ompEditTool` (edit.ts step 6) AND after successful apply in `resolveTool` (ast.ts): if ext ∈ {.ts,.tsx,.js,.jsx,.mjs,.cjs,.py} → run vendored `LspClient` diagnostics on the written file (spawn per call, bounded 15s total, cold start acceptable); append to output: `\nDiagnostics: <n> problem(s)` + `\n<rel>:<line> [<severity>] <message>` rows when n>0, or `\nDiagnostics: clean` when 0. Binary spawn ENOENT or op timeout → append NOTHING to output; set `metadata.diag = "DIAG_UNAVAILABLE"` (write succeeded; diagnostics best-effort — never fail a good write).
- Unserved ext → no section, no metadata key. W1 ST suite (47-row lock) outputs MUST stay byte-identical on unserved-ext fixtures — the fixtures are .ts so diag WILL fire there; W1-C must update any W1 ST expectation that breaks ONLY by appending the new section (list each touched expectation in the return).
- Import LspClient from ../lsp/client (relative from edit.ts: `./lsp/client`? edit.ts is src/edit.ts → `./lsp/client`; ast.ts same). No new deps.

## src/eval/rpc.ts + kernels preamble hook (Desk W1-B owns BOTH files)

- rpc.ts exports: `PREAMBLE_PY: string`, `PREAMBLE_JS: string` (stub sources defining `intel_read(path)` / `intel_grep(pat, path?)` inside the driver's exec scope: write JSONL `{id, name, args}` to `<base>/eval-rpc/<id>.req` (id = random hex 8), poll `<base>/eval-rpc/<id>.res` every 5ms up to 10s → return parsed payload or raise/throw `RPC_TIMEOUT`); `startWatcher(baseDir, dispatch: (name, args) => Promise<unknown>): () => void` (fs.watch on eval-rpc dir; on `*.req` appearance: read, dispatch, write `<id>.res` JSON `{ok, result|error}`, delete req; return stop fn). `intel_grep` dispatches to natives grep; unknown name → `{error: "RPC_UNKNOWN_TOOL:<name>"}`.
- kernels.ts edit (W1-B ONLY): add optional ctor param `preamble?: Partial<Record<Lang, string>>`; in execInner, before user code, first evaluate `this.preamble?.[lang]` once per process lifetime (track per-lang boolean; preamble failures → proceed WITHOUT preamble and note once via console.warn — never fail the cell). No other kernels.ts changes.
- index.ts wiring is W1-E's (watcher start with dispatch {read: worktree-resolved fs read, grep: natives grep}, stop on session.post alongside killAll).

## src/mv.ts — omp_mv (Desk W1-D owns src/mv.ts + src/lsp/client.ts willRename addition ONLY)

- client.ts addition: `async willRename(pairs: Array<{from: string; to: string}>): Promise<Map<string, TextEdit[]>>` — sends `workspace/willRenameFiles` with `{files: [{oldUri, newUri}]}`; server null/empty/no-support → return empty map (caller decides the note). Reuse requestRaw/pending machinery; 10s timeout.
- ompMvTool: args `{from: z.string(), to: z.string()}`. Behavior: resolve both abs; `from` must exist and not be a directory (dirs → named `MV_DIR_UNSUPPORTED`); if ext served AND server binary present → willRename → apply returned edits atomic per file (reuse applyEditsToFile export from client — export it); then fs renameSync; TagStore.invalidate(from) + snapshot(to). Output: `moved <rel-from> -> <rel-to>` + `\nimports updated in <n> file(s)` (+ per-file rows) OR `\nWILLRENAME_UNSUPPORTED: plain move, imports not rewritten` when the server path was skipped. metadata `{moved: true, importsRewritten: n}`.
- Exports: ompMvTool from mv.ts; willRename + applyEditsToFile from client.ts.

## src/index.ts wiring (Desk W1-E owns index.ts edits + ALL W1 ST files ONLY)

- Register: `Object.assign(tool, { omp_mv: ompMvTool })` always (additive); `if ((opts.shadow ?? []).includes("read")) Object.assign(tool, { read: shadowReadTool })` — shadow read ONLY under opt-in (AP-6). NEVER replace builtin read by default.
- RPC watcher: when eval enabled, `const stopRpc = startWatcher(path.join(process.cwd(), ".mimocode", "omp-intel", "eval-rpc"), dispatch)` with dispatch read (fs.readFile utf8 resolved against... session worktree is per-call — dispatch signature has no ctx; resolve against process.cwd() and DOCUMENT the limitation); session.post: stopRpc() + killAll.
- ST: tests/st/v2w1.st.ts (read-shadow rows: tag header, Symbols section, selector hit, NO_SYMBOL; diag rows: bad edit → [error] row in card, unserved ext → no section; rpc rows: intel_read inside py kernel → file content, missing file → RPC error row; mv rows: willRename import updated OR WILLRENAME_UNSUPPORTED named note) + run.ts concat BEFORE hooks arrays (ordering law). Sandbox-absolute dirs only; never project cwd chain.

## Suite-ordering + write-set law (all desks)

W1-E's run.ts concat keeps `hooks-cleanup-created-mimocode` LAST. No desk touches another's files. No MiMo-tree edits. Exact tokens only.
