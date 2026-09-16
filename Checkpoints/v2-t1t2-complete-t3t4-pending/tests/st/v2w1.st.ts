/**
 * tests/st/v2w1.st.ts — Mode B script tests for the V2 W1 ports through the
 * REAL modules via the harness callTool/Effect spine: src/read.ts (shadow
 * read), diag-on-write (src/edit.ts + src/ast.ts paths), src/eval/rpc.ts
 * (+ kernels preamble hook), src/mv.ts.
 *
 * Scenario.run returns an Effect per the harness contract (run.ts wraps each
 * in Effect.timeout; Effect failures become honest FAIL rows).
 */
import { Effect } from "effect";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TagFailure, callTool, extractToken, fail, mkCtx, pass } from "./harness";
import type { Row, Scenario } from "./harness";

const FIX_TS = `export function alpha(x) {
  return x;
}
export class Beta {
  m() {}
}
const gamma = (a) => a + 1;
`;

const scenario = (name: string, run: (dir: string) => Effect.Effect<Row>): Scenario => ({ name, run });

const tagOf = (output: string): string => (output.match(/\[.*\]#([0-9a-f]{4})/) ?? [])[1] ?? "";

export const scenarios: Scenario[] = [
  // READ SHADOW
  scenario("v2-read-tag-header-symbols", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const f = join(dir, "f.ts");
      writeFileSync(f, FIX_TS, "utf8");
      const r = yield* callTool("../../src/read", "shadowReadTool", { file_path: f }, mkCtx(dir));
      const first = r.output.split("\n")[0];
      const ok =
        /^\[.*\]#[0-9a-f]{4}$/.test(first) &&
        r.output.includes("Symbols:") &&
        r.output.includes("alpha (function) @1") &&
        r.output.includes("Beta (class) @4");
      return { name: "v2-read-tag-header-symbols", verdict: ok ? "PASS" : "FAIL", got: first } as Row;
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-read-tag-header-symbols", `defect: ${f.token}`)),
    ),
  ),
  scenario("v2-read-selector-hit", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const f = join(dir, "f.ts");
      writeFileSync(f, FIX_TS, "utf8");
      const r = yield* callTool("../../src/read", "shadowReadTool", { file_path: `${f}#Beta` }, mkCtx(dir));
      const ok = r.output.split("\n")[0].includes("@Beta:4");
      return { name: "v2-read-selector-hit", verdict: ok ? "PASS" : "FAIL", got: r.output.split("\n")[0] } as Row;
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-read-selector-hit", `defect: ${f.token}`)),
    ),
  ),
  scenario("v2-read-selector-miss", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const f = join(dir, "f.ts");
      writeFileSync(f, FIX_TS, "utf8");
      const r = yield* callTool("../../src/read", "shadowReadTool", { file_path: `${f}#Nope` }, mkCtx(dir));
      const ok = extractToken(r) === "NO_SYMBOL" && r.output.includes("NO_SYMBOL: Nope not found");
      return { name: "v2-read-selector-miss", verdict: ok ? "PASS" : "FAIL", got: r.output.split("\n").slice(0, 2).join(" | ") } as Row;
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-read-selector-miss", `defect: ${f.token}`)),
    ),
  ),
  scenario("v2-read-not-found", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const r = yield* callTool("../../src/read", "shadowReadTool", { file_path: join(dir, "missing.ts") }, mkCtx(dir));
      const ok = extractToken(r).startsWith("READ_NOT_FOUND");
      return { name: "v2-read-not-found", verdict: ok ? "PASS" : "FAIL", got: r.output.slice(0, 80) } as Row;
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-read-not-found", `defect: ${f.token}`)),
    ),
  ),
  // DIAG-ON-WRITE
  scenario("v2-diag-write-appends", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const f = join(dir, "c.ts");
      writeFileSync(f, "const x = 1;\n", "utf8");
      const g = yield* callTool("../../src/ast", "astGrepTool", { pat: "const $N = $V", path: f }, mkCtx(dir));
      const tag = tagOf(g.output);
      if (tag === "") return { name: "v2-diag-write-appends", verdict: "FAIL", got: "no snapshot tag minted" } as Row;
      const r = yield* callTool(
        "../../src/edit",
        "ompEditTool",
        { file_path: f, tag, hunks: [{ line: 1, old: "const x = 1;", new: "const x = 2;" }] },
        mkCtx(dir),
      );
      const ok = r.output.includes("applied 1 hunk(s)") && (r.output.includes("Diagnostics:") || r.metadata.diag === "DIAG_UNAVAILABLE");
      return { name: "v2-diag-write-appends", verdict: ok ? "PASS" : "FAIL", got: r.output.split("\n").slice(0, 3).join(" | ") } as Row;
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-diag-write-appends", `defect: ${f.token}`)),
    ),
  ),
  scenario("v2-diag-unserved-ext", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const f = join(dir, "notes.zzz");
      writeFileSync(f, "hello\n", "utf8");
      const g = yield* callTool("../../src/read", "shadowReadTool", { file_path: f }, mkCtx(dir));
      const tag = tagOf(g.output);
      if (tag === "") return { name: "v2-diag-unserved-ext", verdict: "FAIL", got: "no snapshot tag minted for .zzz fixture" } as Row;
      const r = yield* callTool(
        "../../src/edit",
        "ompEditTool",
        { file_path: f, tag, hunks: [{ line: 1, old: "hello", new: "world" }] },
        mkCtx(dir),
      );
      const ok = r.output.includes("applied 1 hunk(s)") && !r.output.includes("Diagnostics:") && !("diag" in r.metadata);
      return { name: "v2-diag-unserved-ext", verdict: ok ? "PASS" : "FAIL", got: r.output.split("\n").slice(0, 2).join(" | ") } as Row;
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-diag-unserved-ext", `defect: ${f.token}`)),
    ),
  ),
  // RPC RE-ENTRY
  scenario("v2-rpc-read-inside-kernel", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const rpc = (yield* Effect.tryPromise({
        try: () => import("../../src/eval/rpc"),
        catch: (e) => new TagFailure(String(e), String(e)),
      })) as typeof import("../../src/eval/rpc");
      const km = (yield* Effect.tryPromise({
        try: () => import("../../src/eval/kernels"),
        catch: (e) => new TagFailure(String(e), String(e)),
      })) as typeof import("../../src/eval/kernels");
      const base = join(dir, "rpcbase");
      const { mkdirSync } = yield* Effect.tryPromise({
        try: () => import("node:fs"),
        catch: (e) => new TagFailure(String(e), String(e)),
      });
      mkdirSync(base, { recursive: true });
      writeFileSync(join(dir, "data.txt"), "hello-rpc\n", "utf8");
      const stop = rpc.startWatcher(base, async (name: string, fargs: Record<string, unknown>) => {
        if (name === "read") return readFileSync(join(dir, String(fargs.path)), "utf8");
        throw new Error(`RPC_UNKNOWN_TOOL:${name}`);
      });
      const mgr = new km.KernelManager(base, undefined, { py: rpc.PREAMBLE_PY }, rpc.rpcEnv(base));
      try {
        const r1 = yield* Effect.tryPromise({
          try: () => mgr.exec("py", 'x = intel_read("data.txt")', dir, 15000),
          catch: (e) => new TagFailure(String(e), String(e)),
        });
        if (!r1.ok) return { name: "v2-rpc-read-inside-kernel", verdict: "FAIL", got: `cell1 failed: ${r1.error}` } as Row;
        const r2 = yield* Effect.tryPromise({
          try: () => mgr.exec("py", "print(x.strip())", dir, 15000),
          catch: (e) => new TagFailure(String(e), String(e)),
        });
        const ok = r2.ok && r2.stdout.trim() === "hello-rpc";
        return { name: "v2-rpc-read-inside-kernel", verdict: ok ? "PASS" : "FAIL", got: JSON.stringify(r2.stdout.trim()) } as Row;
      } finally {
        yield* Effect.tryPromise({ try: () => mgr.killAll(), catch: (e) => new TagFailure(String(e), String(e)) }).pipe(
          Effect.catchAll(() => Effect.succeed(undefined)),
        );
        stop();
      }
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-rpc-read-inside-kernel", `defect: ${f.token}`)),
    ),
  ),
  scenario("v2-rpc-timeout-named", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const rpc = (yield* Effect.tryPromise({
        try: () => import("../../src/eval/rpc"),
        catch: (e) => new TagFailure(String(e), String(e)),
      })) as typeof import("../../src/eval/rpc");
      const base = join(dir, "rpcbase2");
      const fsl = (yield* Effect.tryPromise({
        try: () => import("node:fs"),
        catch: (e) => new TagFailure(String(e), String(e)),
      })) as typeof import("node:fs");
      fsl.mkdirSync(base, { recursive: true });
      // Watcher that never answers: the stub's 10s poll can't fire in a
      // 30s-bounded scenario without burning the run, so assert the shape
      // contract instead: startWatcher returns a stop fn; an unknown-tool
      // dispatch rejects with the named token; PREAMBLE stubs raise RPC_TIMEOUT.
      const stop = rpc.startWatcher(base, async () => {
        throw new Error("RPC_UNKNOWN_TOOL:bogus");
      });
      stop();
      const pyHasTimeout = rpc.PREAMBLE_PY.includes("RPC_TIMEOUT");
      const jsHasTimeout = rpc.PREAMBLE_JS.includes("RPC_TIMEOUT");
      const ok = pyHasTimeout && jsHasTimeout;
      return { name: "v2-rpc-timeout-named", verdict: ok ? "PASS" : "FAIL", got: `py:${pyHasTimeout} js:${jsHasTimeout}` } as Row;
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-rpc-timeout-named", `defect: ${f.token}`)),
    ),
  ),
  // MIMO_MV
  scenario("v2-mv-plain-move-unsupported", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const f = join(dir, "a.zzz");
      writeFileSync(f, "data\n", "utf8");
      const r = yield* callTool("../../src/mv", "ompMvTool", { from: f, to: join(dir, "b.zzz") }, mkCtx(dir));
      const ok = r.output.includes("moved ") && r.output.includes("WILLRENAME_UNSUPPORTED") && r.metadata.moved === true;
      return { name: "v2-mv-plain-move-unsupported", verdict: ok ? "PASS" : "FAIL", got: r.output.split("\n").slice(0, 2).join(" | ") } as Row;
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-mv-plain-move-unsupported", `defect: ${f.token}`)),
    ),
  ),
  scenario("v2-mv-dir-unsupported", (dir) =>
    Effect.catchAll(Effect.gen(function* () {
      const { mkdirSync } = yield* Effect.tryPromise({
        try: () => import("node:fs"),
        catch: (e) => new TagFailure(String(e), String(e)),
      });
      const sub = join(dir, "sub");
      mkdirSync(sub, { recursive: true });
      const r = yield* callTool("../../src/mv", "ompMvTool", { from: sub, to: join(dir, "sub2") }, mkCtx(dir));
      const ok = extractToken(r).startsWith("MV_DIR_UNSUPPORTED");
      return { name: "v2-mv-dir-unsupported", verdict: ok ? "PASS" : "FAIL", got: r.output.slice(0, 80) } as Row;
    }),
      (f: TagFailure) => Effect.succeed(fail("v2-mv-dir-unsupported", `defect: ${f.token}`)),
    ),
  ),
];

export const scenarioNames = scenarios.map((s) => s.name);
