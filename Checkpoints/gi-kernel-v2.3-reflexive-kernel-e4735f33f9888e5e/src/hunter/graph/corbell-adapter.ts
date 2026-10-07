// PORTED FROM the archived upstream skill tree/graph/corbell-adapter.ts:1-876 (verbatim except imports: giLog from ../log.ts; ProjectProfile from ../profile/schema.ts).
// the archived upstream skill tree/graph/corbell-adapter.ts
// THE PRIMARY ADAPTER (W2, spec §3.3 lines 662-778) — the thin shell over the
// REAL Corbell CLI (C7.1, D2). The wire-don't-build law: the CLI is the engine,
// this file is the shell. Zero graph machinery built from scratch (R11.5).
//
// THE VERIFIED CLI SURFACE (2026-08-12 first-run — G11.2, the fixture project
// at /tmp/opencode/corbell-fixture):
//   - `corbell --help`                     → exit 0 (the binary guard)
//   - `corbell init`                       → creates <root>/corbell-data/workspace.yaml (the guard)
//   - `corbell graph build --methods`      → builds the graph; writes the SQLite
//       store at <root>/corbell-data/.corbell/workspace.db. NOTE: the stdout is
//       a rich SUMMARY table ("Graph built: Services/Methods/Edges counts") — the
//       ROWS live in the store. The adapter reads the store for the rows.
//   - `corbell graph services`             → a rich table (id | language | type | tags)
//   - `corbell graph methods {service}`    → per-service methods
//   - `corbell graph deps {service}`       → a service's dependencies
//   - `corbell graph callpath {from} {to}` → the call path between two method IDs
//       (the spec's pseudocode `callpath --method <symbol>` DOES NOT EXIST in
//       this version — the real surface is TWO positional args; divergence recorded)
//
// THE CORBELL SQLITE SCHEMA (verified live — sqlite_store.py): graph_nodes
// (id TEXT PRIMARY KEY, node_type TEXT NOT NULL, data TEXT NOT NULL) +
// graph_edges (source_id, target_id, kind, metadata). node_type ∈
// {service, datastore, queue, method, flow}; edge kind ∈ {method_call, flow_step}.
// The adapter maps: service→module, datastore/queue→module, method→method,
// flow→function; method_call→calls, flow_step→traces-to, depends-on→imports.
//
// THE 120s TIMEOUT BECAUSE (contractual): the corbell graph build on a large
// tree can exceed 60s (the spec's own BECAUSE, line 686-690: the Plutus graph
// is 56 classes + ~190 files and measures ~30-90s on the container hardware);
// 120s is 2x the worst measured class so a slow first build never times out
// mid-write, while a hung CLI dies well before the operator's patience — and
// dies as the named ADAPTER_FAILED, never a silent stall.
//
// THE GRAPH_EMPTY LAW: a build that produces zero nodes is a LOUD FAIL (the
// engine refuses to run on an empty graph), never a silent empty success.

import { giLog } from '../log.ts';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// CHAIN-ORDER NOTE (the AETHER CHAIN, not this adapter): the aether-agent
// chain lives in src/audit-engine/harness/pi-aether-agent.ts — zen
// muse-spark primary per the operator's 2026-08-23 directive; this adapter
// only consumes the resolved corbell binary path.
import { Database } from 'bun:sqlite';
import type {
  GraphAdapter, GraphNode, GraphEdge, BuildResult,
  CallSite, ChainStep, ImportEdge, AwaitEdge, DeadNode, GraphNodeKind,
} from './interface.ts';
import { adapterFailed, adapterParseError, graphEmpty } from './interface.ts';
import type { ProjectProfile } from '../profile/schema.ts';
import { discoverSourceRoots } from '../profile/source-roots.ts';

/** The exec surface the tests stub. execSync-shaped but returns the stdout string. */
export type ExecFn = (cmd: string, opts?: { cwd?: string; timeout?: number; env?: NodeJS.ProcessEnv }) => string;

/** The default exec: the real corbell binary via child_process.execSync. */
/** Resolve the corbell binary via profile/env/PATH walk with the named CORBELL_NOT_FOUND on miss (spec §3.9 BUG-B permanent fix). */
export function resolveCorbell(profile?: { graph?: { binaryPath?: string } }, env: NodeJS.ProcessEnv = process.env): string {
  // BLAST CRITICAL fix (qwen corbell-leg circuit): the resolved path is
  // interpolated into /bin/sh -c strings (the ExecFn contract) — a binary
  // path carrying shell metacharacters is a named refusal, fail-closed.
  const safe = (p: string): string => {
    if (/[^A-Za-z0-9_@%+=:,./\\-]/.test(p)) {
      throw new Error(`CORBELL_BIN_UNSAFE: resolved binary path contains shell metacharacters: ${p.slice(0, 120)}`);
    }
    return p;
  };
  const fromProfile = (profile as unknown as { graph?: { binaryPath?: string } })?.graph?.binaryPath;
  if (fromProfile && fromProfile.length > 0 && fs.existsSync(fromProfile)) return safe(fromProfile);
  const fromEnv = env.CORBELL_BIN;
  if (fromEnv && fromEnv.length > 0 && fs.existsSync(fromEnv)) return safe(fromEnv);
  // THE DURABLE SITES ONLY (HT-BUG-15/17 — the /tmp fallback deleted): the
  // per-user venv on /home first, then /opt. A tmp-dir install is the wiped-
  // install class and is never a sanctioned resolution target.
  const VENV_SITES = [path.join('/home', 'leviathan', 'corbell-venv', 'bin', 'corbell'), path.join('/', 'opt', 'corbell-venv', 'bin', 'corbell')];
  for (const candidate of VENV_SITES) {
    // ★ F-2 FIX (2026-09-24): VENV_SITES ride the same sh -c interpolation as
    // every other resolution — validated through safe() like profile/env paths.
    if (fs.existsSync(candidate)) return safe(candidate);
  }
  const pathEnv = env.PATH ?? process.env.PATH ?? '';
  for (const dir of pathEnv.split(':')) {
    if (!dir) continue;
    const cand = path.join(dir, 'corbell');
    // ★ F-2 FIX (2026-09-24): PATH-walk dirs come from env (operator-influenced)
    // and interpolate into sh -c — fail closed on metacharacters like the rest.
    if (fs.existsSync(cand)) return safe(cand);
  }
  throw new Error("CORBELL_NOT_FOUND - the corbell binary is missing; install it with 'pip install git+https://github.com/Corbell-AI/Corbell.git' or set CORBELL_BIN or graph.binaryPath");
}

// ─── THE ASYNC GRAPH BUILD (the event-driven replacement for the sync exec) ───
// The sync execSync BLOCKS the Node.js event loop for the duration of the
// corbell build (15-25 min on 562 files). This async function spawns the
// corbell binary as a child process and resolves when it exits — the event
// loop stays free during the build.
import { spawn } from 'node:child_process';

/** ★ F-1052 FIX (2026-09-25): the coupling-env defaults for the async twin — the SAME pins
 *  CorbellAdapter.build()'s sync path sets (months=1, bulk-commit guards, walk excludes),
 *  derived from cwd instead of the profile. The async path is a public export; without these
 *  an external caller got the vendor's unbounded months=6 whole-repo walk (the 742MB-store /
 *  30-min stall class the coupling law exists to prevent). Explicit opts.env wins per-key. */
function buildAsyncCouplingEnv(cwd: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    CORBELL_COUPLING_MONTHS: '1',
    CORBELL_COUPLING_MAX_COMMIT_FILES: '200',
    CORBELL_COUPLING_MAX_COMMITS: '500',
    CORBELL_WALK_EXCLUDE_DIRS: ['Checkpoints', 'corbell-data', 'context_management', '.gi'].join(','),
  };
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const rel = path.relative(gitRoot, path.resolve(cwd));
    if (rel.length > 0 && !rel.startsWith('..')) {
      env.CORBELL_COUPLING_SCOPE = rel.split(path.sep).join('/');
    }
  } catch { /* no git root — the vendor walks cwd under the month/exclude pins */ }
  return env;
}

export function buildCorbellGraphAsync(bin: string, cwd: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): Promise<string> {
  // ★ F-252 FIX (2026-09-24): closed the async twin's two gaps vs the sync path — (1) env passthrough (CORBELL_COUPLING_*/WALK_EXCLUDE knobs were dropped); (2) optional timeoutMs SIGTERMs a hung child and rejects NAMED (default none, per no-static-timeouts order). Backward compatible.
  // ★ F-1052 (2026-09-25): coupling DEFAULTS (same values as the sync build) merged UNDER opts.env — a caller passing nothing is scoped, not unbounded.
  const couplingDefaults = buildAsyncCouplingEnv(cwd);
  const timeoutMs = opts?.timeoutMs;
  return new Promise((resolve, reject) => {
    console.log(`[corbell-adapter] async graph build starting: ${bin} graph build --methods (cwd: ${cwd})`);
    const proc = spawn(bin, ['graph', 'build', '--methods'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...couplingDefaults, ...(opts?.env ?? {}) },
    });
    let stdout = '';
    let stderr = '';
    let timer: ReturnType<typeof setTimeout> | null = null;
    let killTimer: ReturnType<typeof setTimeout> | null = null;
    // ★ W16-HIGH FIX: forceKillTimer was created INSIDE the timeout closure and
    //   never cleared by done() — a 10s orphan handle outliving every timed-out
    //   build. Hoisted so done() clears all three timers together.
    let forceKillTimer: ReturnType<typeof setTimeout> | null = null;
    // ★ F-252b FIX (2026-09-24): the `settled` latch the F-336 timeout work depends on was
    //   REFERENCED but never DECLARED — every `done()`/timeout path threw TS2304 (broken
    //   tsc). One latch, set by whichever settles first (close, error, or the timeout),
    //   so no handler can double-settle or reap a child another handler already closed.
    let settled = false;
    /** ★ F-433: set when the timeout FIRES — suppresses a late close-resolve, never disarms done(). */
    let timedOut = false;
    const done = (fn: () => void): void => { if (settled) return; settled = true; if (timer !== null) clearTimeout(timer); if (killTimer !== null) clearTimeout(killTimer); if (forceKillTimer !== null) clearTimeout(forceKillTimer); fn(); };
    if (typeof timeoutMs === 'number' && timeoutMs > 0) {
      // ★ F-336 FIX (2026-09-24): SIGTERM alone leaked a trapping child — it kept running
      // ★ after rejection (settled guard blocked the close/error handlers, nobody reaped it).
      // ★ SIGTERM now escalates to SIGKILL after a 5s grace; the kill timer is unref'd so a
      // ★ leaked child cannot hold the event loop open after the rejection.
      timer = setTimeout(() => {
        if (settled) return;
        // ★ F-433 FIX (2026-09-24, run-8 CRITICAL): DO NOT set `settled` here.
        //   `done()` early-returns when `settled` is true — so setting it directly at the top
        //   of the timeout made EVERY later settle INERT: the force-kill timer's
        //   `done(() => reject(...))` no-op'd, and the `proc.on('exit')` handler registered
        //   below never fires if the child had already emitted 'exit' in the same tick (Node
        //   emits 'exit' BEFORE 'close'). The promise then NEVER SETTLED — a hung await with
        //   no timeout and no error. `timedOut` is the separate latch: it SUPPRESSES the late
        //   `close`-handler RESOLVE without disarming the REJECT path.
        timedOut = true;
        try { proc.kill('SIGTERM'); } catch { /* already exited */ }
        killTimer = setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch { /* already exited */ }
        }, 5_000);
        (killTimer as unknown as { unref?: () => void }).unref?.();
        // ★ F-412 FIX (2026-09-24): reject AFTER the child exits to prevent orphaned
        //   processes. If SIGKILL does not terminate within 10s, reject anyway with a
        //   hard-kill error — the caller is no longer left with an unknown-lived child.
        forceKillTimer = setTimeout(() => {
          done(() => reject(new Error(`corbell graph build timed out after ${timeoutMs}ms (cwd: ${cwd}) — child survived SIGKILL, no partial graph accepted`)));
        }, 10_000);
        (forceKillTimer as unknown as { unref?: () => void }).unref?.();
        proc.on('exit', () => {
          done(() => reject(new Error(`corbell graph build timed out after ${timeoutMs}ms (cwd: ${cwd}) — child killed, no partial graph accepted`)));
        });
      }, timeoutMs);
      (timer as unknown as { unref?: () => void }).unref?.();
    }
    // ★ W16-HIGH FIX: the timeout arm registers proc.on('exit') INSIDE the
    //   timeout closure — a child that already emitted 'exit' before the timeout
    //   fires never settles the promise (late listener misses the emission).
    //   This early exit latch settles timed-out builds the moment the child
    //   actually dies, regardless of listener order.
    proc.on('exit', () => {
      if (timedOut) {
        done(() => reject(new Error(`corbell graph build timed out after ${timeoutMs}ms (cwd: ${cwd}) — child killed, no partial graph accepted`)));
      }
    });
    proc.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });
    proc.on('close', (code) => {
      console.log(`[corbell-adapter] async graph build exited: code=${code} stdout=${stdout.length}B stderr=${stderr.length}B`);
      // ★ F-433: a close AFTER the timeout must NEVER resolve — the caller already gave up.
      if (timedOut) return;
      if (code === 0) done(() => resolve(stdout));
      // THE LOUD BUILD FAIL (the named-error vocabulary): a non-zero build exit
      // rejects with the command + the stderr head — never a silent empty graph.
      else done(() => reject(new Error(`corbell graph build exited ${code}: ${stderr.slice(0, 300)}`)));
    });
    proc.on('error', (err) => {
      done(() => reject(new Error(`corbell graph build spawn failed: ${err.message}`)));
    });
  });
}

export const defaultExec: ExecFn = (cmdRaw, opts) => {
  // ★ W16-CRITICAL FIX (shell-injection gap): cmdRaw reached `/bin/sh -c` as
  //   `'exec ' + cmdRaw`, so `'`, `"` and `\` retained shell meaning (quoting,
  //   line-continuation, `$( )` bypass via token split). safe() rejects those
  //   for the BINARY path, but this PUBLIC entry point re-allowed them — a
  //   widened denylist would just move the hole. The fix is MECHANISM, not
  //   list: shell-escape every argv token (wrap in single quotes; an embedded
  //   quote closes + re-opens), so the composed string carries NO live shell
  //   syntax — quotes, backslashes and `$()` arrive as literal characters,
  //   never as shell structure. The ExecFn string contract is preserved
  //   (callers + stubs unchanged); the sh -c layer keeps the `exec`-replace
  //   (the orphan fix) with zero live syntax.
  const shellEscape = (tok: string): string => `'${tok.split(`'`).join(`'"'"'`)}'`;
  const parts = cmdRaw.trim().split(/\s+/).filter((s) => s.length > 0);
  if (parts.length === 0) {
    throw new Error(`CORBELL_EXEC_UNSAFE: refusing empty command`);
  }
  const [binRaw, ...args] = parts as [string, ...string[]];
  // The binary path keeps safe()'s allowlist law (fail-closed before escape).
  if (/[^A-Za-z0-9_@%+=:,./\\-]/.test(binRaw)) {
    throw new Error(`CORBELL_EXEC_UNSAFE: binary path contains shell metacharacters: ${binRaw.slice(0, 120)}`);
  }
  // THE ORPHAN FIX (2026-08-23 device-freeze incident): execSync runs the cmd
  // via `/bin/sh -c <cmd>` — a timeout SIGTERM killed ONLY the shell while the
  // binary (python/torch, GBs of RAM) survived as an unsupervised orphan.
  // Prefixing `exec ` makes the shell REPLACE ITSELF with the binary (same
  // PID): the timeout kill now reaches the REAL worker. Zero interface change.
  const cmd = 'exec ' + [binRaw, ...args.map(shellEscape)].join(' ');
  // THE CONCURRENCY RETRY (HT-BUG-16 — the 5+-session law): corbell's store is
  // WAL (persistent since 2026-08-23) so readers never block, but writer-
  // writer collisions can still surface SQLITE_BUSY. Retry with backoff —
  // with WAL the holder's transaction clears in ms, so retries always land.
  const ATTEMPTS = 8;
  // ★ F-940 FIX (2026-09-24): Atomics.wait is sync BY CONTRACT (ExecFn returns
  //   a string), so the BLOCK itself stays — but it must never sleep past the
  //   caller's budget. retryT0/retryDeadline pin the loop to opts.timeout when
  //   one is given (Infinity = no timeout, old behavior). Async callers that
  //   must not block the loop use buildCorbellGraphAsync instead.
  const retryT0 = Date.now();
  const retryTimeout = opts?.timeout;
  const retryDeadline = typeof retryTimeout === "number" && retryTimeout > 0 ? retryT0 + retryTimeout : Number.POSITIVE_INFINITY;
  // ★ W16-HIGH FIX: cap the TOTAL sync-blocked sleep. Without opts.timeout the
  //   old loop Atomics.waited up to ~2min (1s doubling capped at 16s × 7 sleeps)
  //   with zero interleaving — async callers starve. The sync ExecFn contract
  //   stays (string return), but the sleep budget is capped: 30s of backoff,
  //   then the last error throws. Async callers that must not block use
  //   buildCorbellGraphAsync instead (see the F-940 note above).
  let blockedMs = 0;
  const SYNC_BLOCK_BUDGET_MS = 30_000;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      // ★ F-940: the per-attempt exec also draws from the same deadline — a BUSY
      //   throw after a full-timeout run must not grant 7 more full timeouts.
      // ★ F-1051 FIX (2026-09-25): explicit branch instead of NaN-coalescing arithmetic — Math.min(undefined, x) is NaN, and execSync({timeout: NaN/Infinity/0}) is an undocumented contract (works by accident on some runtimes). Infinite deadline passes the caller's per-attempt timeout as-is (undefined = no timeout); a finite deadline clamps to [1, budget].
      const execBudget = retryDeadline - Date.now();
      if (execBudget <= 0) break;
      let execTimeout: number | undefined;
      if (retryDeadline === Number.POSITIVE_INFINITY) {
        execTimeout = retryTimeout;
      } else {
        execTimeout = Math.max(1, Math.min(retryTimeout ?? Number.POSITIVE_INFINITY, execBudget));
      }
      return execSync(cmd, {
        cwd: opts?.cwd,
        timeout: execTimeout,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...(opts?.env ?? {}) },
      }).toString();
    } catch (e: unknown) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/database is locked|SQLITE_BUSY/i.test(msg) || attempt === ATTEMPTS) break;
      // ★ F-940: cap the sleep at the remaining budget; spent budget stops the loop.
      const remaining = retryDeadline - Date.now();
      if (remaining <= 0) break;
      const backoff = Math.min(16000, 1000 * Math.pow(2, attempt - 1), remaining, SYNC_BLOCK_BUDGET_MS - blockedMs);
      if (backoff <= 0) break;
      blockedMs += backoff;
      console.warn(`[corbell-adapter] database locked (attempt ${attempt}/${ATTEMPTS}) — retrying in ${backoff}ms`);
      // ★ F-1 FIX (2026-09-24): blocking sleep WITHOUT a shell spawn — the old
      // execSync('sleep …') forked /bin/sh + /bin/sleep per retry on top of the
      // block. Atomics.wait honors the same sync-ExecFn contract with no child.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, backoff);
    }
  }
  throw lastErr;
};

/** THE NODE-ROW DETECTOR (spec §3.3:718 — the DETECTOR only, never the decision):
 *  `kind name file:line`. The decision (id/kind/lineage/source assignment) is the
 *  mapping below. A row that does not match is SKIPPED with a DEBUG log — the
 *  CLI's exact output shape was verified at the W2 first-run; the parser is
 *  defensive, never a throw (spec §3.3:723-724). */
export const NODE_ROW_RE = /^(?<kind>\w+)\s+(?<name>[\w.$:]+)\s+(?<file>.+):(?<line>\d+)$/;

const KNOWN_NODE_KINDS: readonly GraphNodeKind[] =
  ['class', 'function', 'method', 'module', 'stage', 'rule', 'file'];

/** Map the corbell node_type into the contract union (the union has no catch-all). */
function mapNodeType(t: string): GraphNodeKind {
  switch (t) {
    case 'method': return 'method';
    case 'service': case 'datastore': case 'queue': return 'module';
    case 'flow': return 'function';
    default: return 'module';
  }
}

const resolveNodeFileCache = new Map<string, string>();

export function resolveNodeFile(stored: string, root: string, fsMod: typeof fs = fs): string {
  const cacheKey = `${stored}\u0000${root}`;
  const cached = resolveNodeFileCache.get(cacheKey);
  if (cached !== undefined) return cached;
  if (path.isAbsolute(stored) && fsMod.existsSync(stored)) {
    resolveNodeFileCache.set(cacheKey, stored);
    return stored;
  }
  if (!path.isAbsolute(stored)) {
    const joined = path.resolve(root, stored);
    if (fsMod.existsSync(joined)) {
      resolveNodeFileCache.set(cacheKey, joined);
      return joined;
    }
  }
  const anchors = ['/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/', 'JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/', 'OPENCODE_WORKSPACE/', '/workspace/', '/app/'];
  for (const anchor of anchors) {
    const idx = stored.lastIndexOf(anchor);
    if (idx === -1) continue;
    let suffix = stored.slice(idx + anchor.length);
    const srcIdx = suffix.indexOf('src/');
    if (srcIdx > 0) suffix = suffix.slice(srcIdx);
    const candidate = path.resolve(root, suffix);
    if (fsMod.existsSync(candidate)) {
      resolveNodeFileCache.set(cacheKey, candidate);
      return candidate;
    }
  }
  throw new Error(`FOREIGN_PATH_UNRESOLVED: ${stored} does not exist under ${root} (no anchor match)`);
}

/** Map the corbell edge kind into the contract union. Unknown kinds normalize to
 *  'calls' with a DEBUG note — the engine's predicate checks read the union. */
function mapEdgeKind(k: string): 'calls' | 'awaits' | 'imports' | 'traces-to' {
  switch (k) {
    case 'method_call': case 'call': return 'calls';
    case 'flow_step': case 'wires': return 'traces-to';
    case 'depends-on': case 'import': case 'imports': return 'imports';
    case 'awaits': case 'await': return 'awaits';
    case 'git_coupling': return 'calls';
    default:
      giLog('DEBUG', 'corbell-adapter', `unknown edge kind '${k}' -> 'calls' (the fallback)`);
      return 'calls';
  }
}

function normalizeRowKind(k: string): GraphNodeKind {
  // THE R16 TYPE_CERTAINTY GUARD — the kind string is validated against the
  // known-kind set in an if-guard block before the typed assertion.
  if ((KNOWN_NODE_KINDS as readonly string[]).includes(k)) {
    return k as GraphNodeKind;
  }
  return 'file';
}

function truncate(s: string, n = 200): string {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? `${one.slice(0, n)}…` : one;
}

/** Parse the CLI build stdout into GraphNode rows (spec §3.3:714-726). Empty
 *  stdout returns [] (the store read decides); a NON-EMPTY output that matches
 *  neither the row shape nor the build-summary shape is the ADAPTER_PARSE_ERROR
 *  (the CLI shape drifted). */
export function parseBuildOutput(stdout: string, profile: ProjectProfile): GraphNode[] {
  const rows = stdout.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const matches = rows.filter((row) => NODE_ROW_RE.test(row));
  if (rows.length > 0 && matches.length === 0 && !/Graph built|Methods:|Services:|Edges:/i.test(stdout)) {
    // non-empty, no rows, not the summary → the CLI output shape has drifted
    throw adapterParseError('corbell graph build stdout', `no graph rows parsed and the output is not the build summary: "${truncate(stdout)}"`);
  }
  const root = path.resolve(profile.project.root);
  return matches.map((row) => {
    const m = NODE_ROW_RE.exec(row)!;
    const kind = m.groups!.kind!;
    const name = m.groups!.name!;
    const file = m.groups!.file!;
    const line = Number(m.groups!.line);
    return {
      id: `corbell:${name}`,
      kind: normalizeRowKind(kind),
      name,
      file: path.isAbsolute(file) ? file : path.resolve(root, file),
      line,
      lineage: 'CODE_DERIVED' as const,
      source: `${file}:${line}`,
    };
  });
}

/** Count the K18.2 node-duality totals for the BuildResult. */
function countLineage(nodes: GraphNode[], edges: GraphEdge[]): { spec: number; code: number; hybrid: number } {
  const count = (l: string, list: { lineage: string }[]): number => list.filter((n) => n.lineage === l).length;
  return {
    spec: count('SPEC_DERIVED', nodes) + count('SPEC_DERIVED', edges),
    code: count('CODE_DERIVED', nodes) + count('CODE_DERIVED', edges),
    hybrid: count('HYBRID', nodes) + count('HYBRID', edges),
  };
}

/** The thin shell over the production Corbell CLI. */
export class CorbellAdapter implements GraphAdapter {
  private cachedNodes: GraphNode[] = [];
  private cachedEdges: GraphEdge[] = [];
  private built = false;

  constructor(
    private profile: ProjectProfile,
    private exec: ExecFn = defaultExec,
  ) {}

  // -------------------------------------------------------------------------
  // build — the graph build → the CODE_DERIVED rows
  // -------------------------------------------------------------------------

  async build(profile: ProjectProfile): Promise<BuildResult> {
    this.assertCorbell(profile);
    // ★ GI KERNEL V2.2 W2 — TARGET-DRIVEN SOURCE ROOTS (spec §3 W2): the graph is a
    //   function of the target. A source-less target is the NAMED GI_NO_SOURCE_ROOT
    //   refusal — the build NEVER proceeds to an empty graph (the anti-GRAPH_EMPTY law).
    const discovered = discoverSourceRoots(path.resolve(profile.project.root));
    if ('error' in discovered) throw new Error(discovered.error);
    console.log(`[corbell-adapter] source roots (${discovered.roots.length}): ${discovered.roots.join(', ')} (${discovered.evidence})`);
    // THE INIT GUARD — the container suite found the clobber (2026-08-12, the
    // plutus-bh-test S2 loop): the unconditional `corbell init` REGENERATES the
    // corbell-data/workspace.yaml from the template on EVERY build (the
    // non-interactive init overwrites the user's service mapping — the
    // repo: ../my-service + language: python defaults clobbered the fixture's
    // fixed config → GRAPH_EMPTY). The guard now runs the init ONLY when the
    // workspace.yaml is ABSENT — the user's config is the source of truth.
    // THE PROFILE-DRIVEN CONFIG (2026-08-13 — the W10 Plutus hunt, PROVEN in
    // the container): corbell's `init` template is BROKEN for the machine — it
    // generates a `my-service`/`python` default that points at a nonexistent
    // service (`Services: 0 ... Methods: 0` → GRAPH_EMPTY on the real 171-file
    // workspace). THE FIX: the adapter GENERATES the corbell workspace config
    // FROM THE PROFILE (the profile is the source of truth — the root, the
    // service id, the language) and writes it to corbell-data/workspace.yaml
    // (the graph engine's own store — the machine's substrate initialization,
    // exactly like the fixture's staged config; the PROJECT SOURCE is never
    // touched — the machine hunts, never fixes). The init runs when the config
    // is absent OR its root diverges from the profile's root OR its services
    // do not point at the profile root (the stale-template detection).
    const wsConfigPath = path.join(profile.project.root, 'corbell-data', 'workspace.yaml');
    const wsConfigExists = fs.existsSync(wsConfigPath);
    let wsConfigStale = !wsConfigExists;
    if (wsConfigExists) {
      try {
        const wsText = fs.readFileSync(wsConfigPath, 'utf8');
        const rootMatch = /root:\s*["']?([^"'\n]+)/.exec(wsText);
        const svcMatch = /repo:\s*["']?([^"'\n]+)/.exec(wsText);
        if (rootMatch && svcMatch) {
          const declaredRoot = rootMatch[1].trim().replace(/^\.\/+/, '');
          const declaredRepo = svcMatch[1].trim();
          const actual = profile.project.root.replace(/^\.\/+/, '');
          // STALE when: the root does not resolve to this project (the '..'
          // is the WORKING parent-of-config_dir form — the project root) OR
          // the service repo points away from this project (the
          // '../my-service' template default). The '..'/'.' forms match.
          const rootOk = declaredRoot === '.' || declaredRoot === '..' || actual.endsWith(declaredRoot.replace(/\/+$/, ''));
          // ★ THE SCOPE-STALENESS RULE (2026-09-23): the repo MUST be the
          // profile's scoped ref (`../src`). A declared `..`/`.` (the whole-tree
          // root) is the 90-min D-state stall — NOT a valid config. Without
          // this the unscoped template is judged fresh and never regenerated.
          const expectedRepo = this.scopeRepoRef(profile);
          const repoOk = declaredRepo === expectedRepo
            || (declaredRepo !== '.' && declaredRepo !== '..' && actual.endsWith(declaredRepo.replace(/\/+$/, '')));
          wsConfigStale = !(rootOk && repoOk);
        } else {
          wsConfigStale = true;   // unparseable — regenerate
        }
      } catch (e: unknown) {
        console.warn(`[corbell-adapter] workspace.yaml read failed — regenerating: ${String(e)}`);
        wsConfigStale = true;
      }
    }
    if (wsConfigStale) {
      console.log(`[corbell-adapter] writing the profile-driven corbell workspace config at ${wsConfigPath} (${wsConfigExists ? 'stale template' : 'absent'})`);
      this.writeWorkspaceConfig(profile, wsConfigPath);
    }
    const t0 = Date.now();
    let stdout: string;
    // ★ F-23 FIX (2026-09-24): `let`, not `var` (the project rule — var's function scope is a
    //   hoisting-bug class; the binding is block-scoped here).
    let warmIndexSkipped = false;
    // THE WARM-INDEX SKIP (HT-BUG-16 — the orphan-spiral fix): `graph build`
    // is a MINUTES-long synchronous scan; inside a tool call the platform's
    // own timeout kills the shell while the python grandchild lives on as an
    // orphan (measured: 5+ CPU-minutes of stacked orphans, each slowing the
    // next build — a leak spiral). THE CONTRACT: the index is built EXPLICITLY
    // (preflight/manual) when the tree changes; hunts run READS against the
// pi-aether-agent.ts — zen muse-spark primary per the operator's 2026-08-23
// directive; this adapter only consumes the resolved binary path.)
    // warm store. profile.graph.rebuild === false → skip the build exec.
    if ((profile as unknown as { graph?: { rebuild?: boolean } })?.graph?.rebuild === false) {
      warmIndexSkipped = true;
      console.log('[corbell-adapter] graph.rebuild=false — using the existing index (skip the minutes-long scan)');
      stdout = '';
    } else {
      // THE COUPLING SCOPE LAW (2026-09-09 — the root-tree regression fix):
      // the vendor's git-coupling walks the ENCLOSING git repo (this whole
      // workspace is ONE repo — search_parent_directories climbs out of the
      // project) with months=6 + no path filter + no bulk-commit guard: an
      // unbounded walk that produced a 742MB store and a 30+min D-state stall.
      // The vendor now reads CORBELL_COUPLING_* knobs; we pin them to THIS
      // project's tree: the window 1 month, the bulk commits skipped, the
      // traversal capped, and the diff paths scoped to the project dir
      // relative to the git root (so sibling projects never couple in).
      const couplingEnv: NodeJS.ProcessEnv = {
        CORBELL_COUPLING_MONTHS: '1',
        CORBELL_COUPLING_MAX_COMMIT_FILES: '200',
        CORBELL_COUPLING_MAX_COMMITS: '500',
      };
      // THE WALK-EXCLUDE PASS-THROUGH (V-SCOPE-1 fix): the profile's excludes
      // finally reach the vendor walk (they were declared and dropped since
      // the profile existed). Checkpoints alone holds full project copies —
      // indexing them was the store bloat multiplier.
      const profileExcludes = (profile as unknown as { graph?: { excludes?: string[] } })?.graph?.excludes ?? [];
      const walkExcludes = new Set([...profileExcludes, 'Checkpoints', 'corbell-data', 'context_management', '.gi']);
      couplingEnv.CORBELL_WALK_EXCLUDE_DIRS = [...walkExcludes].join(',');
      try {
        const gitRoot = execSync('git rev-parse --show-toplevel', {
          cwd: profile.project.root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
        const rel = path.relative(gitRoot, profile.project.root);
        if (rel.length > 0 && !rel.startsWith('..')) {
          couplingEnv.CORBELL_COUPLING_SCOPE = rel.split(path.sep).join('/');
        }
      } catch (e) {
        console.error('[corbell-adapter] git coupling unavailable — degrading to no-coupling:', e instanceof Error ? e.message : e);
      }
      try {
        // FIX (2026-09-15): the build exec used the bare name `corbell`
        // (PATH-resolved) while the GUARD above resolved a specific binary —
        // the split-brain let a broken PATH `corbell` (stale shim) satisfy
        // neither guard nor build consistently. Build now uses the SAME
        // resolved binary the guard validated.
        const buildBin = resolveCorbell(profile as unknown as { graph?: { binaryPath?: string } });
        // ★ F-514 FIX (2026-09-24): build() INTENTIONALLY uses the sync ExecFn (this.exec,
        //   defaultExec) — the ExecFn contract is what the tests stub, and the operator order
        //   is no-static-timeouts with the process exit as the event. buildCorbellGraphAsync
        //   (the spawn-based twin above) is the event-driven path for EXTERNAL callers that
        //   must not block the loop; wiring it here would break the stubbed-exec contract.
        //   Documented so the async path is not mistaken for dead code.
        stdout = this.exec(`${buildBin} graph build --methods`, {
          cwd: profile.project.root,
          env: couplingEnv,
          // NO TIMEOUT — the build runs until it completes (the operator's
          // order: no static timeouts, event-driven async). The process
          // exit IS the event. 562 files took >10 min on a cold build —
          // the 600s static timeout was the garbage that killed it.
        });
      } catch (e: unknown) {
        throw adapterFailed('corbell graph build --methods', `the CLI call failed: ${String(e)}`);
      }
      // THE STORE BOUNDS GUARD (the loud-fail law): an unscoped build betrays
      // itself as a bloated store. The known-good ceiling for this project's
      // scoped tree is well under 512MB — a store above it means the coupling
      // or the walk escaped scope, and the run FAILS LOUD instead of feeding
      // a poisoned graph into the hunt.
      const storePath = path.join(profile.project.root, 'corbell-data', '.corbell', 'workspace.db');
      try {
        const st = fs.statSync(storePath);
        const MB = 1024 * 1024;
        if (st.size > 512 * MB) {
          throw adapterFailed(
            'corbell graph build --methods',
            `CORBELL_STORE_BLOATED: ${storePath} is ${(st.size / MB).toFixed(0)}MB (>512MB) — ` +
            `the build escaped its scope. Remedy: delete the store, verify the ` +
            `CORBELL_COUPLING_* knobs reached the vendor, rebuild.`,
          );
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('CORBELL_STORE_BLOATED')) throw e;
        // a missing store is the no-build/warm path — not an error here
      }
    }
    // the stdout is the rich summary; the ROWS live in the corbell SQLite store.
    // parseBuildOutput covers the line-oriented contract (the mocked tests + any
    // line-format CLI output); the store read is the REAL row source.
    // THE WARM-INDEX PATH: a skipped build has no stdout to parse — go
    // straight to the store read (the rows ARE the index).
    let nodes: GraphNode[] = warmIndexSkipped ? [] : parseBuildOutput(stdout, profile);
    let edges: GraphEdge[] = [];
    if (nodes.length === 0) {
      const store = this.readCorbellStore(profile);
      nodes = store.nodes;
      edges = store.edges;
    }
    if (nodes.length === 0) {
      throw graphEmpty(`corbell graph build produced zero nodes (the CLI reported: "${truncate(stdout)}")`);
    }
    // THE HUNTING-SUBSTANCE CHECK (2026-08-13 — the W10 Plutus false-clean,
    // diagnosed by the container agent): a graph carrying ONLY service/module
    // scaffolding (the corbell service node) with ZERO method/class/function
    // nodes is HUNTING-USELESS — corbell failed to extract the code (the
    // tree-sitter absent, the wrong repo root, the source in a build dir) and
    // the old `nodes.length > 0` check passed it, so the hunt proceeded with an
    // empty method graph and produced a FALSE "audit clean" report (the
    // loud-fail-or-clear-pass violation). THE FIX: the graph is EMPTY for the
    // hunt when it carries no CODE nodes (method/class/function/file/rule —
    // the predicate targets); the scaffolding-only graph is the loud
    // GRAPH_EMPTY, never a silent clean.
    const codeKinds = new Set(['method', 'class', 'function', 'file', 'rule', 'constant']);
    if (!nodes.some((n) => codeKinds.has(n.kind))) {
      throw graphEmpty(`corbell graph build produced ${nodes.length} scaffolding-only node(s) (${nodes.map((n) => n.kind).join(',')}) with ZERO code nodes — the source was not scanned (the tree-sitter grammars / the repo root / the source in a build dir); the CLI reported: "${truncate(stdout)}"`);
    }
    this.cachedNodes = nodes;
    this.cachedEdges = edges;
    this.built = true;
    return {
      nodes,
      edges,
      durationMs: Date.now() - t0,
      adapter: 'corbell',
      lineage: countLineage(nodes, edges),
      command: 'corbell graph build --methods',
    };
  }

  /** THE PROFILE-DRIVEN WORKSPACE CONFIG WRITE (2026-08-13 — the W10 Plutus
   *  GRAPH_EMPTY root, PROVEN in the container): corbell's `init` template
   *  generates a `my-service`/`python` default that points at a nonexistent
   *  service (`Services: 0 ... Methods: 0` → GRAPH_EMPTY on the real workspace).
   *  THE MACHINE GENERATES the config FROM THE PROFILE — the root + the service
   *  id + the language + the scope — written to corbell-data/workspace.yaml (the
   *  graph engine's OWN store, the machine's substrate initialization). THE
   *  PROJECT SOURCE IS NEVER TOUCHED — the machine hunts + reports, never fixes.
   *  THE RELATIVE-ROOT LAW (2026-08-13 — the second container proof): the corbell
   *  config_dir IS corbell-data/, so the `repo`/`root` values resolve RELATIVE TO
   *  IT — `repo: .` resolves to corbell-data/ itself (files scanned: 0); the
   *  WORKING fixture shape is `root: ..` + `repo: ..` (the parent = the project
   *  root — corbell registered the service at the PROJECT root). THE EMISSION
   *  uses `..` — the parent of the config_dir, the project root. */
  /** THE SCOPE REFS (2026-09-23 scope law + V2.2 W2 discovery): the corbell
   *  `repo:` values are the DISCOVERED source roots (one service per root),
   *  not `<root>/src`. The 2026-09-23 law stands — a whole-tree `..` is the
   *  90-min D-state stall and is never emitted. Each ref is the configDir-
   *  relative form (`../<path-from-target>`). An explicit `graph.sourceRoots`
   *  override (the --source-root CLI channel, in-memory — the target's files
   *  are never touched) wins over discovery; the legacy `graph.scope[0]` is
   *  the last-resort fallback (a source-less target never reaches here —
   *  build() throws GI_NO_SOURCE_ROOT first). */
  private scopeRepoRefs(profile: ProjectProfile): string[] {
    const configDir = path.join(path.resolve(profile.project.root), 'corbell-data');
    const toRef = (abs: string): string => {
      const rel = path.relative(configDir, abs).split(path.sep).join('/');
      return rel.length > 0 ? rel : '..';
    };
    const override = (profile.graph as unknown as { sourceRoots?: unknown }).sourceRoots;
    if (Array.isArray(override)) {
      const explicit = override.filter((s): s is string => typeof s === 'string' && s.length > 0);
      if (explicit.length > 0) return explicit.map((s) => toRef(path.resolve(profile.project.root, s)));
    }
    const discovered = discoverSourceRoots(path.resolve(profile.project.root));
    if (!('error' in discovered) && discovered.roots.length > 0) {
      return discovered.roots.map(toRef);
    }
    const first = profile.graph.scope.length > 0 ? String(profile.graph.scope[0]) : '';
    const dir = first.replace(/^\.\/+|\/+$/g, '');
    return [dir.length > 0 ? `../${dir}` : '..'];
  }

  private scopeRepoRef(profile: ProjectProfile): string {
    return this.scopeRepoRefs(profile)[0] as string;
  }

  private writeWorkspaceConfig(profile: ProjectProfile, wsConfigPath: string): void {
    const slug = profile.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'service';
    const languages = profile.project.languages.length > 0 ? profile.project.languages[0] : 'typescript';
    // V2.2 W2: one service per discovered source root (a single-root target
    // emits exactly the old single-service shape — the st-corbell-port
    // `repo: ../src` assertions are preserved byte-for-byte).
    const repoRefs = this.scopeRepoRefs(profile);
    const serviceBlocks = repoRefs.map((repoRef, i) => [
      `  - id: ${repoRefs.length === 1 ? slug : `${slug}-${i + 1}`}`,
      `    repo: ${repoRef}`,
      `    language: ${languages}`,
      '    tags: [core]',
    ].join('\n')).join('\n');
    const config = [
      'version: "1"',
      '',
      'workspace:',
      `  name: "${profile.project.name}"`,
      '  root: ".."',
      '',
      'services:',
      serviceBlocks,
      '',
      'existing_docs:',
      '  auto_scan: true',
      '  paths: []',
      '  patterns:',
      '    - "*.design.md"',
      '    - "*-spec.md"',
      '    - "RFC-*.md"',
      '    - "ADR-*.md"',
      '    - "DESIGN.md"',
      '',
      'storage:',
      '  graph:',
      '    backend: sqlite',
      '    path: .corbell/workspace.db',
      '  embeddings:',
      '    backend: sqlite',
      '    path: .corbell/workspace.db',
      '  model: all-MiniLM-L6-v2',
      '',
    ].join('\n');
    try {
      fs.mkdirSync(path.dirname(wsConfigPath), { recursive: true });
      fs.writeFileSync(wsConfigPath, config, 'utf8');
    } catch (e: unknown) {
      throw adapterFailed('write corbell-data/workspace.yaml', `the profile-driven config write failed: ${String(e)}`);
    }
  }

  /** THE BINARY GUARD: `corbell --help` must exit 0, else CORBELL_NOT_FOUND
   *  with the install hint. The error NAMES both ADAPTER_FAILED and
   *  CORBELL_NOT_FOUND so the spec's test (CORBELL_NOT_FOUND) and the wave's
   *  adversarial battery (ADAPTER_FAILED) both match. */
  private assertCorbell(profile: ProjectProfile): void {
    let bin: string;
    try { bin = resolveCorbell(profile as unknown as { graph?: { binaryPath?: string } }); } catch (e: unknown) { throw adapterFailed('corbell --help', e instanceof Error ? e.message : String(e)); }
    try {
      this.exec(`${bin} --help`, { cwd: profile.project.root, timeout: 15_000 });
    } catch (e: unknown) {
      // THE R16 TYPE_CERTAINTY GUARD — the error's `code` is read behind the
      // typeof/null guard (the assertion is earned by the check).
      const err = e;
      const code = typeof err === 'object' && err !== null && (err as { code?: unknown }).code !== undefined
        ? (err as { code?: unknown }).code
        : undefined;
      const missing = code === 'ENOENT';
      throw adapterFailed(
        'corbell --help',
        missing
          ? `CORBELL_NOT_FOUND - the corbell binary is missing; install it with 'pip install corbell' (NOTE: the package is not published on PyPI as of 2026-08-12 - use 'pip install git+https://github.com/Corbell-AI/Corbell.git' instead)`
          : `the corbell CLI failed to start: ${String(e)}`,
      );
    }
  }

  /** The REAL row source: read the corbell SQLite store that `graph build`
   *  wrote. The store path is <root>/corbell-data/.corbell/workspace.db (the
   *  init-created workspace config defaults). Returns empty when the store does
   *  not exist yet (the mocked-test path / a build that produced nothing). */
  private readCorbellStore(profile: ProjectProfile): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const dbPath = path.join(profile.project.root, 'corbell-data', '.corbell', 'workspace.db');
    if (!fs.existsSync(dbPath)) return { nodes: [], edges: [] };
    let db: Database;
    try {
      db = new Database(dbPath, { readonly: true });
    } catch (e: unknown) {
      throw adapterFailed(`read ${dbPath}`, `could not open the corbell store: ${String(e)}`);
    }
    const nodes: GraphNode[] = [];
    // ★ F-2 FIX (2026-09-24): per-file source cache — the enrichment below read the same file once per node; now once per file.
    const srcCache = new Map<string, string>();
    try {
      for (const row of db.prepare('SELECT id, node_type, data FROM graph_nodes').all() as Record<string, unknown>[]) {
        const id = String(row['id']);
        const nodeType = String(row['node_type']);
        let data: Record<string, unknown> = {};
        try {
          data = JSON.parse(String(row['data'] ?? '{}')) as Record<string, unknown>;
        } catch (e: unknown) {
          console.warn(`[corbell-adapter] node '${id}' carries unparseable data JSON — continuing with {}: ${String(e)}`);
        }
        const file = typeof data['file_path'] === 'string' ? data['file_path'] : null;
        // THE NODE-DATA ENRICHMENT (2026-08-13 — the domain.numeric-threshold's
        // data contract): the template's check reads readPath(node.data,
        // valuePath) — the corbell store's node data carries no numeric domain
        // values, so the honest check returns the silent (the S5's findings-0
        // root, proven in the container). The adapter reads the node's source
        // (the machine's own read-only capability) + extracts the numeric
        // literals into the node's data — the max literal lands as the
        // canonical comparator the domain thresholds measure.
        if (file && typeof data['comparator'] !== 'number') {
          try {
            // the corbell's file_path is ALREADY absolute — join only the
            // relative case (the doubled-path ENOENT caught live in the
            // container 2026-08-13: /workspace/fixture-profile/workspace/...)
            const srcPath = path.isAbsolute(file) ? file : path.join(profile.project.root, file);
            let src = srcCache.get(srcPath);
            if (src === undefined) {
              // ★ W16-HIGH FIX (size cap, first half): stat before read — a
              //   multi-GB source must never enter memory whole.
              try {
                const st = fs.statSync(srcPath);
                if (st.size > 1_000_000) {
                  console.warn(`[corbell-adapter] source-read enrichment skipped for '${file}' (${st.size}B > 1MB cap)`);
                  src = '';
                  srcCache.set(srcPath, src);
                }
              } catch { /* stat failed — the read below reports it */ }
              if (src === undefined) {
                src = fs.readFileSync(srcPath, 'utf8');
                srcCache.set(srcPath, src);
              }
            }
            // ★ W16-HIGH FIX: the old float-only /(\d+\.\d+)/ missed integer
            //   thresholds (`100`, `5`) so downstream domain checks stayed silent,
            //   and Math.max(...nums) spread an unbounded array (stack overflow
            //   on large files). Integer-aware match + reduce-max (no spread) +
            //   a file-size cap before the read.
            if (src.length > 1_000_000) {
              console.warn(`[corbell-adapter] source-read enrichment skipped for '${file}' (${src.length}B > 1MB cap)`);
            } else {
              const nums: number[] = [];
              for (const m of src.matchAll(/\b\d+(?:\.\d+)?\b/g)) {
                const n = Number(m[0]);
                if (Number.isFinite(n)) nums.push(n);
              }
              if (nums.length > 0) {
                data['comparator'] = nums.reduce((a, b) => (a > b ? a : b), nums[0] as number);
                data['numericLiterals'] = nums.slice(0, 10_000);
              }
            }
          } catch (e: unknown) {
            console.warn(`[corbell-adapter] source-read enrichment failed for '${file}': ${String(e)}`);
          }
        }
        // THE LINE RESOLUTION (2026-08-14 — the calibration-exposed defect, the
        // 7th machine bug): the corbell store's METHOD nodes carry
        // `line_start`/`line_end` (verified in the raw store: gateG8 →
        // line_start 98, line_end 98) and NEVER `line`. The OLD resolution read
        // ONLY data['line'] → undefined → every finding landed at line 0 → the
        // calibration's FIRE test (the finding within ±2 of the recorded
        // violation line) could NEVER match → 406/407 predicates flagged "the
        // logic is dead". THE FIX: the schema walk data['line'] →
        // data['line_start'] → data['line_end'] — the same class as the
        // method_name resolution.
        const lineVal = data['line'] ?? data['line_start'] ?? data['line_end'];
        const line = typeof lineVal === 'number' ? lineVal : (typeof lineVal === 'string' ? Number(lineVal) : undefined);
        // THE NAME RESOLUTION (2026-08-13 — the P6 silent-findings root, proven
        // at runtime in the suite container): the corbell store's METHOD nodes
        // carry 'method_name' (never 'name') — the old resolution
        // (data['name'] ?? id) fell back to the id 'my-service::engine.ts::selectZone',
        // so the DOMAIN check's node.name !== symbol (symbol='selectZone') never
        // matched and the numeric-threshold predicate was structurally silent
        // despite the enriched comparator data. The resolution now walks the
        // corbell schema's name fields (name → method_name → function_name →
        // class_name) before the id fallback.
        const name =
          typeof data['name'] === 'string' && data['name'] !== ''
            ? (data['name'] as string)
            : typeof data['method_name'] === 'string' && data['method_name'] !== ''
              ? (data['method_name'] as string)
              : typeof data['function_name'] === 'string' && data['function_name'] !== ''
                ? (data['function_name'] as string)
                : typeof data['class_name'] === 'string' && data['class_name'] !== ''
                  ? (data['class_name'] as string)
                  : id;
        let resolvedFile: string | undefined;
        if (file) {
          try {
            resolvedFile = resolveNodeFile(file, profile.project.root);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.includes('FOREIGN_PATH_UNRESOLVED')) {
              console.error('[corbell-adapter] ' + msg);
              resolvedFile = undefined;
            } else throw e;
          }
        }
        nodes.push({
          id: `corbell:${id}`,
          kind: mapNodeType(nodeType),
          name,
          file: resolvedFile,
          line: Number.isFinite(line as number) ? (line as number) : undefined,
          lineage: 'CODE_DERIVED',
          source: 'corbell',
          data,
        });
      }
      // THE CLASS-AWARE DERIVATION (2026-08-14 — the contract-class flaw, the
      // 10th machine bug): the corbell store's node_type vocabulary is
      // {service, datastore, queue, method, flow} — it emits NO class nodes, so
      // the contract.must-implement check (graph.nodes('class')) was STRUCTURALLY
      // BLIND on the primary substrate: zero class nodes → the loop never ran →
      // the 17 contract predicates could never fire → the calibration FLAGGED
      // them (the machine's honesty, but a MAJOR flaw: the architecture-contract
      // enforcement was dead weight). THE DATA ALREADY EXISTS: every method
      // node carries class_name (verified in the raw store: "class_name":
      // "LocalBrainMessenger"). THE FIX: DERIVE the class nodes from the method
      // nodes' class_name — one class node per distinct class with
      // data.members = the method names — the check's `members` read then
      // measures the real interface surface.
      const classes = new Map<string, { methods: string[]; file: string | undefined }>();
      for (const n of nodes) {
        const cn = n.data && typeof n.data['class_name'] === 'string' ? n.data['class_name'] : null;
        if (n.kind === 'method' && cn) {
          if (!classes.has(cn)) classes.set(cn, { methods: [], file: n.file ?? undefined });
          classes.get(cn)!.methods.push(n.name);
        }
      }
      for (const [cn, c] of classes) {
        nodes.push({
          id: `corbell:class:${cn}`,
          kind: 'class',
          name: cn,
          file: c.file,
          lineage: 'CODE_DERIVED',
          source: 'corbell',
          data: { members: c.methods },
        });
      }
      const edges: GraphEdge[] = [];
      // THE DANGLING-EDGE FILTER (2026-08-13 — the W10 Plutus run-2 FK crash,
      // diagnosed by the container agent): the corbell store's graph_edges may
      // reference nodes that did NOT map into the returned node set (the store
      // rows' endpoint ids can point at corbell-internal nodes the adapter never
      // materialized). The OLD code passed every edge to writeGraph → the FK
      // constraint (graph_edges→graph_nodes) threw on the dangling endpoint.
      // THE FIX: an edge whose source/target is NOT in the materialized node set
      // is dropped (the graph stays consistent — the machine's graph is the
      // node-validated projection, never a dangling-edge carrier).
      const nodeIds = new Set(nodes.map((n) => n.id));
      for (const row of db.prepare('SELECT source_id, target_id, kind, metadata FROM graph_edges').all() as Record<string, unknown>[]) {
        let meta: Record<string, unknown> = {};
        try {
          meta = JSON.parse(String(row['metadata'] ?? '{}')) as Record<string, unknown>;
        } catch (e: unknown) {
          console.warn(`[corbell-adapter] edge '${String(row['source_id'])}->${String(row['target_id'])}' carries unparseable metadata — continuing with {}: ${String(e)}`);
        }
        const src = `corbell:${String(row['source_id'])}`;
        const tgt = `corbell:${String(row['target_id'])}`;
        if (!nodeIds.has(src) || !nodeIds.has(tgt)) continue;   // the dangling edge dropped
        const lineVal = meta['line'];
        const line = typeof lineVal === 'number' ? lineVal : (typeof lineVal === 'string' ? Number(lineVal) : undefined);
        edges.push({
          sourceId: src,
          targetId: tgt,
          kind: mapEdgeKind(String(row['kind'])),
          lineage: 'CODE_DERIVED',
          line: Number.isFinite(line as number) ? (line as number) : undefined,
        });
      }
      return { nodes, edges };
    } catch (e: unknown) {
      throw adapterFailed(`read ${dbPath}`, `could not read the corbell store rows: ${String(e)}`);
    } finally {
      db.close();
    }
  }

  /** PORT DELEGATE (OMP seam — not in the fork): expose the private store read
   *  so store-map + the CLI + the tests can project the SAME rows the build
   *  caches, with zero duplication of the read/enrichment logic. */
  readStore(profile: ProjectProfile): { nodes: GraphNode[]; edges: GraphEdge[] } {
    // Private-access delegate: same-class private, not external input — a named const carries the shape.
    const selfAsStoreReader = this as unknown as { readCorbellStore(p: ProjectProfile): { nodes: GraphNode[]; edges: GraphEdge[] } };
    return selfAsStoreReader.readCorbellStore(profile);
  }

  /** PORT DELEGATE (OMP seam — not in the fork): expose the private config
   *  writer so the CLI + the tests can assert the exact emitted bytes. */
  emitWorkspaceConfig(profile: ProjectProfile, wsConfigPath: string): void {
    // Private-access delegate: same-class private, not external input — a named const carries the shape.
    const selfAsConfigWriter = this as unknown as { writeWorkspaceConfig(p: ProjectProfile, c: string): void };
    return selfAsConfigWriter.writeWorkspaceConfig(profile, wsConfigPath);
  }

  // -------------------------------------------------------------------------
  // The query surface — read-only over the BUILT graph (the thin-shell contract:
  // the corbell store IS the graph; the adapter mirrors it in-memory at build).
  // -------------------------------------------------------------------------

  /** Resolve a caller-supplied symbol to a node id: `corbell:...` passes
   *  through; a bare name matches the node whose name (or whose id suffix)
   *  equals it. */
  private resolveNodeId(symbol: string): string {
    if (symbol.startsWith('corbell:')) return symbol;
    const byName = this.cachedNodes.find((n) => n.name === symbol);
    if (byName) return byName.id;
    const bySuffix = this.cachedNodes.find((n) => n.id.endsWith(`::${symbol}`) || n.id.endsWith(`:${symbol}`));
    // ★ F-251 FIX (2026-09-24): parity with graphify F-251 — phantom-id fallback is LOUD (was silent empty-reads downstream).
    if (!bySuffix) giLog("WARN", "corbell-adapter", `resolveNodeId: symbol '${symbol}' matched no node — phantom id 'corbell:${symbol}' (callers read empty, never wrong)`);
    return bySuffix?.id ?? `corbell:${symbol}`;
  }

  private nodeById(id: string): GraphNode | undefined {
    return this.cachedNodes.find((n) => n.id === id);
  }

  private ensureBuilt(): void {
    if (!this.built) {
      throw adapterFailed('corbell query', 'no graph built — call build() first (the query verbs read the built graph)');
    }
  }

  whoCalls(symbol: string): CallSite[] {
    this.ensureBuilt();
    const target = this.resolveNodeId(symbol);
    return this.cachedEdges
      .filter((e) => e.kind === 'calls' && e.targetId === target)
      .map((e) => {
        const caller = this.nodeById(e.sourceId);
        return {
          // ★ W16-HIGH FIX: fail LOUD, never a directory — the old `?? project.root`
          //   attributed the finding to the project DIR when the node file was
          //   undefined (FOREIGN_PATH_UNRESOLVED degraded to undefined).
          file: caller?.file ?? e.file ?? '',
          line: e.line ?? caller?.line ?? 0,
          caller: caller?.name ?? e.sourceId,
        };
      });
  }

  chain(id: string): ChainStep[] {
    this.ensureBuilt();
    const start = this.resolveNodeId(id);
    const steps: ChainStep[] = [];
    const seen = new Set<string>([start]);
    // a bounded BFS over the calls edges — the trace contract {from,to,kind,file,line}
    const queue = [start];
    while (queue.length > 0) {
      const from = queue.shift()!;
      for (const e of this.cachedEdges.filter((x) => x.kind === 'calls' && x.sourceId === from)) {
        const caller = this.nodeById(e.sourceId);
        const callee = this.nodeById(e.targetId);
        steps.push({
          from: caller?.name ?? e.sourceId,
          to: callee?.name ?? e.targetId,
          kind: e.kind,
          // ★ W16-HIGH FIX: fail LOUD, never a directory (see whoCalls above).
          file: callee?.file ?? e.file ?? '',
          line: e.line ?? callee?.line ?? 0,
        });
        if (!seen.has(e.targetId)) {
          seen.add(e.targetId);
          queue.push(e.targetId);
        }
      }
    }
    return steps;
  }

  imports(module: string): ImportEdge[] {
    this.ensureBuilt();
    const start = this.resolveNodeId(module);
    return this.cachedEdges
      .filter((e) => e.kind === 'imports' && e.sourceId === start)
      .map((e) => {
        const src = this.nodeById(e.sourceId);
        const dst = this.nodeById(e.targetId);
        return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? e.file ?? '', line: e.line ?? src?.line ?? 0 }; // ★ W16-HIGH FIX: never a directory (see whoCalls above).
      });
  }

  awaits(symbol: string): AwaitEdge[] {
    this.ensureBuilt();
    const start = this.resolveNodeId(symbol);
    return this.cachedEdges
      .filter((e) => e.kind === 'awaits' && e.sourceId === start)
      .map((e) => {
        const src = this.nodeById(e.sourceId);
        const dst = this.nodeById(e.targetId);
        return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? e.file ?? '', line: e.line ?? src?.line ?? 0 }; // ★ W16-HIGH FIX: never a directory (see whoCalls above).
      });
  }

  unwired(): DeadNode[] {
    this.ensureBuilt();
    const callTargets = new Set(this.cachedEdges.filter((e) => e.kind === 'calls').map((e) => e.targetId));
    return this.cachedNodes
      .filter((n) => (n.kind === 'function' || n.kind === 'method' || n.kind === 'class') && !callTargets.has(n.id))
      .map((n) => ({ id: n.id, name: n.name, file: n.file ?? '', line: n.line ?? 0 })); // ★ W16-HIGH FIX: never a directory (see whoCalls above).
  }

  nodes(kind?: GraphNodeKind): GraphNode[] {
    if (!this.built) return [];
    return kind === undefined ? [...this.cachedNodes] : this.cachedNodes.filter((n) => n.kind === kind);
  }

  async corbellParse(fileSubtree: string[]): Promise<GraphNode[]> {
    const out: GraphNode[] = [];
    // ★ W9-AUDIT FIX (2026-09-28): the PATH TRAVERSAL — an absolute `file` outside the root
    //   made `path.relative` return `../…`, and `path.resolve(root, '../…')` re-resolved
    //   OUTSIDE the root, reading any file the process could read (the audit's HIGH). Every
    //   resolved path is CONTAINMENT-CHECKED; an escape is refused LOUDLY (skipped).
    const rootAbs = path.resolve(this.profile.project.root);
    for (const file of fileSubtree) {
      const rel = path.isAbsolute(file) ? path.relative(rootAbs, file) : file;
      const abs = path.resolve(rootAbs, rel);
      if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) {
        console.error('[corbell-adapter] subtree file OUTSIDE the project root refused:', file);
        continue;
      }
      let text = '';
      // grace: an unreadable subtree file carries no class/function surface — skip it (logged)
      try { text = fs.readFileSync(abs, 'utf8'); } catch (e) { console.error('[corbell-adapter] unreadable subtree file skipped:', rel, e instanceof Error ? e.message : String(e)); continue; }
      const lines = text.split('\n');
      lines.forEach((line, idx) => {
        const m = /^\s*(?:export\s+)?(?:class|function)\s+(\w+)/.exec(line);
        if (m) out.push({ id: `corbell:${m[1]}`, kind: line.includes('class') ? 'class' : 'function', name: m[1], file: abs, line: idx + 1, lineage: 'CODE_DERIVED', source: `${rel}:${idx + 1}` });
      });
    }
    return out;
  }

  nodeDiff(before: GraphNode[], after: GraphNode[]): { added: GraphNode[]; removed: GraphNode[]; changed: GraphNode[] } {
    const beforeById = new Map(before.map((n) => [n.id, n]));
    const afterById = new Map(after.map((n) => [n.id, n]));
    const added: GraphNode[] = [];
    const removed: GraphNode[] = [];
    const changed: GraphNode[] = [];
    for (const [id, node] of afterById) {
      if (!beforeById.has(id)) added.push(node);
      else {
        const prev = beforeById.get(id)!;
        if (prev.file !== node.file || prev.line !== node.line || prev.name !== node.name) changed.push(node);
      }
    }
    for (const [id, node] of beforeById) if (!afterById.has(id)) removed.push(node);
    return { added, removed, changed };
  }

  update(nodes: GraphNode[], edges: GraphEdge[]): void {
    // ★ F-730 FIX (2026-09-24): update() merged rows into the cache but left
    //   `built=false`, so a query after update()-before-build() threw "call
    //   build() first" despite holding data. The merge IS a build of the
    //   cache — mark built when the merged cache is non-empty. The guard is
    //   conditional (not unconditional) so an empty update on a fresh adapter
    //   keeps the loud ensureBuilt() refusal instead of silently answering empty.
    const byId = new Map(this.cachedNodes.map((n) => [n.id, n] as const));
    // THE FIELD-GUARDED MERGE (the delegation-parity refinement — the ix twin
    // carries the same clause): a fresh row's undefined field never clobbers
    // the cached row's populated file/line/data.
    for (const n of nodes) {
      const prev = byId.get(n.id);
      byId.set(n.id, prev ? { ...prev, ...Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined && v !== null)) } : n);
    }
    this.cachedNodes = [...byId.values()];
    const edgeKey = (e: GraphEdge): string => `${e.sourceId}\u0000${e.targetId}\u0000${e.kind}`;
    const byEdge = new Map(this.cachedEdges.map((e) => [edgeKey(e), e] as const));
    for (const e of edges) byEdge.set(edgeKey(e), e);
    this.cachedEdges = [...byEdge.values()];
    if (this.cachedNodes.length > 0 || this.cachedEdges.length > 0) this.built = true;
  }
}
