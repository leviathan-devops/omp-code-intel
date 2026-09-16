# CONTRACTS-W3 — eval kernels (addendum; same vocabulary + conventions)

## Design (v1, honest scope)

Persistent kernels = long-lived DRIVER PROCESSES (no PTY): the plugin writes two
driver files into `<base>/eval-rpc/` on first spawn, then spawns them per
language. Driver protocol: reads one base64(UTF-8 code) line per execution from
stdin, execs it in the SAME process (state persists in driver globals), prints
one result line `<<<OPI>>>` + JSON({"ok":bool,"stdout":str,"error":str?}) +
`<<<END>>>`. `reset` = kill + respawn that language's driver (state gone).

## src/eval/kernels.ts

```ts
export type Lang = "py" | "js";
export interface ExecResult { ok: boolean; stdout: string; error?: string }
export class KernelManager {
  constructor(private baseDir: string) {}                    // absolute; drivers + rpc files live here
  async exec(lang: Lang, code: string, cwd: string, timeoutMs = 30000, reset = false): Promise<ExecResult>;
  async killAll(): Promise<void>;                            // kill every live driver proc
  liveCount(): number;
}
```
- Spawn: py → `Bun.spawn(["python3", "-u", driverPy], {stdin:"pipe", stdout:"pipe", stderr:"pipe", cwd})`; js → `Bun.spawn(["bun", driverJs], {...})`.
- ENOENT / spawn failure → the TOOL layer converts to named rejection `KERNEL_MISSING: <lang> runtime not found` (metadata.error "KERNEL_MISSING"). kernels.ts surfaces it as {ok:false, error:"KERNEL_MISSING: ..."}.
- timeoutMs: race exec vs timer; on timeout kill THAT driver (state lost — documented), return {ok:false, error:"EVAL_TIMEOUT"}.
- exec returns driver stdout captured per-cell (sentinel-delimited), NOT the process's lifetime stream.
- Driver files written by THIS module: driver_py.py / driver_js.js inside baseDir (idempotent write).

## src/eval/prelude.ts

Exports `DRIVER_PY: string` and `DRIVER_JS: string` — the two driver sources.
DRIVER_PY: sys.stdin loop; base64.b64decode → exec(code, globals_keep) → print sentinel JSON (stdout captured via contextlib.redirect_stdout into StringIO).
DRIVER_JS: node:readline over stdin; new Function(code) with a persistent `globalThis.__opi` scope object; capture console.log into the result object. Both drivers print NOTHING except the sentinel result lines (quiet driver law — no prompt strings).

## src/eval/rpc.ts (v1: read + ast re-entry)

```ts
export function installRpc(baseDir: string, dispatch: (name: string, args: any) => Promise<any>): void
// writes/refreshes rpc.py + rpc.js snippets into baseDir — each defines, inside the driver's exec scope:
//   intel_read(path) / intel_ast(pat, path): write JSONL {id,name,args} to <baseDir>/eval-rpc/<id>.req,
//     then poll <baseDir>/eval-rpc/<id>.res (5ms sleep, 10s cap) and return parsed payload; on timeout raise/throw "RPC_TIMEOUT"
export function startWatcher(baseDir: string, dispatch): void   // fs.watch on eval-rpc dir; on *.req: dispatch(name,args) → write <id>.res JSON; delete req
export function stopWatcher(): void
```
v1 dispatch map (wired by index.ts): `"read"` → fs.readFile (utf8, path resolved against session worktree passed at wire time), `"ast"` → pi-natives astGrep (patterns:[pat], path, includeMeta:true, limit 50) returning the summary+match array. `grep` dispatch: attempt natives grep IF a grep export exists on the natives module at runtime; else return {error:"RPC_UNSUPPORTED:grep"} (named, loud). Keep the three stub names in both drivers regardless.

## src/index.ts — W3 wiring (Desk W3-C owns ALL edits)

- Lazy `KernelManager` singleton (base = path.join(process.cwd(), ".mimocode", "omp-intel")).
- `eval` ToolDefinition (id "eval"): args `{language: z.enum(["py","js"]), code: z.string().min(1), title: z.string().optional(), timeout: z.number().optional(), reset: z.boolean().optional()}`.
  Gates BEFORE exec: opts.eval?.py === false && language==="py" → rejection `eval python is disabled by plugin options` (metadata.error "EVAL_DISABLED_PY"); same for js → "EVAL_DISABLED_JS". Empty code → `eval code must be non-empty` (metadata.error "EVAL_EMPTY").
  Execute: km.exec(...) → ok → `{output: stdout || "(no output)", metadata: {language, exit: "ok"}}`; !ok → `{output: error, metadata: {error: error.startsWith("KERNEL_MISSING") ? "KERNEL_MISSING" : error.startsWith("EVAL_DISABLED") ? error : "EVAL_ERROR", detail: error}}`.
- Hooks key `"session.post"`: call km.killAll() (fire-and-forget promise with .catch(warn)) — kernels die with the session (SC-11).
- KEEP everything from W1/W2 byte-identical in behavior (tool map additions only; hooks untouched except the added session.post key).

## ST suites

- eval.st.ts (W3-D): LEGIT: py exec "x = 41" then py exec "print(x+1)" → second stdout "42" (SC-10 persistence); js exec two-cell const then use. reset:true → name error (state gone). ADVERSARIAL: KERNEL_MISSING — spawn with a PATH-stripped env or a lang binary name monkey-pathed via kernel manager option `binOverrides` {py:"/nonexistent/opi-python3"} (add optional ctor param) → ExecResult.error startsWith KERNEL_MISSING; EVAL_TIMEOUT — code `import time; time.sleep(9)` timeoutMs 1500 → error EVAL_TIMEOUT and liveCount drops (driver killed).
- eval-gates.st.ts (W3-E): through the REAL plugin fn: opts {eval:{py:false}} → eval py → metadata.error EVAL_DISABLED_PY + output names disabled; js path still enabled in same options; eval {code:""} → EVAL_EMPTY; opts {} default → both enabled.
- eval-rpc.st.ts (W3-F scope note: rpc watcher tested with dispatch fns directly — no kernel required): startWatcher on sandbox base + dispatch {read: fsRead} → write a .req file → poll .res appears with payload; stopWatcher stops (second req gets no res within 300ms).

## Suite-ordering law (from W2-E finding)

W3 ST files must NOT touch the project-cwd chain (use sandbox-absolute bases for KernelManager baseDir). hooks-cleanup-created-mimocode stays LAST in run.ts concat order — append new arrays BEFORE hooks.
