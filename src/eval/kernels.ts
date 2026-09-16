// src/eval/kernels.ts — persistent py/js driver-process manager (WAVE 3, desk W3-A).
//
// Design (CONTRACTS-W3, honest scope): one long-lived DRIVER PROCESS per
// language, spawned lazily via Bun.spawn with piped stdio. Protocol per
// execution: write base64(UTF-8 code)+"\n" to stdin; read stdout lines until
// the `<<<OCI>>>` ... `<<<END>>>` envelope; parse the inner JSON
// {ok, stdout, error}. State persists across exec calls in the SAME process;
// reset kills that language's driver and respawns (state gone).
// Named outcomes: KERNEL_MISSING (spawn failure) and EVAL_TIMEOUT (timer kill).
// Driver files driver_py.py / driver_js.js live directly in baseDir, written
// idempotently (sha256 compare — never clobber mid-flight).
// Quiet-driver law: drivers print NOTHING except the sentinel result lines, but
// the envelope reader tolerates blank lines / stray whitespace regardless.

import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DRIVER_PY, DRIVER_JS } from "./prelude";

export type Lang = "py" | "js";
export interface ExecResult { ok: boolean; stdout: string; error?: string }

const END = "<<<END>>>";
const DEFAULT_TIMEOUT_MS = 30000;

const DRIVER_FILES: Record<Lang, string> = { py: "driver_py.py", js: "driver_js.js" };
const DRIVER_SOURCES: Record<Lang, string> = { py: DRIVER_PY, js: DRIVER_JS };

/** Internal signal: the spawn itself failed → maps to the KERNEL_MISSING named outcome. */
class KernelMissing extends Error {}

interface KernelState {
  proc: Bun.Subprocess;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  decoder: TextDecoder;
  buf: string;
  start: string;
  nonce: string;
  cwd: string;
  /** Spawned through setsid: proc.pid is its own process-group id, so
   *  kill(-pid) targets exactly this driver's descendant tree atomically. */
  ownSession: boolean;
  /** Absolute driver script path — the identity-sweep pattern source. */
  driverPath: string;
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

// Read the process-group id of a pid from /proc (field 5 of stat). Used to
// prove a driver really is its own session leader before kill(-pid); a bogus
// group kill could signal unrelated processes. Returns -1 when unreadable.
function pgidOf(pid: number): number {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    if (close < 0) return -1;
    const fields = stat.slice(close + 2).split(" ");
    const pgrp = Number(fields[2]);
    return Number.isInteger(pgrp) ? pgrp : -1;
  } catch {
    return -1;
  }
}

function msg80(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  return m.slice(0, 80);
}

// Absolute-path tool resolution (never parent-PATH lookup): a poisoned PATH
// or planted binary must not be able to hijack teardown-time execution.
function toolPathStatic(name: string): string | null {
  for (const dir of ["/usr/bin", "/bin", "/usr/local/bin"]) {
    try {
      fs.accessSync(`${dir}/${name}`, fs.constants.X_OK);
      return `${dir}/${name}`;
    } catch {
      // try next
    }
  }
  return null;
}

export class KernelManager {
  private readonly procs = new Map<Lang, KernelState>();
  private readonly gates = new Map<Lang, Promise<void>>();
  private readonly preambleDone = new Set<Lang>();
  // Timeout-skip: set ONLY on the 15s preamble-timeout path, cleared on
  // EVERY teardown (killLang/killAll/liveCount prune/cwd-switch/evict) via
  // clearPreamble(lang) — a reset or fresh spawn always retries the preamble.
  private readonly preambleSkipped = new Set<Lang>();
  private readonly creationDeferred = new Map<Lang, Promise<void>>();


  constructor(
    private readonly baseDir: string,
    private readonly binOverrides?: { py?: string; js?: string },
    private readonly preamble?: Partial<Record<Lang, string>>,
    private readonly extraEnv?: Record<string, string>,
  ) {}

  private clearPreamble(lang: Lang): void {
    this.preambleDone.delete(lang);
    this.preambleSkipped.delete(lang);
    this.creationDeferred.delete(lang);
  }

  async exec(
    lang: Lang,
    code: string,
    cwd: string,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    reset = false,
  ): Promise<ExecResult> {
    // Serialize per language: a driver's stdin/stdout is a single ordered
    // request/response channel, so concurrent execs on one lang must queue.
    const prev = this.gates.get(lang) ?? Promise.resolve();
    let release!: () => void;
    const cur = new Promise<void>((r) => {
      release = r;
    });
    this.gates.set(
      lang,
      prev.then(
        () => cur,
        () => cur,
      ),
    );
    try {
      await prev;
    } catch {
      // Defensive only: the chained gate never rejects by construction, but a
      // rejected predecessor must not wedge this language's queue.
    }
    try {
      const boundedMs = Number.isFinite(timeoutMs) ? Math.min(120000, Math.max(1000, timeoutMs)) : DEFAULT_TIMEOUT_MS;
      return await this.execInner(lang, code, cwd, boundedMs, reset);
    } finally {
      release();
    }
  }
  async killAll(): Promise<void> {
    // Never throws: snapshot + clear FIRST so waiters holding an old gate
    // chain cannot resurrect kernels — execInner re-checks identity after
    // every await and respawns only through ensureSpawned.
    try {
      const states = [...this.procs.values()];
      this.procs.clear();
      for (const lang of ["py", "js"] as const) this.clearPreamble(lang);
      await Promise.allSettled(states.map((s) => this.closeState(s)));
    } catch {
      // killAll is fire-and-forget from session.post — swallowing is the contract.
    }
  }

  liveCount(): number {
    // Reflect reality, not the map: reap drivers that already exited
    // (reader.cancel + child sweep via closeState) so orphans cannot leak
    // between killLang/killAll calls.
    for (const [lang, state] of this.procs) {
      let alive = true;
      try {
        alive = state.proc.exitCode === null;
      } catch {
        alive = false; // exitCode unreadable — treat as dead, prune below.
      }
      if (!alive) {
        this.procs.delete(lang);
        this.clearPreamble(lang);
        void this.closeState(state).catch(() => {});
      }
    }
    return this.procs.size;
  }

  private async execInner(
    lang: Lang,
    code: string,
    cwd: string,
    timeoutMs: number,
    reset: boolean,
  ): Promise<ExecResult> {
    if (code.length > 200_000) {
      return { ok: false, stdout: "", error: "EVAL_ERROR: code too large" };
    }
    let state!: KernelState;
    try {
      if (reset) await this.killLang(lang);
      state = await this.ensureSpawned(lang, cwd);
      // Preamble ordering: the first user cell on a fresh process awaits the
      // preamble's tracked promise (queue + gate guarantee ordering). Only the
      // deferred that belongs to THIS state is awaited, and a timeout marks
      // the preamble skipped so later cells never pay the 15s again.
      for (;;) {
        if (this.procs.get(lang) !== state) {
          state = await this.ensureSpawned(lang, cwd);
        }
        const deferred = this.creationDeferred.get(lang);
        if (deferred === undefined) break;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            deferred.catch(() => {}),
            new Promise<void>((_, reject) => {
              timer = setTimeout(() => reject(new Error("preamble timeout")), 15000);
            }),
          ]);
        } catch {
          if (this.creationDeferred.get(lang) === deferred) this.creationDeferred.delete(lang);
          if (this.procs.get(lang) === state) state.buf = "";
          await this.killLang(lang).catch(() => {});
          this.preambleSkipped.add(lang);
          return { ok: false, stdout: "", error: "EVAL_ERROR: preamble timeout" };
        } finally {
          clearTimeout(timer);
        }
        if (this.procs.get(lang) === state && !this.creationDeferred.has(lang)) break;
        state = await this.ensureSpawned(lang, cwd);
      }
    } catch (err) {
      // Documented posture: spawn-fail mapping → KERNEL_MISSING (never throws).
      if (err instanceof KernelMissing) return { ok: false, stdout: "", error: err.message };
      if (err instanceof Error && err.message.startsWith("EVAL_ERROR")) return { ok: false, stdout: "", error: err.message };
      return { ok: false, stdout: "", error: `EVAL_ERROR: ${lang} spawn failed (${msg80(err)})` };
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const victim = state;
    const timeoutP = new Promise<ExecResult>((resolve) => {
      timer = setTimeout(() => {
        if (this.procs.get(lang) === victim) void this.killLang(lang).catch(() => {});
        resolve({ ok: false, stdout: "", error: "EVAL_TIMEOUT" });
      }, timeoutMs);
    });
    // Error taxonomy (judge-measured): KernelMissing = the driver PROCESS
    // is gone (stdin lost, stdout closed, replaced). EVAL_ERROR = the driver
    // is alive but the CELL failed (bad cwd, malformed envelope, 8MB tripwire).
    // Collapsing EVAL_ERROR into KERNEL_MISSING misroutes callers into
    // runtime-missing telemetry and retries — surface each kind as itself.
    const runP: Promise<ExecResult> = (async () => {
      try {
        return await this.runCell(state, lang, code, cwd);
      } catch (err) {
        if (err instanceof KernelMissing) throw err;
        if (err instanceof Error && err.message.startsWith("EVAL_ERROR")) {
          return { ok: false, stdout: "", error: err.message };
        }
        throw new KernelMissing(`KERNEL_MISSING: ${lang} driver stdin lost (${msg80(err)})`);
      }
    })();
    // If the timer wins, runP rejects late against the killed proc — mark it
    // handled here so it never surfaces as an unhandled rejection.
    runP.then(
      () => {},
      () => {},
    );

    try {
      return await Promise.race([runP, timeoutP]);
    } catch (err) {
      if (err instanceof KernelMissing) {
        await this.closeState(state).catch(() => {});
        if (this.procs.get(lang) === state) {
          this.procs.delete(lang);
          this.clearPreamble(lang);
        }
        return { ok: false, stdout: "", error: err.message };
      }
      return { ok: false, stdout: "", error: `EVAL_ERROR: ${lang} driver exited (${msg80(err)})` };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
  private async ensureSpawned(lang: Lang, cwd: string): Promise<KernelState> {
    const want = path.resolve(cwd);
    try {
      const st = fs.statSync(want);
      if (!st.isDirectory()) throw new Error(`EVAL_ERROR: bad cwd ${want}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("EVAL_ERROR: bad cwd")) throw err;
      throw new Error(`EVAL_ERROR: bad cwd ${want}`);
    }
    const cur = this.procs.get(lang);
    if (cur !== undefined) {
      let alive = false;
      try {
        alive = cur.proc.exitCode === null;
      } catch {
        alive = false;
      }
      if (alive && cur.cwd === want) return cur;
      try {
        await this.closeState(cur);
      } catch {
        // already dead
      }
      if (this.procs.get(lang) === cur) this.procs.delete(lang);
      this.clearPreamble(lang);
    }
    fs.mkdirSync(this.baseDir, { recursive: true });
    const abs = path.join(this.baseDir, DRIVER_FILES[lang]);
    this.writeDriverIdempotent(abs, DRIVER_SOURCES[lang]);
    const bin = lang === "py" ? (this.binOverrides?.py ?? "python3") : (this.binOverrides?.js ?? "bun");
    const baseArgv = lang === "py" ? [bin, "-u", abs] : [bin, abs];
    // SESSION ISOLATION (T3 A1 finding): run the driver in its OWN session
    // (setsid) so its pid is also its process-group id. That makes a
    // group-kill (`kill(-pid)`) target exactly this driver's whole
    // descendant tree ATOMICALLY — the only sweep that cannot lose a race
    // against a payload that keeps forking. Without setsid the driver
    // inherits the plugin's PGID, where group-kill would signal unrelated
    // processes (why the tree walk existed in the first place).
    const setsid = process.platform === "win32" ? null : toolPathStatic("setsid");
    const argv = setsid !== null ? [setsid, ...baseArgv] : baseArgv;
    if (typeof Bun === "undefined" || typeof Bun.spawn !== "function") {
      throw new Error(`EVAL_ERROR: Bun runtime unavailable (cannot spawn ${lang} driver)`);
    }
    let proc: Bun.Subprocess;
    try {
      proc = Bun.spawn(argv, {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "ignore",
        cwd: want,
        env: {
          // Full parent env by contract: drivers need TMPDIR/TZ/SSL/certs,
          // locale, and toolchain tunables; PATH/HOME/LANG/RPC_DIR are
          // pinned AFTER the spread so callers cannot hijack them.
          // Allowlist-adjacent deny: dangerous process-execution tunables
          // are stripped from BOTH the inherited parent env and extraEnv so
          // neither an untrusted caller nor a poisoned parent (LD_PRELOAD,
          // LD_AUDIT, DYLD_*, PYTHON*/RUBYOPT/PERL5OPT/JAVA_TOOL_OPTIONS,
          // NODE_OPTIONS/BUN_*, GIT_EXTERNAL_DIFF) can hijack the driver
          // process. Benign tunables (TMPDIR/TZ/SSL/certs/locale/toolchain)
          // still flow through by contract.
          ...Object.fromEntries(
            Object.entries(process.env).filter(
              ([k]) =>
                !/^(LD_(PRELOAD|LIBRARY_PATH|AUDIT|CONFIG)|DYLD_[A-Z_]+|PYTHON[A-Z_]*|RUBYOPT|PERL5OPT|JAVA_TOOL_OPTIONS|_JAVA_OPTIONS|GIT_EXTERNAL_DIFF|NODE_OPTIONS|BUN_[A-Z_]*|NPM_CONFIG_[A-Z_]*)$/.test(k),
            ),
          ),
          ...Object.fromEntries(
            Object.entries(this.extraEnv ?? {}).filter(
              ([k]) =>
                !/^(LD_(PRELOAD|LIBRARY_PATH|AUDIT|CONFIG)|DYLD_[A-Z_]+|PYTHON[A-Z_]*|RUBYOPT|PERL5OPT|JAVA_TOOL_OPTIONS|_JAVA_OPTIONS|GIT_EXTERNAL_DIFF|NODE_OPTIONS|BUN_[A-Z_]*|NPM_CONFIG_[A-Z_]*)$/.test(k),
            ),
          ),
          PATH: process.env.PATH ?? "/usr/bin:/bin",
          HOME: process.env.HOME ?? "/tmp",
          LANG: process.env.LANG ?? "C",
          OMP_INTEL_RPC_DIR: path.join(this.baseDir, "eval-rpc"),
        },
      });
    } catch (err) {
      throw new KernelMissing(`KERNEL_MISSING: ${lang} runtime not found (${msg80(err)})`);
    }
    const stdout = proc.stdout;
    if (!(stdout instanceof ReadableStream)) {
      try {
        proc.kill();
      } catch {
        // Spawn-shape fault — proc already being discarded.
      }
      throw new KernelMissing(`KERNEL_MISSING: ${lang} runtime not found (no piped stdout)`);
    }
    try {
      proc.unref();
    } catch {
      // unref unsupported — kernels are still reaped deterministically via killAll.
    }
    const state: KernelState = {
      ownSession: setsid !== null,
      driverPath: abs,
      proc,
      reader: stdout.getReader() as ReadableStreamDefaultReader<Uint8Array>,
      decoder: new TextDecoder(),
      buf: "",
      start: "",
      nonce: "",
      cwd: want,
    };
    this.procs.set(lang, state);
    // Preamble (V2 RPC): run the vendor preamble before the FIRST user cell.
    // ensureSpawned is sync (callers depend on it), so this runs as a
    // tracked promise: execInner awaits creationDeferred AFTER acquiring the
    // per-language gate (the queue guarantees no user cell can overtake it).
    // A preamble failure MUST NOT fail spawns — the kernel works without
    // re-entry; warn once. preambleDone enters when the preamble COMPARSES
    // (pass or fail) so a broken preamble never wedges the queue.
    const pre = this.preamble?.[lang];
    if (pre !== undefined && pre.length > 0 && !this.preambleDone.has(lang) && !this.preambleSkipped.has(lang)) {
      const slot: { p: Promise<void> | undefined } = { p: undefined };
      slot.p = (async (): Promise<void> => {
        try {
          const res = await this.runCell(state, lang, pre);
          if (!res.ok) console.warn(`[omp-code-intel] ${lang} preamble failed: ${res.error ?? "unknown"}`);
        } catch (err) {
          state.buf = "";
          console.warn(`[omp-code-intel] ${lang} preamble failed: ${msg80(err)}`);
        } finally {
          if (this.procs.get(lang) === state) this.preambleDone.add(lang);
          if (this.creationDeferred.get(lang) === slot.p) this.creationDeferred.delete(lang);
        }
      })();
      this.creationDeferred.set(lang, slot.p);
    }
    return state;
  }

  private async runCell(state: KernelState, lang: Lang, code: string, cwd?: string): Promise<ExecResult> {
    if (cwd !== undefined) {
      const fix = lang === "py" ? `import os;os.chdir(${JSON.stringify(cwd)})` : `process.chdir(${JSON.stringify(cwd)})`;
      await this.writeRequest(state, lang, fix);
      const innerFix = await this.readEnvelope(state, lang);
      const fixRes = this.parseEnvelope(innerFix, lang, state.nonce);
      if (!fixRes.ok) throw new Error(`EVAL_ERROR: bad cwd ${cwd} (${fixRes.error ?? "chdir failed"})`);
    }
    await this.writeRequest(state, lang, code);
    const inner = await this.readEnvelope(state, lang);
    return this.parseEnvelope(inner, lang, state.nonce);
  }

  private writeDriverIdempotent(abs: string, content: string): void {
    // Idempotent: write ONLY if absent or content differs (sha256 compare).
    // Install is exclusive (O_EXCL tmp + rename): concurrent spawns sharing
    // a baseDir never exec a half-written driver file, and a planted tmp
    // cannot be silently overwritten.
    let same = false;
    try {
      const existing = fs.readFileSync(abs, "utf8");
      same = sha256Hex(existing) === sha256Hex(content);
    } catch {
      same = false; // Absent or unreadable — (re)write below.
    }
    if (same) return;
    const tmp = `${abs}.${randomBytes(8).toString("hex")}.tmp`;
    const fd = fs.openSync(tmp, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o644);
    try {
      fs.writeFileSync(fd, content, "utf8");
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, abs);
  }
  private async writeRequest(state: KernelState, lang: Lang, code: string, timeoutMs?: number): Promise<void> {
    const stdin = state.proc.stdin as unknown as {
      write(chunk: Uint8Array): unknown;
      flush(): unknown;
    } | null;
    if (!stdin || typeof stdin.write !== "function") {
      throw new Error(`${lang} driver stdin unavailable`);
    }
    const nonce = randomBytes(16).toString("hex");
    state.nonce = nonce;
    state.start = `<<<OCI:${nonce}>>>`;
    const rest: Uint8Array = Buffer.from(nonce + " " + Buffer.from(code, "utf8").toString("base64") + "\n");
    let off = 0;
    const CHUNK = 65536;
    const deadline = Date.now() + Math.min(10000, timeoutMs ?? 10000);
    while (off < rest.length) {
      if (this.procs.get(lang) !== state) throw new KernelMissing(`KERNEL_MISSING: ${lang} driver replaced`);
      if (Date.now() > deadline) throw new Error(`${lang} driver stdin backpressure (wrote ${off} of ${rest.length})`);
      const end = Math.min(off + CHUNK, rest.length);
      let n: unknown;
      try {
        n = await stdin.write(rest.subarray(off, end));
      } catch (err) {
        throw new Error(`${lang} driver stdin lost (${msg80(err)})`);
      }
      if (typeof n === "boolean") {
        // Bun FileSink returns a byte count; Node Writable returns a boolean
        // per chunk. Either way the chunk was accepted — advance.
        off = end;
        if (n === false) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 1);
          });
        }
        continue;
      }
      if (n === undefined || n === null) {
        // void/undefined FileSink accept — treat as accepted chunk, yield
        // once so a wedged drain cannot spin.
        off = end;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1);
        });
        continue;
      }
      if (typeof n !== "number" || Number.isNaN(n) || n < 0) {
        throw new Error(`${lang} driver stdin write refused (${off} of ${rest.length})`);
      }
      off += Math.min(n, end - off);
    }
    try {
      if (typeof stdin.flush === "function") await stdin.flush();
    } catch (err) {
      throw new Error(`${lang} driver stdin lost (${msg80(err)})`);
    }
  }

  private async readEnvelope(state: KernelState, lang: Lang): Promise<string> {
    for (;;) {
      if (state.start.length === 0) throw new KernelMissing(`KERNEL_MISSING: ${lang} driver replaced`);
      if (this.procs.get(lang) !== state) throw new KernelMissing(`KERNEL_MISSING: ${lang} driver replaced`);
      const s = state.buf.lastIndexOf(state.start);
      if (s >= 0) {
        const from = s + state.start.length;
        let e = state.buf.indexOf(END, from);
        while (e >= 0) {
          const inner = state.buf.slice(from, e);
          let matched = false;
          try {
            const probe = JSON.parse(inner) as { n?: unknown };
            matched = typeof probe === "object" && probe !== null && probe.n === state.nonce;
          } catch {
            matched = false;
          }
          if (matched) {
            state.buf = state.buf.slice(e + END.length);
            return inner;
          }
          e = state.buf.indexOf(END, e + END.length);
        }
      }
      const next = await state.reader.read();
      if (next.done) {
        if (this.procs.get(lang) === state) this.procs.delete(lang);
        throw new KernelMissing(`KERNEL_MISSING: ${lang} driver closed stdout`);
      }
      state.buf += state.decoder.decode(next.value, { stream: true });
      if (state.buf.length > 2_000_000 && state.start.length > 0) {
        const keep = state.buf.lastIndexOf(state.start);
        if (keep > 0) state.buf = state.buf.slice(keep);
      }
      if (state.buf.length > 8_000_000) {
        state.buf = "";
        void this.closeState(state).catch(() => {});
        if (this.procs.get(lang) === state) {
          this.procs.delete(lang);
          this.clearPreamble(lang);
        }
        throw new Error(`${lang} driver stdout exceeded 8MB without envelope`);
      }
    }
  }

  private parseEnvelope(inner: string, lang: Lang, nonce: string): ExecResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(inner);
    } catch (err) {
      throw new Error(`${lang} driver returned malformed envelope (${msg80(err)})`);
    }
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error(`${lang} driver returned malformed envelope (not an object)`);
    }
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.ok !== "boolean") throw new Error(`${lang} driver returned malformed envelope (ok)`);
    if (rec.n !== nonce) throw new Error(`${lang} driver returned malformed envelope (n)`);
    const stdout = typeof rec.stdout === "string" ? rec.stdout : "";
    const error = typeof rec.error === "string" ? rec.error : undefined;
    if (rec.ok === true) return { ok: true, stdout };
    return { ok: false, stdout, error: error ?? `EVAL_ERROR: ${lang} driver reported failure` };
  }

  private async closeState(state: KernelState): Promise<void> {
    try {
      await state.reader.cancel();
    } catch {
      // Already closed or cancelled — nothing to do.
    }
    const pid = state.proc.pid;
    // T3 A1: multiprocessing.Process children survived proc.kill() on the
    if (typeof pid === "number" && pid > 0) {
      let live = false;
      try {
        live = state.proc.exitCode === null;
      } catch {
        live = false;
      }
      if (live) {
        // Absolute-path reaper: teardown executes ps/pgrep/pkill, so resolve
        // them against FIXED system dirs — never parent-PATH lookup. Missing
        // tool = skip the sweep (kill() below still runs); no bare-name
        // fallback that a poisoned PATH or planted binary could hijack.
        const toolPath = (name: string): string | null => {
          for (const dir of ["/usr/bin", "/bin", "/usr/local/bin"]) {
            try {
              fs.accessSync(`${dir}/${name}`, fs.constants.X_OK);
              return `${dir}/${name}`;
            } catch {
              // try next
            }
          }
          return null;
        };
        const startOf = (p: number): string => {
          const ps = toolPath("ps");
          if (ps === null) return "";
          try {
            const probe = Bun.spawnSync([ps, "-o", "lstart=", "-p", String(p)], { stdout: "pipe", stderr: "ignore" });
            const raw = probe.stdout as unknown;
            return typeof raw === "string" ? raw.trim() : Buffer.from(raw as Uint8Array).toString("utf8").trim();
          } catch {
            return "";
          }
        };
        const killChecked = (p: number): void => {
          const before = startOf(p);
          if (before.length === 0) return;
          try {
            process.kill(p, 0);
          } catch {
            return;
          }
          if (startOf(p) !== before) return;
          try {
            process.kill(p, "SIGKILL");
          } catch {
            // already gone
          }
        };
        // Every target is liveness-checked (kill(pid, 0)) immediately before
        // SIGKILL to avoid recycled PIDs. No process-group kill: Bun.spawn
        // inherits the parent PGID, so kill(-pid) could signal the wrong
        // group. Non-Unix platforms skip the walk — parent SIGKILL below.
        //
        // ATOMIC GROUP KILL first (setsid case): SIGKILL the driver's whole
        // process group in one syscall — descendants cannot out-race it.
        // Only when ownSession is set (pgid == driver pid); otherwise
        // kill(-pid) could signal unrelated processes.
        if (state.ownSession && pgidOf(pid) === pid) {
          // Verified session leader (pgid == pid): the group kill is exact.
          // If setsid forked (caller was already a group leader) or failed,
          // pgid != pid and kill(-pid) would signal an UNRELATED group —
          // skip it and let the tree walk do the work.
          try {
            process.kill(-pid, "SIGKILL");
          } catch {
            // group already empty
          }
        }
        // MULTI-PASS SWEEP (T3 A1 finding, 2026-09-14): one tree walk races a
        // forking payload — children spawned after the walk finish re-parent
        // to init and survive. Repeat the walk until no new descendant appears
        // (bounded 6 passes, 100ms apart) so a fork storm is drained rather
        // than sampled. Every pid is still liveness-checked before SIGKILL.
        if (process.platform !== "win32") {
          try {
            const seenPids = new Set<number>([pid]);
            // Roots for pass 0 = the driver. Later passes re-root at EVERY
            // known-alive pid: once the driver is SIGKILLed its children
            // re-parent to init, so a walk from the (dead) driver pid can no
            // longer reach them — that is exactly how a fork storm leaks a
            // survivor past a single-pass sweep (T3 A1 finding).
            let roots: number[] = [pid];
            for (let pass = 0; pass < 6; pass += 1) {
              let frontier: number[] = roots.length > 0 ? roots : [pid];
              const order: number[][] = [];
              let discovered = 0;
              for (let depth = 0; depth < 16 && frontier.length > 0; depth += 1) {
                const level: number[] = [];
                for (const parent of frontier) {
                  let aliveParent = true;
                  try {
                    process.kill(parent, 0);
                  } catch {
                    aliveParent = false;
                  }
                  if (!aliveParent) continue;
                  try {
                    const pgrep = toolPath("pgrep");
                    if (pgrep === null) break;
                    const lister = Bun.spawnSync([pgrep, "-P", String(parent)], { stdout: "pipe", stderr: "ignore" });
                    const raw = lister.stdout as unknown;
                    const out = typeof raw === "string" ? raw : Buffer.from(raw as Uint8Array).toString("utf8");
                    for (const line of out.split("\n")) {
                      const child = Number(line.trim());
                      if (!Number.isInteger(child) || child <= 0 || seenPids.has(child)) continue;
                      try {
                        process.kill(child, 0);
                      } catch {
                        continue;
                      }
                      seenPids.add(child);
                      level.push(child);
                      discovered += 1;
                    }
                  } catch {
                    // pgrep missing for this parent
                  }
                }
                if (level.length > 0) order.push(level);
                frontier = level;
              }
              for (let i = order.length - 1; i >= 0; i -= 1) {
                for (const child of order[i]) killChecked(child);
              }
              if (discovered === 0 && pass > 0) break;
              await new Promise<void>((resolve) => {
                setTimeout(resolve, 100);
              });
              // Re-root: every seen pid that is still alive becomes a walk
              // root next pass (bounded to the most recent 256).
              const alive: number[] = [];
              for (const p2 of seenPids) {
                try {
                  process.kill(p2, 0);
                  alive.push(p2);
                } catch {
                  // gone
                }
              }
              roots = alive.slice(-256);
            }
          } catch {
            // pgrep missing — parent SIGKILL below still applies
          }
        }
        // IDENTITY SWEEP (T3 A1 finding): forked descendants inherit the
        // driver's argv, so a cmdline match on the driver script's base dir
        // reaches every child — INCLUDING the ones that re-parented to init
        // mid-storm and are therefore unreachable by any parent-walk. Runs
        // after the tree walk; the base dir is unique per intel home, so the
        // pattern cannot match unrelated processes.
        try {
          const pkillF = toolPath("pkill");
          if (pkillF !== null) {
            // Repeat the identity sweep over a bounded window: a forking
            // payload spawns NEW descendants after each pass, so one pass
            // samples the storm instead of draining it. 4 passes / 150ms
            // apart closes the spawn window that a single pass misses; an
            // unbounded forker beyond that window is a documented residual,
            // not a silent claim.
            // Pattern specificity: `pkill -f` treats the argument as ERE and
            // substring-matches the WHOLE cmdline, so a bare baseDir with
            // unescaped dots could SIGKILL unrelated processes. Anchor on the
            // ESCAPED driver script path (unique per home) and require the
            // driver filename, so only this home's drivers can match.
            const identPattern = state.driverPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            for (let sweepPass = 0; sweepPass < 4; sweepPass += 1) {
              const ident = Bun.spawn([pkillF, "-KILL", "-f", identPattern], { stdout: "ignore", stderr: "ignore" });
              try {
                await Promise.race([
                  ident.exited,
                  new Promise<void>((resolve) => {
                    setTimeout(resolve, 1000);
                  }),
                ]);
              } catch {
                // sweep never rejects; belt
              }
              await new Promise<void>((resolve) => {
                setTimeout(resolve, 150);
              });
            }
          }
        } catch {
          // pkill missing — tree walk + parent SIGKILL still apply
        }
        try {
          if (state.proc.exitCode === null) {
            const pkill = toolPath("pkill");
            if (pkill === null) throw new Error("pkill unavailable — parent SIGKILL below still applies");
            const sweep = Bun.spawn([pkill, "-KILL", "-P", String(pid)], { stdout: "ignore", stderr: "ignore" });
            try {
              await Promise.race([
                sweep.exited,
                new Promise<void>((resolve) => {
                  setTimeout(resolve, 1000);
                }),
              ]);
            } catch {
              // sweep never rejects; belt
            }
          }
        } catch {
          // pkill missing or no children
        }
      }
    }
    try {
      state.proc.kill();
    } catch {
      // Already exited — nothing to do.
    }
    // Grace only when the driver is still alive: skip the 500ms sleep when
    // exitCode is already set (teardown/KERNEL_MISSING/prune fast paths).
    if (state.proc.exitCode === null) {
      await Promise.race([
        new Promise<void>((resolve) => {
          setTimeout(resolve, 500);
        }),
      ]);
      try {
        if (state.proc.exitCode === null) state.proc.kill("SIGKILL");
      } catch {
        // exited during grace
      }
    }
    try {
      await Promise.race([
        state.proc.exited,
        new Promise<void>((resolve) => {
          setTimeout(resolve, 2000);
        }),
      ]);
    } catch {
      // never rejects by contract; belt
    }
  }

  private async killLang(lang: Lang): Promise<void> {
    const state = this.procs.get(lang);
    if (state === undefined) return;
    this.procs.delete(lang);
    this.clearPreamble(lang);
    await this.closeState(state);
  }
}
