import { closeSync, constants, fchmodSync, fstatSync, linkSync, lstatSync, mkdirSync, openSync, readSync, readdirSync, realpathSync, rmdirSync, statSync, unlinkSync, watch, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
// src/eval/rpc.ts — eval tool re-entry (V2 W1-B). intel_read / intel_grep
// stubs live INSIDE kernel drivers (see PREAMBLE_* below, injected via the
// kernels preamble hook): they write a JSONL request file and poll for the
// reply. This module serves the other side: watch the dir, dispatch to the
// plugin's own fns, write the reply.
//
// Protocol: <baseDir>/eval-rpc/<id>.req = JSON {id, name, args};
// reply <baseDir>/eval-rpc/<id>.res = JSON {ok, result|error}.
// Stub polls every 5ms, cap 10s → raises/throws RPC_TIMEOUT.
// The stub is synchronous by protocol contract: kernel drivers run one cell
// at a time and the host reply arrives via the eval-rpc dir, so there is no
// async runtime to yield to inside a py/js driver cell. Do not use these
// stubs on latency-sensitive kernels — each intel_read/intel_grep blocks the
// driver until the host replies (≤10s).
// Unknown tool name → {error: "RPC_UNKNOWN_TOOL:<name>"} (named, loud).

export const RPC_DIR = "eval-rpc";
export const RPC_POLL_MS = 5;
export const RPC_TIMEOUT_MS = 10000;

export type RpcDispatch = (name: string, args: Record<string, unknown>) => Promise<unknown>;

export const PREAMBLE_PY = `import os as _os, json as _json, time as _time
def intel_read(path):
    return _intel_call("read", {"path": path})
def intel_grep(pat, path=None):
    return _intel_call("grep", {"pat": pat, "path": path})
def _intel_call(name, args):
    import secrets as _secrets
    rid = _secrets.token_hex(8)
    d = _os.environ.get("MIMO_INTEL_RPC_DIR", "")
    if not d:
        raise RuntimeError("RPC_TIMEOUT")
    # The host may prune the harness dir mid-session (workspace hygiene), so
    # re-create it defensively: a missing dir must not surface as a raw
    # FileNotFoundError out of intel_read (T3 finding) — either the call
    # works or it fails with the NAMED RPC_TIMEOUT below.
    try:
        _os.makedirs(d, exist_ok=True)
    except OSError:
        raise RuntimeError("RPC_TIMEOUT")
    req = _os.path.join(d, rid + ".req")
    res = _os.path.join(d, rid + ".res")
    tmp = req + ".tmp"
    with open(tmp, "w") as f:
        _json.dump({"id": rid, "name": name, "args": args}, f)
    try: _os.unlink(res)
    except OSError: pass
    _os.rename(tmp, req)
    t0 = _time.time()
    while _time.time() - t0 < 10:
        if _os.path.exists(res):
            try:
                with open(res) as f:
                    out = _json.load(f)
            except (OSError, ValueError):
                _time.sleep(0.005)
                continue
            if not isinstance(out, dict) or out.get("id") != rid:
                try: _os.unlink(res)
                except OSError: pass
                _time.sleep(0.005)
                continue
            try: _os.unlink(res)
            except OSError: pass
            if isinstance(out, dict) and out.get("ok") is False and "error" in out:
                raise RuntimeError(out["error"])
            return out.get("result") if isinstance(out, dict) else out
    try: _os.unlink(req)
    except OSError: pass
    raise TimeoutError("RPC_TIMEOUT")
`;

const PREAMBLE_JS_HEAD = `let _fs;
let _path;
let _crypto;
if (typeof require === "function") { _fs = require("node:fs"); _path = require("node:path"); _crypto = require("node:crypto"); }
else if (typeof globalThis.require === "function") { const r = globalThis.require; _fs = r("node:fs"); _path = r("node:path"); _crypto = r("node:crypto"); }
else { throw new Error("RPC_CJS_ONLY"); }`;

export const PREAMBLE_JS = `${PREAMBLE_JS_HEAD}
function intel_read(p) { return _intelCall("read", { path: p }); }
function intel_grep(pat, p) { return _intelCall("grep", { pat: pat, path: p }); }
function _sleepSync(ms) { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (e) { const end = Date.now() + ms; while (Date.now() < end) {} } }
function _intelCall(name, args) {
  // Named refusal instead of a raw TypeError when the driver context lacks the
  // bridge (live finding, v4 row 6).
  if (!_fs || !_path || !_crypto) throw new Error("RPC_CJS_ONLY");
  const rid = _crypto.randomBytes(8).toString("hex");
  const d = process.env.MIMO_INTEL_RPC_DIR || "";
  if (!d) throw new Error("RPC_TIMEOUT");
  // Same defensive mkdir as the py stub: a pruned harness dir must yield the
  // named RPC_TIMEOUT, never a raw fs error.
  try { _fs.mkdirSync(d, { recursive: true }); } catch (e) { throw new Error("RPC_TIMEOUT"); }
  const req = _path.join(d, rid + ".req");
  const res = _path.join(d, rid + ".res");
  const tmp = req + ".tmp";
  _fs.writeFileSync(tmp, JSON.stringify({ id: rid, name: name, args: args }));
  try { _fs.unlinkSync(res); } catch (e) {}
  _fs.renameSync(tmp, req);
  const t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    if (_fs.existsSync(res)) {
      let out;
      try { out = JSON.parse(_fs.readFileSync(res, "utf8")); }
      catch (e) { _sleepSync(5); continue; }
      if (!out || typeof out !== "object" || out.id !== rid) { try { _fs.unlinkSync(res); } catch (e) {} _sleepSync(5); continue; }
      try { _fs.unlinkSync(res); } catch (e) {}
      if (out && typeof out === "object" && out.ok === false && "error" in out) throw new Error(out.error);
      return out && typeof out === "object" ? out.result : out;
    }
    _sleepSync(5);
  }
  try { _fs.unlinkSync(req); } catch (e) {}
  throw new Error("RPC_TIMEOUT");
}
`;

function rpcDir(baseDir: string): string {
  return path.join(baseDir, RPC_DIR);
}

function writeReply(dir: string, id: string, payload: string): void {
  const dest = path.join(dir, `${id}.res`);
  const tmp = `${dest}.${randomBytes(4).toString("hex")}.tmp`;
  const fd = openSync(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    writeFileSync(fd, payload);
  } finally {
    closeSync(fd);
  }
  try {
    linkSync(tmp, dest);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // gone
    }
    if ((err as { code?: string }).code === "EEXIST") {
      // A pre-planted .res wins the link race. Taking it over by stat+unlink
      // is TOCTOU (stat mtime, then unlink can delete a fresh live reply
      // written in between) — so NO takeover, NO unlink. Surface
      // RPC_REPLY_EXISTS loud; every caller already catches it and the stub
      // still times out RPC_TIMEOUT. Stale orphans age out via the poll
      // reaper (mtime grace), never via racy unlink here.
      throw new Error("RPC_REPLY_EXISTS");
    }
    throw err;
  }
  try {
    unlinkSync(tmp);
  } catch {
    // gone
  }
}

type CappedRead = { kind: "ok"; raw: string } | { kind: "nonfile" } | { kind: "oversize" };
function readReqCapped(reqPath: string): CappedRead {
  const fd = openSync(reqPath, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
  try {
    if (!fstatSync(fd).isFile()) return { kind: "nonfile" };
    const buf = Buffer.allocUnsafe(1_000_001);
    let off = 0;
    for (;;) {
      const n = readSync(fd, buf, off, 1_000_001 - off, off);
      if (n === 0) break;
      off += n;
      if (off > 1_000_000) return { kind: "oversize" };
      if (off >= 1_000_001) return { kind: "oversize" };
    }
    return { kind: "ok", raw: buf.subarray(0, off).toString("utf8") };
  } finally {
    closeSync(fd);
  }
}

class RpcDirHijack extends Error {
  constructor() {
    super("RPC_DIR_HIJACK");
    this.name = "RpcDirHijack";
  }
}

export function ensureRpcDir(baseDir: string): string {
  const rawBase = path.resolve(baseDir);
  try {
    const st = lstatSync(rawBase);
    if (!st.isDirectory() || st.isSymbolicLink()) throw new RpcDirHijack();
  } catch (err) {
    if (err instanceof RpcDirHijack) throw err;
    if ((err as { code?: string }).code !== "ENOENT") throw err;
  }
  let canonBase: string;
  try {
    canonBase = realpathSync(rawBase);
  } catch {
    canonBase = rawBase;
  }
  const dir = rpcDir(canonBase);
  // FIX (v4 observability row 3): the BASE may not exist yet on a fresh
  // workspace (`.mimocode/mimo-intel` is created lazily by the first kernel
  // spawn). A leaf-only mkdir throws ENOENT, which the plugin-init catch
  // swallowed silently -> no watcher -> every intel_read returns
  // RPC_TIMEOUT on a brand-new project. Create the base first.
  try {
    mkdirSync(path.dirname(dir), { recursive: true, mode: 0o700 });
  } catch (err) {
    if ((err as { code?: string }).code !== "EEXIST") throw err;
  }
  try {
    mkdirSync(dir, { mode: 0o700 });
  } catch (err) {
    if ((err as { code?: string }).code !== "EEXIST") throw err;
  }
  let st: ReturnType<typeof lstatSync>;
  try {
    st = lstatSync(dir);
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") throw new RpcDirHijack();
    throw err;
  }
  if (!st.isDirectory() || st.isSymbolicLink()) throw new RpcDirHijack();
  let probe: number;
  try {
    probe = openSync(dir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  } catch {
    throw new RpcDirHijack();
  }
  try {
    const fst = fstatSync(probe);
    if (!fst.isDirectory()) throw new RpcDirHijack();
    if (typeof process.getuid === "function" && typeof fst.uid === "number" && fst.uid !== process.getuid()) {
      throw new RpcDirHijack();
    }
    fchmodSync(probe, 0o700);
  } catch (err) {
    if (err instanceof RpcDirHijack) throw err;
    throw new RpcDirHijack();
  } finally {
    closeSync(probe);
  }
  return dir;
}

export function startWatcher(baseDir: string, dispatch: RpcDispatch): () => void {
  const dir = ensureRpcDir(baseDir);
  const seen = new Map<string, number>();
  const inflightFiles = new Set<string>();
  const touchSeen = (file: string): void => {
    seen.delete(file);
    seen.set(file, Date.now());
    if (seen.size > 512) {
      const cutoff = Date.now() - 60000;
      for (const [k, t] of [...seen]) {
        if (seen.size <= 512) break;
        if (inflightFiles.has(k)) continue;
        if (t < cutoff || seen.size > 512) seen.delete(k);
      }
    }
  };
  let stopped = false;
  // Concurrency bound: at most 8 live dispatches plus at most 8 detached
  // late calls. On RPC_TIMEOUT the slot is released promptly and the late
  // call is detached (observed, never awaited) so a hung dispatch cannot
  // brick the watcher; the stub already got its RPC_TIMEOUT reply and any
  // orphan .res ages out by mtime. The detached set is bounded (oldest
  // evicted) so flooding with never-resolving dispatches cannot accumulate
  // unbounded promises/handles — excess late calls are dropped.
  let inflight = 0;
  const detached = new Set<Promise<unknown>>();
  const trackDetached = (call: Promise<unknown>): void => {
    detached.add(call);
    if (detached.size > 8) {
      const oldest = detached.values().next().value as Promise<unknown> | undefined;
      if (oldest !== undefined) detached.delete(oldest);
    }
    void call.then(
      () => {
        detached.delete(call);
      },
      () => {
        detached.delete(call);
      },
    );
  };
  const pending = new Set<Promise<void>>();
  const handle = (file: string): void => {
    if (stopped) return;
    if (!file.endsWith(".req")) return;
    if (file !== path.basename(file)) return;
    if (seen.has(file)) return;
    if (inflight >= 8) return;
    if (detached.size >= 8) {
      // Shed load LOUDLY (judge finding, v4 seal): the old early-return left
      // the .req on disk with no reply, so the caller saw a bare timeout while
      // the file leaked. Refuse by name and unlink instead — the stub raises
      // the token, and the reaper never has to guess.
      const reqPathBusy = path.join(dir, file);
      const idBusy = file.slice(0, -4);
      try {
        writeReply(dir, idBusy, JSON.stringify({ ok: false, id: idBusy, error: "RPC_BUSY" }));
      } catch {
        // reply write failed (planted .res) — the unlink below still clears it
      }
      try {
        unlinkSync(reqPathBusy);
      } catch {
        // gone
      }
      return;
    }
    touchSeen(file);
    const releaseClaim = (): void => {
      seen.delete(file);
    };
    const reqPath = path.join(dir, file);
    const id = file.slice(0, -4);
    // Both stubs mint <token_hex(8)|randomBytes(8)> = exactly 16 hex chars.
    // Bound the gate to that contract: an über-long hex name (10k+.req) can no
    // longer inflate seen/paths or trigger ENAMETOOLONG downstream.
    if (!/^[0-9a-f]{16}$/i.test(id)) {
      try {
        unlinkSync(reqPath);
      } catch {
        // gone or non-file — never recursive
      } finally {
        releaseClaim();
      }
      return;
    }
    try {
      if (lstatSync(reqPath).isSymbolicLink()) {
        unlinkSync(reqPath);
        releaseClaim();
        return;
      }
    } catch {
      releaseClaim();
      return;
    }
    const nack = (tool?: string): void => {
      if (stopped) {
        try {
          unlinkSync(reqPath);
        } catch {
          // gone
        } finally {
          releaseClaim();
        }
        return;
      }
      try {
        const err = tool !== undefined ? `RPC_UNKNOWN_TOOL:${tool}` : "RPC_UNKNOWN_TOOL:malformed";
        try {
          writeReply(dir, id, JSON.stringify({ ok: false, id, error: err }));
        } catch {
          // planted .res (EEXIST) — unlink req anyway, stub still times out loud
        }
      } finally {
        try {
          unlinkSync(reqPath);
        } catch {
          // gone
        } finally {
          releaseClaim();
        }
      }
    };
    let raw: string;
    try {
      const res = readReqCapped(reqPath);
      if (res.kind === "nonfile") {
        try {
          unlinkSync(reqPath);
        } catch (err) {
          if ((err as { code?: string }).code === "EISDIR" || (err as { code?: string }).code === "EPERM") {
            try {
              rmdirSync(reqPath);
            } catch {
              // gone or non-empty
            }
          }
        } finally {
          releaseClaim();
        }
        return;
      }
      if (res.kind === "oversize") {
        try {
          try {
            writeReply(dir, id, JSON.stringify({ ok: false, id, error: "RPC_UNKNOWN_TOOL:oversize" }));
          } catch {
            // planted .res (EEXIST) — unlink req anyway, stub still times out loud
          }
        } finally {
          try {
            unlinkSync(reqPath);
          } catch {
            // gone or non-file — never recursive
          } finally {
            releaseClaim();
          }
        }
        return;
      }
      raw = res.raw;
    } catch (err) {
      if ((err as { code?: string }).code === "ELOOP") {
        try {
          unlinkSync(reqPath);
        } catch {
          // gone
        }
      }
      releaseClaim();
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      nack();
      return;
    }
    if (parsed === null || typeof parsed !== "object") {
      nack();
      return;
    }
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.name !== "string" || rec.name.length === 0) {
      nack();
      return;
    }
    if (typeof rec.id === "string" && rec.id.length > 0 && rec.id !== id) {
      nack();
      return;
    }
    if (rec.name !== "read" && rec.name !== "grep") {
      nack(rec.name);
      return;
    }
    const args = rec.args !== null && typeof rec.args === "object" ? (rec.args as Record<string, unknown>) : {};
    const body = { id, name: rec.name, args };
    touchSeen(file);
    inflightFiles.add(file);
    inflight += 1;
    const writeRes = (payload: string): void => {
      if (stopped) return;
      if (Buffer.byteLength(payload, "utf8") > 1_000_000) {
        writeReply(dir, id, JSON.stringify({ ok: false, id, error: "RPC_UNKNOWN_TOOL:oversize" }));
        return;
      }
      writeReply(dir, id, payload);
    };
    const job = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let outcome: { ok: true; result: unknown } | { ok: false; error: string } | null = null;
      const release = (): void => {
        clearTimeout(timer);
        inflight -= 1;
        inflightFiles.delete(file);
        try {
          unlinkSync(reqPath);
        } catch {
          // already consumed
        }
        seen.delete(file);
      };
      try {
        let call: Promise<unknown>;
        try {
          call = Promise.resolve().then(() => dispatch(body.name, body.args ?? {}));
        } catch (err) {
          call = Promise.reject(err);
        }
        const timeout = new Promise<{ ok: false; error: string }>((resolve) => {
          timer = setTimeout(() => resolve({ ok: false, error: "RPC_TIMEOUT" }), RPC_TIMEOUT_MS);
          try {
            timer.unref();
          } catch {
            // unref unsupported
          }
        });
        outcome = await Promise.race([
          call.then(
            (result) => ({ ok: true as const, result }),
            (err) => ({ ok: false as const, error: err instanceof Error ? err.message : String(err) }),
          ),
          timeout,
        ]);
        const wasTimeout = outcome !== null && outcome.ok === false && outcome.error === "RPC_TIMEOUT";
        if (wasTimeout) {
          try {
            writeRes(JSON.stringify({ ok: false, id, error: "RPC_TIMEOUT" }));
          } catch {
            // reply write failed — stub times out RPC_TIMEOUT
          }
          trackDetached(call);
          return;
        }
      } catch (err) {
        outcome = { ok: false, error: err instanceof Error ? err.message : String(err) };
      } finally {
        release();
      }
      try {
        if (outcome !== null && outcome.ok === true) {
          writeRes(JSON.stringify({ ok: true, id, result: outcome.result }));
        } else {
          writeRes(JSON.stringify({ ok: false, id, error: outcome === null ? "RPC_TIMEOUT" : outcome.error }));
        }
      } catch {
        // reply write failed — stub times out RPC_TIMEOUT
      }
    })();
    pending.add(job);
    void job.catch(() => {}).finally(() => {
      pending.delete(job);
    });
  };
  let watcher: ReturnType<typeof watch> | null = null;
  try {
    watcher = watch(dir, (_event, filename) => {
      if (typeof filename === "string") handle(filename);
    });
    watcher.on("error", () => {
      // overlay/EMFILE — poll interval still serves
    });
    try {
      (watcher as unknown as { unref?: () => void }).unref?.();
    } catch {
      // unref unsupported — stop() still owns the lifecycle
    }
  } catch {
    watcher = null;
  }
  // Fresh-reply guard: release() removes the inflight claim before writeRes(),
  // so the reaper must not delete a reply written within this window — the
  // stub polls every 5ms and consumes it. Older orphans (timed-out stubs,
  // unconsumed late replies) are still reaped by mtime. Handle-first:
  // claim a .req on sight so a co-timed reply never looks orphaned.
  const RES_GRACE_MS = 15000;
  const poll = setInterval(() => {
    try {
      for (const f of readdirSync(dir)) {
        if (f.endsWith(".req")) {
          handle(f);
          continue;
        }
        if (f.endsWith(".res")) {
          const req = `${f.slice(0, -4)}.req`;
          if (inflightFiles.has(req) || seen.has(req)) continue;
          let age = Number.POSITIVE_INFINITY;
          try {
            const st = statSync(path.join(dir, f));
            age = Date.now() - st.mtimeMs;
          } catch {
            age = Number.POSITIVE_INFINITY;
          }
          if (age < RES_GRACE_MS) continue;
          try {
            unlinkSync(path.join(dir, f));
          } catch {
            // gone
          }
          continue;
        }
        handle(f);
      }
    } catch {
      // dir gone
    }
  }, 100);
  try {
    poll.unref();
  } catch {
    // unref unsupported
  }
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".res")) {
        try {
          unlinkSync(path.join(dir, f));
        } catch {
          // gone
        }
      } else handle(f);
    }
  } catch {
    // best-effort
  }
  return () => {
    stopped = true;
    try {
      clearInterval(poll);
    } catch {
      // already cleared
    }
    try {
      watcher?.close();
    } catch {
      // already closed
    }
    void Promise.allSettled([...pending]).catch(() => {});
  };
}

export function requestPath(baseDir: string, id: string): string {
  if (!/^[0-9a-f]+$/i.test(id)) throw new Error("bad rpc id");
  return path.join(rpcDir(baseDir), `${id}.req`);
}

export function rpcEnv(baseDir: string): Record<string, string> {
  return { MIMO_INTEL_RPC_DIR: ensureRpcDir(baseDir) };
}
