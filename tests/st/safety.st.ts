/**
 * tests/st/safety.st.ts — V2 T2 battery: destructive-safety (sha-diff),
 * malformed-input, concurrency, hygiene, and soak families through the REAL
 * modules. Mode B: observation channels are disk bytes + returned
 * output/metadata + process counts ONLY.
 *
 * safetyProbe(name, attack, protected): snapshot sha256 of every protected
 * path → fire the attack → settle (kill grace 6s where procs involved) →
 * sha-compare. PASS iff snapshot == after AND the named token rendered.
 * A rejection without a sha proof is not a safety proof.
 */
import { Effect } from "effect";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { callTool, extractToken, fail, mkCtx, pass, type Row, type Scenario } from "./harness";

void tmpdir;

const shaFile = (abs: string): string => {
  try {
    return createHash("sha256").update(readFileSync(abs)).digest("hex");
  } catch {
    return `MISSING:${abs}`;
  }
};

const shaTree = (dir: string): string => {
  const h = createHash("sha256");
  const walk = (d: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(d).sort();
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e);
      try {
        if (statSync(p).isDirectory()) walk(p);
        else h.update(e + ":" + shaFile(p));
      } catch {
        h.update(e + ":ERR");
      }
    }
  };
  walk(dir);
  return h.digest("hex");
};

const define = (name: string, body: (dir: string) => Effect.Effect<Row, any>): Scenario => ({
  name,
  run: (dir) =>
    Effect.catchAll(body(dir), (f: unknown) =>
      Effect.succeed(
        fail(name, typeof f === "object" && f !== null && "token" in f ? String((f as { token: unknown }).token) : String(f)),
      ),
    ),
});

const tagOf = (output: string): string => (output.match(/\[.*\]#([0-9a-f]{4})/) ?? [])[1] ?? "";

const scStaleTagShaEq: Scenario = define("safety-destructive-stale-tag", (dir) =>
  Effect.gen(function* () {
    const f = join(dir, "f.ts");
    writeFileSync(f, "const x = 1;\n", "utf8");
    const g = yield* callTool("../../src/ast", "astGrepTool", { pat: "const $N = $V", path: f }, mkCtx(dir));
    const tag = tagOf(g.output);
    if (tag === "") return fail("safety-destructive-stale-tag", "no snapshot tag minted");
    const before = shaFile(f);
    const r = yield* callTool(
      "../../src/edit",
      "ompEditTool",
      { file_path: f, tag: "ffff", hunks: [{ line: 1, old: "const x = 1;", new: "const x = 2;" }] },
      mkCtx(dir),
    );
    const ok = extractToken(r) === "STALE_ANCHOR" && shaFile(f) === before;
    return ok
      ? pass("safety-destructive-stale-tag", `STALE_ANCHOR + shaEq ${before.slice(0, 8)}`)
      : fail("safety-destructive-stale-tag", `token=${extractToken(r)} shaEq=${shaFile(f) === before}`);
  }),
);

const scReadonlyFile: Scenario = define("safety-destructive-readonly-file", (dir) =>
  Effect.gen(function* () {
    const f = join(dir, "ro.ts");
    writeFileSync(f, "const x = 1;\n", "utf8");
    const g = yield* callTool("../../src/ast", "astGrepTool", { pat: "const $N = $V", path: f }, mkCtx(dir));
    const tag = tagOf(g.output);
    if (tag === "") return fail("safety-destructive-readonly-file", "no snapshot tag minted");
    chmodSync(f, 0o444);
    const before = shaFile(f);
    const r = yield* callTool(
      "../../src/edit",
      "ompEditTool",
      { file_path: f, tag, hunks: [{ line: 1, old: "const x = 1;", new: "const x = 2;" }] },
      mkCtx(dir),
    );
    chmodSync(f, 0o644);
    const after = shaFile(f);
    // The tool must respect the read-only bit explicitly (the atomic
    // tmp+rename would otherwise bypass it — directory write suffices).
    // Named READ_ONLY_FILE + bytes intact is the only pass.
    const token = extractToken(r);
    const ok = token === "READ_ONLY_FILE" && after === before;
    return ok
      ? pass("safety-destructive-readonly-file", `READ_ONLY_FILE + shaEq ${after.slice(0, 8)}`)
      : fail("safety-destructive-readonly-file", `token=${token} shaEq=${after === before} out=${r.output.slice(0, 120)}`);
  }),
);

const scStaleResolve: Scenario = define("safety-destructive-stale-resolve", (dir) =>
  Effect.gen(function* () {
    const f = join(dir, "r.ts");
    writeFileSync(f, "console.log(1);\n", "utf8");
    const ctx = mkCtx(dir);
    const e = yield* callTool("../../src/ast", "astEditTool", { ops: [{ pat: "console.log($$$)", out: "logger.debug($$$)" }], paths: [f] }, ctx);
    if (!e.output.startsWith("proposed")) return fail("safety-destructive-stale-resolve", `no preview staged: ${e.output.slice(0, 80)}`);
    // Out-of-band edit ADDS a second matchable line: the staged preview (1
    // replacement) no longer matches the re-confirm dryRun (2) — the resolve
    // staleness guard is count-based by contract, so the OOB shape must move
    // the count. Disk must equal the tampered bytes after (no revert, no mutate).
    writeFileSync(f, "console.log(1);\nconsole.log(2);\n", "utf8");
    const after = readFileSync(f, "utf8");
    const r = yield* callTool("../../src/ast", "resolveTool", { reason: "stale test" }, ctx);
    const token = extractToken(r);
    const ok = token.startsWith("stale preview") && readFileSync(f, "utf8") === after;
    return ok
      ? pass("safety-destructive-stale-resolve", "stale preview + disk == tampered bytes (no revert, no mutate)")
      : fail("safety-destructive-stale-resolve", `token=${token} out=${r.output.slice(0, 120)}`);
  }),
);

const scEmptyPat: Scenario = define("safety-malformed-empty-pat", (dir) =>
  Effect.gen(function* () {
    const r = yield* callTool("../../src/ast", "astGrepTool", { pat: "" }, mkCtx(dir));
    const ok = extractToken(r).length > 0 && r.output.length < 300;
    return ok
      ? pass("safety-malformed-empty-pat", extractToken(r).slice(0, 80))
      : fail("safety-malformed-empty-pat", "empty pattern produced no named rejection");
  }),
);

const scBigFile: Scenario = define("safety-malformed-10mb-read", (dir) =>
  Effect.gen(function* () {
    const f = join(dir, "big.ts");
    const chunk = "export const v = 1;\n";
    writeFileSync(f, chunk.repeat(600000), "utf8");
    const r = yield* callTool("../../src/read", "shadowReadTool", { file_path: f }, mkCtx(dir));
    const ok = r.output.length < 200000 && (r.output.includes("#") || extractToken(r).length > 0);
    return ok
      ? pass("safety-malformed-10mb-read", `outBytes=${r.output.length}`)
      : fail("safety-malformed-10mb-read", `unbounded output: ${r.output.length} bytes`);
  }),
);

const scBinaryRead: Scenario = define("safety-malformed-binary-read", (dir) =>
  Effect.gen(function* () {
    const f = join(dir, "blob.bin");
    writeFileSync(f, Buffer.from([0x00, 0x01, 0x02, 0x89, 0x50, 0x4e, 0x47, 0x0a]));
    const r = yield* callTool("../../src/read", "shadowReadTool", { file_path: f }, mkCtx(dir));
    const ok = extractToken(r) === "READ_BINARY";
    return ok
      ? pass("safety-malformed-binary-read", "READ_BINARY + printable preview")
      : fail("safety-malformed-binary-read", `token=${extractToken(r)}`);
  }),
);

const scUnicodeName: Scenario = define("safety-malformed-unicode-name", (dir) =>
  Effect.gen(function* () {
    const f = join(dir, "caf\u00e9-#.ts");
    writeFileSync(f, "export function caf() {\n  return 1;\n}\n", "utf8");
    const r = yield* callTool("../../src/read", "shadowReadTool", { file_path: f }, mkCtx(dir));
    const ok = r.output.includes("#") && r.output.includes("caf (function)");
    return ok
      ? pass("safety-malformed-unicode-name", r.output.split("\n")[0])
      : fail("safety-malformed-unicode-name", r.output.slice(0, 120));
  }),
);

const scWrongTypes: Scenario = define("safety-malformed-wrong-types", (dir) =>
  Effect.gen(function* () {
    const r = yield* callTool("../../src/edit", "ompEditTool", { file_path: 42, tag: 7, hunks: "nope" }, mkCtx(dir));
    const token = extractToken(r);
    // Raw caller values reach execute (the wrapper does not enforce zod):
    // the tool must answer with the named INVALID_ARGS rejection, never a
    // Node TypeError past the boundary.
    const ok = token === "INVALID_ARGS";
    return ok
      ? pass("safety-malformed-wrong-types", "INVALID_ARGS named rejection")
      : fail("safety-malformed-wrong-types", `token=${token} out=${r.output.slice(0, 120)}`);
  }),
);

const scParallelEdits: Scenario = define("safety-concurrency-parallel-edits", (dir) =>
  Effect.gen(function* () {
    const f = join(dir, "p.ts");
    writeFileSync(f, "const x = 1;\n", "utf8");
    const g = yield* callTool("../../src/ast", "astGrepTool", { pat: "const $N = $V", path: f }, mkCtx(dir));
    const tag = tagOf(g.output);
    if (tag === "") return fail("safety-concurrency-parallel-edits", "no snapshot tag minted");
    const ctxA = mkCtx(dir, "st-a");
    const ctxB = mkCtx(dir, "st-b");
    const mkArgs = (v: string) => ({ file_path: f, tag, hunks: [{ line: 1, old: "const x = 1;", new: `const x = ${v};` }] });
    const both = yield* Effect.all(
      [
        callTool("../../src/edit", "ompEditTool", mkArgs("2"), ctxA),
        callTool("../../src/edit", "ompEditTool", mkArgs("3"), ctxB),
      ],
      { concurrency: "unbounded" },
    );
    const applied = both.filter((r) => r.output.includes("applied"));
    const rejected = both.filter((r) => extractToken(r) === "STALE_ANCHOR");
    const disk = readFileSync(f, "utf8");
    const ok = applied.length === 1 && rejected.length === 1 && (disk === "const x = 2;\n" || disk === "const x = 3;\n");
    return ok
      ? pass("safety-concurrency-parallel-edits", `exactly-one-applied disk=${disk.trim()}`)
      : fail("safety-concurrency-parallel-edits", `applied=${applied.length} rejected=${rejected.length} disk=${disk.trim()}`);
  }),
);

const scParallelEval: Scenario = define("safety-concurrency-parallel-eval", (dir) =>
  Effect.gen(function* () {
    const km = (yield* Effect.tryPromise({
      try: () => import("../../src/eval/kernels"),
      catch: (e) => new Error(String(e)),
    }).pipe(
      Effect.catchAll((e) => Effect.fail(`import failure: ${e.message}`)),
    )) as typeof import("../../src/eval/kernels");
    const base = join(dir, "eval-base");
    mkdirSync(base, { recursive: true });
    const mgr = new km.KernelManager(base);
    try {
      const results = yield* Effect.all(
        [1, 2, 3].map((n) =>
          Effect.tryPromise({
            try: () => mgr.exec("py", `print(${n} * 10)`, dir, 10000),
            catch: (e) => `exec defect: ${e instanceof Error ? e.message : String(e)}`,
          }),
        ),
        { concurrency: "unbounded" },
      );
      const outs = results.map((r) => r.stdout.trim()).sort();
      const ok = JSON.stringify(outs) === JSON.stringify(["10", "20", "30"]);
      return ok
        ? pass("safety-concurrency-parallel-eval", `serialized envelopes outs=${outs.join(",")}`)
        : fail("safety-concurrency-parallel-eval", `outs=${JSON.stringify(outs)}`);
    } finally {
      yield* Effect.promise(() => mgr.killAll().catch(() => undefined));
    }
  }),
);

const scNoTmpLeftovers: Scenario = define("safety-hygiene-no-tmp-leftovers", (dir) =>
  Effect.gen(function* () {
    const f = join(dir, "t.ts");
    writeFileSync(f, "const x = 1;\n", "utf8");
    const g = yield* callTool("../../src/ast", "astGrepTool", { pat: "const $N = $V", path: f }, mkCtx(dir));
    const tag = tagOf(g.output);
    if (tag === "") return fail("safety-hygiene-no-tmp-leftovers", "no snapshot tag minted");
    yield* callTool(
      "../../src/edit",
      "ompEditTool",
      { file_path: f, tag, hunks: [{ line: 1, old: "const x = 1;", new: "const x = 2;" }] },
      mkCtx(dir),
    );
    const leftovers = readdirSync(dir).filter((e) => e.includes(".omp-tmp") || e.includes(".lsp-tmp-"));
    const ok = leftovers.length === 0;
    return ok
      ? pass("safety-hygiene-no-tmp-leftovers", "no *.omp-tmp / *.lsp-tmp-* after successful edit")
      : fail("safety-hygiene-no-tmp-leftovers", `leftovers: ${leftovers.join(",")}`);
  }),
);

const scKillAllZero: Scenario = define("safety-hygiene-killall-zero", (dir) =>
  Effect.gen(function* () {
    const km = (yield* Effect.tryPromise({
      try: () => import("../../src/eval/kernels"),
      catch: (e) => new Error(String(e)),
    }).pipe(Effect.catchAll((e) => Effect.fail(`import failure: ${e.message}`)))) as typeof import("../../src/eval/kernels");
    const base = join(dir, "eval-base2");
    mkdirSync(base, { recursive: true });
    const mgr = new km.KernelManager(base);
    yield* Effect.tryPromise({
      try: () => mgr.exec("py", "print(1)", dir, 10000).then(() => undefined),
      catch: (e) => `exec defect: ${e instanceof Error ? e.message : String(e)}`,
    });
    const before = mgr.liveCount();
    yield* Effect.promise(() => mgr.killAll().catch(() => undefined));
    const after = mgr.liveCount();
    const ok = before >= 1 && after === 0;
    return ok
      ? pass("safety-hygiene-killall-zero", `live ${before} -> 0`)
      : fail("safety-hygiene-killall-zero", `live before=${before} after=${after}`);
  }),
);

const scSoakRejections: Scenario = define("safety-soak-rejections-x3", (dir) =>
  Effect.gen(function* () {
    // Pre-create ALL fixtures before the first query: the native directory
    // scan caches listings with sub-second staleness (measured 2026-09-13 —
    // files added between rapid sequential queries are invisible). Pre-
    // creation keeps the cache valid for the whole loop; all edits below
    // are rejected (STALE_ANCHOR), so no modification invalidates it either.
    for (let i = 0; i < 3; i++) {
      writeFileSync(join(dir, `s${i}.ts`), `const x${i} = ${i};\n`, "utf8");
    }
    for (let i = 0; i < 3; i++) {
      const f = join(dir, `s${i}.ts`);
      // Mint a real snapshot first: STALE_ANCHOR requires a snapshot to
      // exist with a mismatching tag (no snapshot → READ_FIRST instead).
      const g = yield* callTool("../../src/ast", "astGrepTool", { pat: "const $N = $V", path: f }, mkCtx(dir, `st-soak-${i}`));
      const tag = tagOf(g.output);
      if (tag === "") return fail("safety-soak-rejections-x3", `iteration ${i}: no snapshot tag minted`);
      const before = shaFile(f);
      const r = yield* callTool(
        "../../src/edit",
        "ompEditTool",
        { file_path: f, tag: "ffff", hunks: [{ line: 1, old: `const x${i} = ${i};`, new: `const x${i} = 9;` }] },
        mkCtx(dir, `st-soak-${i}`),
      );
      if (extractToken(r) !== "STALE_ANCHOR" || shaFile(f) !== before) {
        return fail("safety-soak-rejections-x3", `iteration ${i}: token=${extractToken(r)} shaEq=${shaFile(f) === before}`);
      }
      const tree = shaTree(dir);
      if (tree.length !== 64) return fail("safety-soak-rejections-x3", `iteration ${i}: tree hash malformed`);
    }
    return pass("safety-soak-rejections-x3", "3/3 stale rejections, shaEq every iteration");
  }),
);

const scTreeStable: Scenario = define("safety-tree-stable-across-suite", (dir) =>
  Effect.gen(function* () {
    const snap = shaTree(dir);
    const f = join(dir, "probe.ts");
    writeFileSync(f, "const p = 1;\n", "utf8");
    const afterWrite = shaTree(dir) !== snap;
    try {
      if (existsSync(f)) {
        const { unlinkSync } = yield* Effect.tryPromise({
          try: () => import("node:fs"),
          catch: (e) => `import failure: ${e instanceof Error ? e.message : String(e)}`,
        });
        unlinkSync(f);
      }
    } catch {
      return fail("safety-tree-stable-across-suite", "cleanup throw");
    }
    const restored = shaTree(dir) === snap;
    const ok = afterWrite && restored;
    return ok
      ? pass("safety-tree-stable-across-suite", "shaTree sensitive to writes, stable after cleanup")
      : fail("safety-tree-stable-across-suite", `sensitive=${afterWrite} restored=${restored}`);
  }),
);

export const scenarios: Scenario[] = [
  scStaleTagShaEq,
  scReadonlyFile,
  scStaleResolve,
  scEmptyPat,
  scBigFile,
  scBinaryRead,
  scUnicodeName,
  scWrongTypes,
  scParallelEdits,
  scParallelEval,
  scNoTmpLeftovers,
  scKillAllZero,
  scSoakRejections,
  scTreeStable,
];

export const scenarioNames = scenarios.map((s) => s.name);
