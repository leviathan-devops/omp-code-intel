// src/eval/prelude.ts — the two quiet driver sources (WAVE 3, desk W3-B).
// Consumed by kernels.ts (W3-A): written verbatim to driver_py.py /
// driver_js.js, then driven over stdin/stdout (base64 line in, sentinel
// envelope out). Quiet-driver law: neither driver prints anything except the
// result envelope. Exec scopes stay plain persistent objects so W3-C's rpc.ts
// can inject intel_* helpers via a preamble evaluated in the same scope.
export const DRIVER_PY: string = `import sys
import base64
import io
import json
import contextlib

STATE = {"__builtins__": __builtins__}


def _emit(payload):
    try:
        sys.stdout.write("<<<MCI>>>\\n")
        sys.stdout.write(json.dumps(payload, separators=(",", ":")))
        sys.stdout.write("\\n<<<END>>>\\n")
        sys.stdout.flush()
    except BrokenPipeError:
        sys.exit(0)


def main():
    for raw in sys.stdin:
        line = raw.strip()
        if not line:
            continue
        try:
            code = base64.b64decode(line, validate=True).decode("utf-8")
        except Exception:
            _emit({"ok": False, "stdout": "", "error": "BAD_INPUT"})
            continue
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                exec(code, STATE)
        except (KeyboardInterrupt, SystemExit):
            return
        except Exception as e:
            _emit({"ok": False, "stdout": buf.getvalue(), "error": "%s: %s" % (type(e).__name__, e)})
        else:
            _emit({"ok": True, "stdout": buf.getvalue()})


try:
    main()
except (KeyboardInterrupt, SystemExit, BrokenPipeError):
    pass
`;

export const DRIVER_JS: string = `import * as readline from "node:readline";
import * as vm from "node:vm";

// Persistent exec scope: contextified once, reused for every cell. Top-level
// var/function declarations and bare assignments attach to SCOPE; top-level
// let/const persist in the context's global lexical environment, so state
// survives across cells. (W3-C's rpc.ts injects intel_* helpers by running a
// preamble in this same scope, which is why the scope object stays plain.)
const SCOPE = {};
vm.createContext(SCOPE);

// Seed the context with the host console plus a minimal stdlib surface. The
// console object is shared by reference, so the per-cell monkey-patch below
// captures cell output. Seeded names live on SCOPE and survive across cells.
SCOPE.console = console;
SCOPE.Buffer = Buffer;
SCOPE.setTimeout = setTimeout;
SCOPE.clearTimeout = clearTimeout;
SCOPE.setInterval = setInterval;
SCOPE.clearInterval = clearInterval;
SCOPE.queueMicrotask = queueMicrotask;
SCOPE.process = process;

function fmt(value) {
  if (typeof value === "string") return value;
  try {
    const j = JSON.stringify(value);
    return j === undefined ? String(value) : j;
  } catch (e) {
    return String(value);
  }
}

function errStr(e) {
  try {
    if (e !== null && (typeof e === "object" || typeof e === "function")) {
      const name = e.name ? String(e.name) : "Error";
      const msg = e.message !== undefined && e.message !== null ? String(e.message) : "";
      return msg ? name + ": " + msg : name;
    }
    return String(e);
  } catch (x) {
    return "UnknownError";
  }
}

function emit(obj) {
  process.stdout.write("<<<MCI>>>\\n" + JSON.stringify(obj) + "\\n<<<END>>>\\n");
}

function isB64(text) {
  if (text.length === 0 || text.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]*={0,2}$/.test(text);
}

async function runCell(line) {
  const text = line.trim();
  if (!text) return;
  if (!isB64(text)) {
    emit({ ok: false, stdout: "", error: "BAD_INPUT" });
    return;
  }
  let code;
  try {
    code = Buffer.from(text, "base64").toString("utf8");
  } catch (e) {
    emit({ ok: false, stdout: "", error: "BAD_INPUT" });
    return;
  }
  const captured = [];
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  const hook = (...args) => {
    captured.push(args.map(fmt).join(" "));
  };
  console.log = hook;
  console.warn = hook;
  console.error = hook;
  try {
    let result = vm.runInContext(code, SCOPE, { filename: "cell.js" });
    if (result !== null && (typeof result === "object" || typeof result === "function") && typeof result.then === "function") {
      result = await result;
    }
    emit({ ok: true, stdout: captured.length > 0 ? captured.join("\\n") + "\\n" : "" });
  } catch (e) {
    emit({ ok: false, stdout: captured.length > 0 ? captured.join("\\n") + "\\n" : "", error: errStr(e) });
  } finally {
    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let chain = Promise.resolve();
rl.on("line", (line) => {
  chain = chain.then(() => runCell(line)).catch((e) => {
    try {
      emit({ ok: false, stdout: "", error: "DRIVER_ERROR: " + errStr(e) });
    } catch (x) {
      process.exit(1);
    }
  });
});
rl.on("close", () => {
  process.exit(0);
});
`;
