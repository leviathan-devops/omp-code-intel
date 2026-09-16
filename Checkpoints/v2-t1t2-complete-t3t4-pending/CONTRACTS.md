# CONTRACTS — OMP_CODE_INTEL W1 (single source of truth for all desks)

Every desk writes against these EXACT signatures. No deviation without orch approval.

## Runtime facts

- Runtime: Bun (ESM). Module type: "module".
- Deps (package.json, exact): `@oh-my-pi/pi-natives`: "18.1.18", `@mimo-ai/plugin`: "0.1.14", `zod`: "4.1.8". devDeps: `@types/bun`: "latest", `typescript`: "^5".
- tsconfig: strict true, moduleResolution "bundler", target esnext, types ["bun"], noEmit true, skipLibCheck true.
- ToolDefinition shape (from @mimo-ai/plugin, packages/plugin/src/tool.ts:32-38):
  `tool({ description: string, args: z.ZodRawShape, execute(args, ctx): Promise<string | {output: string; metadata?: Record<string, unknown>} > })`
  ctx: `{ sessionID, messageID, agent, directory, worktree, abort: AbortSignal, metadata(input), ask(input) }`.
- Plugin entry (src/index.ts) MUST export BOTH:
  `export const server = plugin` and `export default plugin`
  where `plugin = async (input, options) => Hooks`.
  Hooks keys used in W1: `tool` (map of id→ToolDefinition). W2 adds "tool.execute.after", "experimental.chat.messages.transform", "experimental.session.compacting", "event". Registry shadows builtins when ids collide (registry.ts:336-338).

## Error vocabulary (EXACT tokens — loud-fail law)

STALE_ANCHOR, ANCHOR_MISMATCH, PARSE_ISSUES_CAPPED, KERNEL_MISSING, NO_LSP_SERVER, READ_FIRST.
Every rejection returns a tool result (never throws past the tool boundary) shaped:
`{ output: "<TOKEN>: <one-line reason>", metadata: { error: "<TOKEN>" } }`.

## src/tagstore.ts

```ts
export interface Snapshot { tag: string; contentHash: string; mtime: number; }
export class TagStore {
  // tag = sha256(text).hex.slice(0, 4)  (HL_FILE_HASH_LENGTH = 4)
  snapshot(absPath: string, text: string): string;          // record + return tag
  tagOf(text: string): string;                              // pure hash
  currentTag(absPath: string): string | null;               // read file from disk, hash; null if unreadable
  verify(absPath: string, tag: string): boolean;            // tag === currentTag(absPath) AND store has snapshot
  retag(absPath: string, text: string): string;             // after a write: re-snapshot
  invalidate(absPath: string): void;                        // on external file.edited
  get(absPath: string): Snapshot | undefined;
}
export const store = new TagStore(); // module-level singleton, keyed per process; per-session via WeakMap NOT needed in v1
```

## src/shim.ts

```ts
export interface OmpIntelOptions {
  ast?: boolean; hashline?: boolean;
  eval?: { py?: boolean; js?: boolean };
  merkle?: boolean;
  ttsr?: { rules: { key: string; re: string; body: string }[] };
  advisor?: { model?: string };
  shadow?: string[];
}
export function loadOptions(raw: Record<string, unknown> | undefined): OmpIntelOptions;
// defaults: ast, hashline, merkle true; eval {py:true, js:true}; advisor off; shadow []
export function resolveAbs(ctx: { directory: string }, p: string): string; // absolute pass-through, else join(directory, p)
export function toPathList(p?: string): string[]; // "src; tests" → ["src","tests"]; undefined → ["."]
```

## src/ast.ts (pi-natives signatures — from OMP sources, verbatim behavior)

```ts
import { astGrep, astEdit } from "@oh-my-pi/pi-natives";
// astGrep({ patterns: string[], lang?, path, glob?, offset?, limit?, includeMeta: true, signal? })
//   → { matches: Array<{path, startLine, startColumn, endLine, endColumn, byteStart, byteEnd, text, metaVariables?}>,
//       totalMatches, filesWithMatches, filesSearched, limitReached, parseErrors?: string[] }
// astEdit({ rewrites: Record<string,string>, path, glob?, dryRun: boolean, maxFiles: number, failOnParseError: false, signal? })
//   → { changes, fileChanges: Array<{path, count}>, totalReplacements, filesTouched, filesSearched, applied, limitReached, parseErrors? }
```

- `ast_grep` ToolDefinition args: `{ pat: z.string(), path: z.string().optional(), lang: z.string().optional(), skip: z.number().int().nonnegative().optional() }`. DEFAULT_AST_LIMIT = 50. Empty pat → rejection token `pat must be a non-empty pattern`.
- Output format (model-facing text):
  - Header per file: `[<relPath>]#<tag>` (tag from TagStore.snapshot of the file)
  - Match lines: `<N>:<lineText>` (N = 1-based startLine)
  - Summary first line: `matches=<totalMatches> files=<filesWithMatches> searched=<filesSearched> limitReached=<bool>`
  - parseErrors non-empty → append `PARSE_ISSUES_CAPPED (<n>):` + up to 5 entries.
- `ast_edit` args: `{ ops: z.array(z.object({ pat: z.string(), out: z.string() })), paths: z.array(z.string()) }`. maxFiles = 1000.
  Behavior: ALWAYS dryRun:true first → if totalReplacements === 0: `No replacements made` (+ parse issues). Else STAGE: module Map<sessionID, {rewrites, paths, previewCounts, previews}> and return preview text:
  `proposed <totalReplacements> replacement(s) in <filesTouched> file(s)` + per-file `-line:+line` first-line diffs + instruction: call `resolve` with a one-line reason to apply, or re-run to discard. NO disk write in ast_edit.
- `resolve` ToolDefinition args: `{ reason: z.string().min(1) }`. Applies the session's staged op with dryRun:false; compares counts vs preview — mismatch → `stale preview` named error with counts, nothing written; match → apply, retag every touched file via TagStore (read file, snapshot), return `applied <n> replacement(s) in <m> file(s)` + fresh `[path]#tag` lines.

## src/edit.ts (omp_edit)

Args: `{ file_path: z.string(), tag: z.string().length(4), hunks: z.array(z.object({ line: z.number().int().min(1), old: z.string(), "new": z.string() })) }`.
Algorithm (ORDER IS THE SAFETY — whole block, no reordering):
1. abs = resolveAbs(ctx, file_path). snap = store.get(abs). If !snap → `READ_FIRST: no snapshot for <path>; run ast_grep or ast_edit first`.
2. current = store.currentTag(abs). If current !== args.tag → `STALE_ANCHOR: <path> changed since snapshot (had <tag>, now <current>)`. NO write.
3. lines = split file on "\n" (keep trailing-empty handling: pop final "" if present, re-add on join).
4. For each hunk (validate ALL before ANY write): lines[hunk.line-1] !== hunk.old → `ANCHOR_MISMATCH at line <N>: expected <old-slice-40>, found <actual-slice-40>`. NO write.
5. Apply hunks sorted by line DESC (replace lines[line-1] with hunk.new). Join "\n", atomic write (write tmp + rename).
6. newTag = store.retag(abs, newText). Return `{ output: "applied <k> hunk(s) → [<relPath>]#<newTag>", metadata: { tag: newTag, hunks: k } }`.

## src/index.ts (W1-D)

```ts
import { loadOptions } from "./config"; // re-export shim's loadOptions + defaults
import { astGrepTool, astEditTool, resolveTool } from "./ast";
import { ompEditTool } from "./edit";
export default async function plugin(input, options) {
  const opts = loadOptions(options);
  const tool: Record<string, unknown> = {};
  if (opts.ast !== false) Object.assign(tool, { ast_grep: astGrepTool, ast_edit: astEditTool, resolve: resolveTool });
  if (opts.hashline !== false) Object.assign(tool, { omp_edit: ompEditTool });
  return {
    tool,
    // W2 will add: "tool.execute.after", "experimental.chat.messages.transform",
    // "experimental.session.compacting", "event" — leave absent in W1.
  };
}
export const server = ...same fn...;
```
(If circular-import friction: export the plugin fn from src/plugin.ts and have index.ts re-export; keep index.ts the entry.)

## Test harness (tests/st/)

Mode B script-test: real imports, real files in mkdtempSync sandbox, Effect-wrapped, ONE runPromise at the bottom of run.ts, Effect.timeout(30s) per scenario, exact-tag failure assertions, PASS/FAIL table + process.exit(all-pass ? 0 : 1). Fixtures: real .ts files with console.log lines for ast tests.
