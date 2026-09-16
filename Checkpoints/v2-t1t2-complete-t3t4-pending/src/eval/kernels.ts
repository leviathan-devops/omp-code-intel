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

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DRIVER_PY, DRIVER_JS } from "./prelude";

export type Lang = "py" | "js";
export interface ExecResult { ok: boolean; stdout: string; error?: string }

const START = "<<<OCI>>>";
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
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function msg80(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  return m.slice(0, 80);
}

export class KernelManager {
  private readonly procs = new Map<Lang, KernelState>();
  private readonly gates = new Map<Lang, Promise<void>>();
  private readonly preambleDone = new Set<Lang>();
  private readonly creationDeferred = new Map<Lang, Promise<void>>();

  constructor(
    private readonly baseDir: string,
    private readonly binOverrides?: { py?: string; js?: string },
    private readonly preamble?: Partial<Record<Lang, string>>,
    private readonly extraEnv?: Record<string, string>,
  ) {}

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
      return await this.execInner(lang, code, cwd, timeoutMs, reset);
    } finally {
      release();
    }
  }

  async killAll(): Promise<void> {
    // Never throws: every per-proc teardown is individually guarded, and the
    // whole sweep is guarded once more for absolute certainty.
    try {
      const states = [...this.procs.values()];
      this.procs.clear();
      await Promise.allSettled(states.map((s) => this.closeState(s)));
    } catch {
      // killAll is fire-and-forget from session.post — swallowing is the contract.
    }
  }

  liveCount(): number {
    // Reflect reality, not the map: prune drivers that already exited.
    for (const [lang, state] of this.procs) {
      let alive = true;
      try {
        alive = state.proc.exitCode === null;
      } catch {
        alive = false; // exitCode unreadable — treat as dead, prune below.
      }
      if (!alive) this.procs.delete(lang);
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
    let state: KernelState;
    try {
      if (reset) await this.killLang(lang);
      state = this.ensureSpawned(lang, cwd);
      // Preamble ordering: the first user cell on a fresh process awaits the
      // preamble's tracked promise (queue + gate guarantee ordering).
      const deferred = this.creationDeferred.get(lang);
      if (deferred !== undefined) {
        this.creationDeferred.delete(lang);
        try {
          await deferred;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          // preambleDone is set in its finally — proceed regardless.
        }
      }
    } catch (err) {
      // Documented posture: spawn-fail mapping → KERNEL_MISSING (never throws).
      if (err instanceof KernelMissing) return { ok: false, stdout: "", error: err.message };
      return { ok: false, stdout: "", error: `EVAL_ERROR: ${lang} spawn failed (${msg80(err)})` };
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutP = new Promise<ExecResult>((resolve) => {
      timer = setTimeout(() => {
        // Documented posture: timeout kill — THAT driver dies (state lost),
        // guarded delete so a newer respawn is never reaped by a stale timer.
        void this.closeState(state).catch(() => {
          // closeState is fully guarded; this is belt-and-braces only.
        });
        if (this.procs.get(lang) === state) this.procs.delete(lang);
        resolve({ ok: false, stdout: "", error: "EVAL_TIMEOUT" });
      }, timeoutMs);
    });

    const runP: Promise<ExecResult> = (async () => {
      this.writeRequest(state, lang, code);
      const inner = await this.readEnvelope(state, lang);
      return this.parseEnvelope(inner, lang);
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
      // Documented posture: loud fail — the driver died mid-exec (closed
      // stdout, EPIPE on stdin, malformed envelope). Drop it, name it.
      try {
        state.proc.kill();
      } catch {
        // Already dead — nothing to do.
      }
      if (this.procs.get(lang) === state) this.procs.delete(lang);
      return { ok: false, stdout: "", error: `EVAL_ERROR: ${lang} driver exited (${msg80(err)})` };
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private ensureSpawned(lang: Lang, cwd: string): KernelState {
    const cur = this.procs.get(lang);
    if (cur !== undefined) {
      let alive = false;
      try {
        alive = cur.proc.exitCode === null;
      } catch {
        alive = false; // exitCode unreadable — respawn below.
      }
      if (alive) return cur;
      // Dead entry: best-effort teardown (never throws — killLang is guarded).
      void this.killLang(lang).catch(() => {
        // killLang is fully guarded; belt-and-braces only.
      });
      this.procs.delete(lang);
    }
    // mkdir -p baseDir on first spawn; driver files idempotent (hash compare).
    fs.mkdirSync(this.baseDir, { recursive: true });
    const abs = path.join(this.baseDir, DRIVER_FILES[lang]);
    this.writeDriverIdempotent(abs, DRIVER_SOURCES[lang]);
    const bin = lang === "py" ? (this.binOverrides?.py ?? "python3") : (this.binOverrides?.js ?? "bun");
    const argv = lang === "py" ? [bin, "-u", abs] : [bin, abs];
    let proc: Bun.Subprocess;
    try {
      proc = Bun.spawn(argv, {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        cwd,
        env: { ...process.env, ...(this.extraEnv ?? {}) },
      });
    } catch (err) {
      // Documented posture: spawn-fail mapping (ENOENT etc.) → KERNEL_MISSING.
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
      proc,
      reader: stdout.getReader() as ReadableStreamDefaultReader<Uint8Array>,
      decoder: new TextDecoder(),
      buf: "",
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
    if (pre !== undefined && pre.length > 0 && !this.preambleDone.has(lang)) {
      const p = (async (): Promise<void> => {
        try {
          const res = await this.runCell(state, lang, pre);
          if (!res.ok) console.warn(`[omp-code-intel] ${lang} preamble failed: ${res.error ?? "unknown"}`);
        } catch (err) {
          console.warn(`[omp-code-intel] ${lang} preamble failed: ${msg80(err)}`);
        } finally {
          this.preambleDone.add(lang);
        }
      })();
      this.creationDeferred.set(lang, p);
    }
    return state;
  }

  private async runCell(state: KernelState, lang: Lang, code: string): Promise<ExecResult> {
    this.writeRequest(state, lang, code);
    const inner = await this.readEnvelope(state, lang);
    return this.parseEnvelope(inner, lang);
  }

  private writeDriverIdempotent(abs: string, content: string): void {
    // Idempotent: write ONLY if absent or content differs (sha256 compare) —
    // never clobber a driver file mid-flight when it already matches.
    let same = false;
    try {
      const existing = fs.readFileSync(abs, "utf8");
      same = sha256Hex(existing) === sha256Hex(content);
    } catch {
      same = false; // Absent or unreadable — (re)write below.
    }
    if (!same) fs.writeFileSync(abs, content, "utf8");
  }

  private writeRequest(state: KernelState, lang: Lang, code: string): void {
    const stdin = state.proc.stdin as unknown as {
      write(chunk: string): number;
      flush(): void;
    } | null;
    if (stdin === null || typeof stdin === "number" || typeof stdin.write !== "function") {
      throw new Error(`${lang} driver stdin unavailable`);
    }
    stdin.write(Buffer.from(code, "utf8").toString("base64") + "\n");
    if (typeof stdin.flush === "function") stdin.flush();
  }

  private async readEnvelope(state: KernelState, lang: Lang): Promise<string> {
    // Markers are located by search, never by line position — blank lines and
    // stray whitespace are tolerated. Chunk-split markers are safe because the
    // search runs on the accumulated buffer. Per-state TextDecoder (streaming)
    // keeps split multi-byte sequences intact.
    for (;;) {
      const s = state.buf.indexOf(START);
      if (s >= 0) {
        const e = state.buf.indexOf(END, s + START.length);
        if (e >= 0) {
          const inner = state.buf.slice(s + START.length, e);
          state.buf = state.buf.slice(e + END.length);
          return inner;
        }
      }
      const next = await state.reader.read();
      if (next.done) throw new Error(`${lang} driver closed stdout`);
      state.buf += state.decoder.decode(next.value, { stream: true });
    }
  }

  private parseEnvelope(inner: string, lang: Lang): ExecResult {
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
    try {
      state.proc.kill();
    } catch {
      // Already exited — nothing to do.
    }
  }

  private async killLang(lang: Lang): Promise<void> {
    const state = this.procs.get(lang);
    if (state === undefined) return;
    this.procs.delete(lang);
    await this.closeState(state);
  }
}
