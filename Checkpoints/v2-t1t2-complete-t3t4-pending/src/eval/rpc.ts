import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, watch, writeFileSync } from "node:fs";
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
// Unknown tool name → {error: "RPC_UNKNOWN_TOOL:<name>"} (named, loud).

export const RPC_DIR = "eval-rpc";
export const RPC_POLL_MS = 5;
export const RPC_TIMEOUT_MS = 10000;

export type RpcDispatch = (name: string, args: Record<string, unknown>) => Promise<unknown>;

export const PREAMBLE_PY = `import sys as _sys, os as _os, json as _json, time as _time, base64 as _b64_unused
def intel_read(path):
    return _intel_call("read", {"path": path})
def intel_grep(pat, path=None):
    return _intel_call("grep", {"pat": pat, "path": path})
def _intel_call(name, args):
    import random as _r
    rid = "%08x" % _r.getrandbits(32)
    d = _os.environ.get("OMP_INTEL_RPC_DIR", "")
    req = _os.path.join(d, rid + ".req")
    res = _os.path.join(d, rid + ".res")
    with open(req, "w") as f:
        _json.dump({"id": rid, "name": name, "args": args}, f)
    t0 = _time.time()
    while _time.time() - t0 < 10:
        if _os.path.exists(res):
            try:
                with open(res) as f:
                    out = _json.load(f)
            finally:
                try: _os.unlink(res)
                except OSError: pass
            if isinstance(out, dict) and "error" in out:
                raise RuntimeError(out["error"])
            return out.get("result") if isinstance(out, dict) else out
        _time.sleep(0.005)
    try: _os.unlink(req)
    except OSError: pass
    raise TimeoutError("RPC_TIMEOUT")
`;

export const PREAMBLE_JS = `const _fs = require("node:fs");
const _path = require("node:path");
function intel_read(p) { return _intelCall("read", { path: p }); }
function intel_grep(pat, p) { return _intelCall("grep", { pat: pat, path: p }); }
function _intelCall(name, args) {
  const rid = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  const d = process.env.OMP_INTEL_RPC_DIR || "";
  const req = _path.join(d, rid + ".req");
  const res = _path.join(d, rid + ".res");
  _fs.writeFileSync(req, JSON.stringify({ id: rid, name: name, args: args }));
  const t0 = Date.now();
  while (Date.now() - t0 < 10000) {
    if (_fs.existsSync(res)) {
      let out;
      try { out = JSON.parse(_fs.readFileSync(res, "utf8")); }
      finally { try { _fs.unlinkSync(res); } catch (e) { if (!e || e.code !== "ENOENT") throw e; } }
      if (out && typeof out === "object" && "error" in out) throw new Error(out.error);
      return out && typeof out === "object" ? out.result : out;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
  }
  try { _fs.unlinkSync(req); } catch (e) { if (!e || e.code !== "ENOENT") throw e; }
  throw new Error("RPC_TIMEOUT");
}
`;

function rpcDir(baseDir: string): string {
  return path.join(baseDir, RPC_DIR);
}

export function ensureRpcDir(baseDir: string): string {
  const dir = rpcDir(baseDir);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function startWatcher(baseDir: string, dispatch: RpcDispatch): () => void {
  const dir = ensureRpcDir(baseDir);
  const seen = new Set<string>();
  const handle = (file: string): void => {
    if (!file.endsWith(".req")) return;
    if (seen.has(file)) return;
    seen.add(file);
    const reqPath = path.join(dir, file);
    const id = file.slice(0, -4);
    let body: { id: string; name: string; args: Record<string, unknown> };
    try {
      body = JSON.parse(readFileSync(reqPath, "utf8"));
    } catch {
      return; // partial write — the stub retries on its poll loop
    }
    void (async () => {
      try {
        const result = await dispatch(body.name, body.args ?? {});
        writeFileSync(path.join(dir, `${id}.res`), JSON.stringify({ ok: true, result }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        writeFileSync(path.join(dir, `${id}.res`), JSON.stringify({ ok: false, error: msg }));
      } finally {
        try {
          unlinkSync(reqPath);
        } catch {
          // already consumed
        }
      }
    })();
  };
  let watcher: ReturnType<typeof watch> | null = null;
  try {
    watcher = watch(dir, (_event, filename) => {
      if (typeof filename === "string") handle(filename);
    });
    // Unref so the watcher never holds the process open on its own: the
    // session.post stop is the lifecycle owner, and scripts/tests that
    // import the plugin must still be able to exit.
    try {
      (watcher as unknown as { unref?: () => void }).unref?.();
    } catch {
      // unref unsupported — stop() still owns the lifecycle
    }
  } catch {
    watcher = null;
  }
  // Sweep once at start for req files that landed before the watch attached.
  try {
    for (const f of readdirSync(dir)) handle(f);
  } catch {
    // best-effort
  }
  return () => {
    try {
      watcher?.close();
    } catch {
      // already closed
    }
  };
}

export function requestPath(baseDir: string, id: string): string {
  return path.join(rpcDir(baseDir), `${id}.req`);
}

export function newRequestId(): string {
  return randomBytes(4).toString("hex");
}

export function rpcEnv(baseDir: string): Record<string, string> {
  return { OMP_INTEL_RPC_DIR: ensureRpcDir(baseDir) };
}
