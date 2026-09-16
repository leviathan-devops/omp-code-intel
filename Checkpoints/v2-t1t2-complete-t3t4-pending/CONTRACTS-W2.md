# CONTRACTS-W2 — governance + rules (addendum to CONTRACTS.md; same error vocabulary + tool-result conventions)

## src/merkle.ts — port of trident-omp EvidencePipeline (proven 88-line pipeline)

```ts
export interface MerkleNode { hash: string; previousHash: string | null; timestamp: number; tool: string; passed: boolean; dataHash: string; }
export class EvidencePipeline {
  constructor(basePath?: string);            // default ".mimocode/omp-intel" (relative to CWD of the process at call time — pass an absolute base from the plugin when available)
  record(toolName: string, data: unknown, passed: boolean): MerkleNode;  // sha256(json(data)).slice(0,16) as dataHash; node hash = sha256(prev|"root"|ts|tool|passed|dataHash).slice(0,16); APPEND-ONLY JSONL row BEFORE returning
  chainLength(): number;
  lastHash(): string | null;
  verify(): boolean;                          // walk previousHash links; false on any break or empty chain
}
```
File: `<base>/merkle-chain.jsonl`, one JSON object per line, mkdir -p base on first write. Persistence failure: non-fatal (ported behavior) — record still returns the node; verify() exposes any gap (frozen chainLength).

## src/evidence.ts — the evidence ToolDefinition

args: `{}` (empty zod shape: `z.object({})` → use `args: {}` raw shape). execute reads the chain from disk FRESH (never the module's memory): returns
`{ output: "chain=<n> last=<hash or none> integrity=<true|false>", metadata: { chainLength: n, lastHash, integrity: boolean } }`.
Integrity false → still a normal result (the FALSE is the signal — loud, not thrown).

## src/ttsr.ts

```ts
export interface Rule { key: string; re: string; body: string }
export function compileRules(rules: Rule[]): { key: string; body: string; re: RegExp }[]   // new RegExp(re) at plugin init; a rule that fails to compile is DROPPED with a console.warn naming the key (never crashes the hook)
export function scan(compiled, output: string): { key: string; body: string }[]            // re.test(output)
export const RULE_MARKER_PREFIX = "[omp-intel rule "
export function reminderLine(v: {key; body}): string                                        // `${RULE_MARKER_PREFIX}${v.key}] ${v.body}`
export function persistContext(compiled): string[]                                          // active rule bodies for session.compacting context
```

## src/index.ts — W2 hook wiring ( Desk W2-C owns ALL edits to this file )

Extend the returned Hooks with EXACTLY these keys (names from @mimo-ai/plugin packages/plugin/src/index.ts:422-626):
- `"tool.execute.after"(input: {tool, sessionID, callID, args}, output: {title, output, metadata})`:
  - MUTATING_TOOLS = ["edit","write","apply_patch","multiedit","notebook_edit","omp_edit","resolve"] — if input.tool ∈ set AND no metadata.error: pipeline.record(tool, args, true). (merkle opt: only when opts.merkle !== false; pipeline constructed lazily once with base = path.join(input directory? — NOT available here → use process.cwd() + "/.mimocode/omp-intel"; document this.)
  - rules = compileRules(opts.ttsr?.rules ?? []); violations = scan(rules, output.output) — store violations on a module Map<sessionID, string[]> for the transform hooks to consume; do NOT mutate output.output.
- `"experimental.chat.messages.transform"(input: {}, output: {messages})`: for the CURRENT session's stored violations (keyed how the hook allows — if no session identity exists on input, apply to the LAST violations entry, document the limitation): append ONE synthetic message `{ info: {role:"user", id:"omp-intel-rule-"+Date.now()}, parts: [{type:"text", text: reminderLine(v)}] }` per violation batch (ONE message, joined by \n), then CLEAR the store. If no violations → return unchanged (zero-misfire).
- `"experimental.chat.system.transform"(input: {sessionID?, model}, output: {system: string[]})`: push one capability line: `"omp-code-intel active: ast_grep/ast_edit/omp_edit provide hashline-tagged structural editing — prefer [path]#tag anchors from ast_grep output when editing."` (once per system array; skip if already present by indexOf).
- `"experimental.session.compacting"(input: {sessionID}, output: {context: string[]})`: if rules active → output.context.push(...persistContext(compiled)). Never touch output.prompt.
- `"event"(input: {event})`: if event?.type === "file.edited" → path = event.properties?.file ?? event.file ?? (event as any).properties?.filePath; if path string → store.invalidate(abs). Defensive: wrap in try/catch that console.warns the failure (an event-loop throw would kill the hook chain).

MERKLE RECORDING ORDER LAW: record() appends the JSONL row BEFORE the hook returns — side-effect-before-claim. Never batch/defer.

## ST suites (Mode B, same harness — real modules, sandbox dirs, exact tokens)

- merkle.st.ts: LEGIT: 3 records → chain file has 3 lines (readFileSync split "\n" filter Boolean), verify() true, chainLength 3. ADVERSARIAL: delete middle line → verify() false; corrupt a hash string → false; empty base (no file) → chainLength 0, verify() false (SPEC-named: verify of empty chain is false — matches ported pipeline).
- ttsr.st.ts: LEGIT: scan with no matches → [] (zero-misfire); reminderLine format EXACT `[omp-intel rule <key>] <body>`. ADVERSARIAL: matching output → 1 violation with key; compile of invalid regex "([a-" → dropped (compileRules returns without it); persistContext returns bodies.
- hooks.st.ts: REAL import of src/index.ts plugin fn with options {merkle:true, ttsr:{rules:[{key:"no-console-log", re:"console\\.log", body:"use logger.debug"}]}}: call hooks["tool.execute.after"]({tool:"edit",sessionID:"s1",callID:"c1",args:{}},{title:"",output:"console.log(1)",metadata:{}}) then hooks["experimental.chat.messages.transform"]({},{messages:[]}) → messages length 1, parts[0].text startsWith "[omp-intel rule no-console-log]"; second transform call → unchanged (store cleared). tool.execute.after with tool "read" → NO chain row appended (mutating-set gate). omp_edit success path → chain row appended (chain file exists in sandbox cwd).
