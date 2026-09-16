# CONTRACTS-W4 — shadows + ship (final wave; same vocabulary + conventions)

## W4-A: src/lsp/client.ts + src/lsp/tool.ts (vendored minimal LSP)

- client.ts: minimal JSONRPC-over-stdio LSP client (~500 LoC PROPOSED — measure honestly; hard cap 800, else cut diagnostics first, keep hover/definition/references/rename). API:
```ts
export interface LspServerSpec { command: string; args?: string[]; fileTypes: string[] }
export const BUILTIN_SERVERS: LspServerSpec[] = [
  { command: "typescript-language-server", args: ["--stdio"], fileTypes: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] },
  { command: "pyright-langserver", args: ["--stdio"], fileTypes: [".py"] },
];
export class LspClient {
  static forFile(absPath: string, specs = BUILTIN_SERVERS): LspClient | null   // match ext; null = unserved
  async initialize(worktreeRoot: string): Promise<void>      // spawn + initialize handshake + initialized notification
  async didOpen(absPath: string, text: string, languageId: string): Promise<void>
  async hover(absPath, line1, char1): Promise<string | null>          // formatted single line or null
  async definition(absPath, line1, char1): Promise<Array<{path: string; line: number}>>
  async references(absPath, line1, char1): Promise<Array<{path: string; line: number}>>
  async rename(absPath, line1, char1, newName: string): Promise<{ edited: string[]; error?: string }>   // apply workspaceEdit text edits directly (single-file + multi-file via file:// URIs)
  async diagnostics(absPath): Promise<Array<{line: number; severity: string; message: string}>>
  async shutdown(): Promise<void>
}
```
- line/char params are 1-BASED (tool-facing); convert to 0-based LSP internally.
- tool.ts: `lspTool` ToolDefinition: args {operation: z.enum(["hover","definition","references","rename","diagnostics"]), file_path: z.string(), line: z.number().int().min(1).optional(), character: z.number().int().min(1).optional(), new_name: z.string().optional()}. Behavior:
  - spec match fails → `{output: "No LSP server available for <ext> files", metadata: {error: "NO_LSP_SERVER"}}` (EXACT token — SC-16).
  - server binary spawn fails (ENOENT) → same NO_LSP_SERVER output with detail ` (<command> not installed)` appended.
  - per-call client lifecycle (spawn→ops→shutdown) — no persistent server in v1 (cold start acceptable; documented).
  - rename: apply returned text edits via atomic write per file; output `renamed <symbol> in <n> file(s)` + per-file line list; metadata {renamed: true, files: n}.

## W4-B: src/grep.ts (shadow grep, opt-in)

- THE D.TS WINS: inspect node_modules/@oh-my-pi/pi-natives/native/index.d.ts for the grep export (candidates: `grep`, `grepSearch`, `GrepSearch`); adapt call shape to reality; if NO usable export exists → the tool throws at first call with named `GREP_NATIVE_UNAVAILABLE` and the desk reports it — do NOT fake a JS-scan fallback silently (a silent fallback producing different results = the banned false-success class).
- `grepTool` ToolDefinition: args {pattern: z.string(), path: z.string().optional(), glob: z.string().optional(), ignore_case: z.boolean().optional()}. Output FIRST line `matches=<n> files=<m>` then per-file `#tag` header (TagStore.snapshot — same as ast_grep) + `<N>:<line>` rows (cap 200 rows total). metadata {matchCount, fileCount}.

## W4-C: src/index.ts wiring + src/advisor.ts

- index.ts (ONLY desk allowed to touch it):
  - shadow registration: `for (const id of opts.shadow ?? []) { if (id === "grep") Object.assign(tool, {grep: grepTool}); if (id === "lsp") Object.assign(tool, {lsp: lspTool}); }` — registry replaces same-id builtins (registry.ts:336-338). NEVER shadow without opt-in (AP-6).
  - advisor: `if (opts.advisor?.model)` → include hooks "session.userQuery.post" from advisor.ts. Default OFF.
- src/advisor.ts: `advisorHooks(opts)` returns `{ "session.userQuery.post": async (input, output) => {...} }` — v1 honest scope: trajectory scan for the SAME rule lexicon as ttsr (compileRules reuse) + a concern synthetic part injected on NEXT turn via a module store consumed by "experimental.chat.messages.transform" — REUSE W2-C's violation store (import from index? NO circular — move the store to src/ttsr.ts as exported `takeViolations(sessionID)`/`pushViolations(sessionID, parts)`; W4-C refactors index.ts imports accordingly, W2 hooks behavior byte-identical). Concern lines use marker `[omp-intel advisor]`. No model call in v1 (the advisor model param selects a FUTURE llm call; today the trajectory scan IS the advisor — document in code).
  - W2 regression guard: hooks ST (31-row suite) must stay 47+/47+ green after the store refactor.

## W4-D: THIRD-PARTY-NOTICES + npm prep

- THIRD-PARTY-NOTICES: MIT notices for @oh-my-pi/pi-natives (OMP, can1357), @mimo-ai/plugin (Xiaomi), zod, effect; statement of modifications (none to pi-natives; plugin wraps unmodified).
- README.md (package): what it is, one-line toggle (`"plugin": [["omp-code-intel", {...}]]`), options table (ast/hashline/eval/merkle/ttsr/advisor/shadow), tool list, eval limitations (no await keyword; trailing promises awaited — W3-B finding), lsp v1 scope, license MIT.
- package.json prep: files ["src", "README.md", "THIRD-PARTY-NOTICES", "CONTRACTS.md"], repository field, keywords. `npm pack --dry-run` output pasted (do NOT publish).
- No version bumps beyond 0.1.0.

## W4-E: tests/st/w4.st.ts + run.ts concat

- SC-14 shadow swap: real pluginFn({}, {shadow:["grep"]}) → tool map HAS grep (and builtin ids unaffected otherwise); pluginFn({}, {}) → NO grep key (AP-6 zero-opt-in proof). Same for lsp.
- SC-16: lspTool on file.zzz → output EXACT `No LSP server available for .zzz files`, metadata.error NO_LSP_SERVER (no server spawn attempted).
- grep shadow: natives export present → real grep on sandbox fixture (`console.log` pattern) → first line matches `matches=<n> files=<m>` + `#tag` header; natives export ABSENT at runtime → named GREP_NATIVE_UNAVAILABLE (assert via whatever the d.ts reality allows — desk reports which branch ran).
- advisor: opts {} → no session.userQuery.post key (OFF); opts {advisor:{model:"x"}} + ttsr rule matching a trajectory line → takeViolations flow injects `[omp-intel advisor]` concern on next transform (reuse W2 store mechanics; sandbox-only).
- run.ts: append w4Scenarios BEFORE hooks arrays (ordering law intact).
- ALL suites sandbox-absolute; never the project cwd chain.
