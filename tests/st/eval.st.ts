/**
 * tests/st/eval.st.ts — script tests for the REAL src/eval/kernels.ts +
 * src/eval/prelude.ts (W3-A + W3-B, Desk W3-D). Mode B: observation channels
 * are returned ExecResult fields (ok/stdout/error strings) + liveCount()
 * numbers ONLY. No mocks of kernels/prelude anywhere; every adversarial row
 * asserts an EXACT named refusal token.
 *
 * CONTRACTS (CONTRACTS-W3.md ST suites + DPL1 §6 SC-10/SC-11, §11 eval.st.ts):
 *  - LEGIT (SC-10 persistence): py exec "x = 41" then py exec "print(x+1)" →
 *    second stdout trim === "42" (state persists in the SAME driver process
 *    across exec calls). js exec "const y = 9" then "console.log(y*2)" →
 *    trim === "18".
 *  - LEGIT (reset): exec "z = 1"; exec reset=true "print(z)" → ok === false
 *    with a NameError-class error (reset = kill + respawn, state gone); then
 *    exec "z = 2"; exec "print(z)" → "2" (the fresh driver accepts new state).
 *  - ADVERSARIAL (SC/known-bad MUST-refuse): KERNEL_MISSING — manager built
 *    with a bad python binary path → exec py → error startsWith
 *    "KERNEL_MISSING". EVAL_TIMEOUT — code `import time; time.sleep(9)` with
 *    timeoutMs 1500 → error === "EVAL_TIMEOUT" AND liveCount() drops by 1
 *    within 1s (THAT driver killed — leak guard AP-4).
 *  - CLEANUP (SC-11 in-process form): spawn (liveCount >= 1) → killAll() →
 *    liveCount() === 0.
 *
 * SUITE-ORDERING LAW (CONTRACTS-W3.md:63-65, from the W2-E finding): W3 ST
 * files MUST NOT touch the project-cwd chain. KernelManager baseDir is ALWAYS
 * sandbox-absolute (join(dir, "eval-base")); exec cwd is the scenario sandbox
 * dir. This file never reads/writes process.cwd(). hooks-cleanup stays LAST
 * in run.ts — evalScenarios are concatenated BEFORE the hooks array.
 *
 * SIBLING-PARALLEL TOLERANCE (dynamic import, never static): W3-A
 * (kernels.ts) + W3-B (prelude.ts) land in parallel with this file. Both
 * modules are loaded via dynamic import() INSIDE the scenario effect, so a
 * mid-flight sibling becomes honest import-failure FAIL rows — never a
 * runner-level crash (run.ts's static import of THIS file must always load).
 * Prelude is asserted directly (DRIVER_PY/DRIVER_JS non-empty strings) AND
 * indirectly (a py+js exec cannot succeed unless the driver sources the
 * manager writes are correct); driver source lengths ride in the legit rows'
 * `got` as prelude evidence.
 *
 * CTOR-SHAPE TOLERANCE (adapter, not mock): CONTRACTS-W3 names the override
 * option `binOverrides` ({py:"/nonexistent/..."}) while the mission dispatch
 * shows the overrides map inline ({py:"/nonexistent/opi-py"}). The
 * adversarial scenario passes ONE object carrying BOTH keys
 * ({binOverrides:{py:BAD}, py:BAD}), so either conforming plumbing shape
 * resolves the bad binary deterministically; the row reports the observed
 * error verbatim. The module under test is always the real src file.
 *
 * TIMEOUT BOUNDING: every scenario runs under run.ts's 30s Effect.timeout
 * (FAIL row on expiry, never a hang). Legit execs carry an explicit
 * timeoutMs=10000 (a hung driver surfaces as EVAL_TIMEOUT-named FAIL, never
 * a runner timeout); the adversarial sleep(9) (9s) is strictly inside the
 * 30s runner bound even if the manager never kills. Cleanup discipline:
 * every manager is killAll()'d via acquireUseRelease even on assertion
 * failure — no driver process leaks across scenarios.
 */
import { Effect } from "effect";
import { join } from "node:path";
import { fail, pass, type Row, type Scenario } from "./harness";

const KERNELS_MOD = "../../src/eval/kernels";
const PRELUDE_MOD = "../../src/eval/prelude";

/** Bad-binary path: no such file, deterministic spawn failure. */
const BAD_PY = "/nonexistent/opi-py";

/** Explicit per-exec ceilings (ms). Legit < runner 30s; adversarial 1500. */
const LEGIT_TIMEOUT = 10000;
const ADV_TIMEOUT = 1500;

/** Structural view of the real KernelManager — sync liveCount, async rest. */
interface ExecResult {
  readonly ok: boolean;
  readonly stdout: string;
  readonly error?: string;
}
interface Km {
  readonly exec: (
    lang: "py" | "js",
    code: string,
    cwd: string,
    timeoutMs?: number,
    reset?: boolean,
  ) => Promise<ExecResult>;
  readonly killAll: () => Promise<void>;
  readonly liveCount: () => number;
}
type KmCtor = new (baseDir: string, opts?: unknown) => Km;

/** Loaded real modules + prelude evidence (driver source lengths). */
interface Loaded {
  readonly Ctor: KmCtor;
  readonly pyLen: number;
  readonly jsLen: number;
}

/**
 * Load the REAL src/eval/kernels.ts + src/eval/prelude.ts. Any failure is a
 * string on the error channel (honest FAIL row), never a throw past the
 * scenario boundary. Prelude asserted directly: DRIVER_PY/DRIVER_JS must be
 * non-empty strings.
 */
const loadModules = (): Effect.Effect<Loaded, string> =>
  Effect.tryPromise({
    try: async (): Promise<Loaded> => {
      const kmod: Record<string, unknown> = await import(KERNELS_MOD);
      const Ctor = kmod["KernelManager"] as KmCtor | undefined;
      if (typeof Ctor !== "function") {
        throw new Error(
          `kernels module exports lack KernelManager (keys: ${Object.keys(kmod).join(",")})`,
        );
      }
      const pmod: Record<string, unknown> = await import(PRELUDE_MOD);
      const py = pmod["DRIVER_PY"];
      const js = pmod["DRIVER_JS"];
      if (typeof py !== "string" || py.length === 0) {
        throw new Error(`prelude DRIVER_PY missing/empty (keys: ${Object.keys(pmod).join(",")})`);
      }
      if (typeof js !== "string" || js.length === 0) {
        throw new Error(`prelude DRIVER_JS missing/empty (keys: ${Object.keys(pmod).join(",")})`);
      }
      return { Ctor, pyLen: py.length, jsLen: js.length };
    },
    catch: (e) =>
      `import failure (expected real src/eval/kernels.ts + prelude.ts, got crash): ${e instanceof Error ? e.message : String(e)}`,
  });

/** Sandbox-absolute kernel base (suite-ordering law: never the project cwd). */
const baseOf = (dir: string): string => join(dir, "eval-base");

/** Small async sleep for the liveCount poll loop. */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Construct a manager on base, run use(km), killAll() unconditionally after
 * (release never fails — a killAll throw becomes a no-op so the row verdict
 * always reflects the OBSERVED behavior, not cleanup noise).
 */
const withKm = (
  loaded: Loaded,
  base: string,
  opts: unknown,
  use: (km: Km) => Promise<Row>,
): Effect.Effect<Row, string> =>
  Effect.acquireUseRelease(
    Effect.tryPromise({
      try: async (): Promise<Km> =>
        opts === undefined ? new loaded.Ctor(base) : new loaded.Ctor(base, opts),
      catch: (e) => `construct defect: ${e instanceof Error ? e.message : String(e)}`,
    }),
    (km) =>
      Effect.tryPromise({
        try: () => use(km),
        catch: (e) => `exec defect: ${e instanceof Error ? e.message : String(e)}`,
      }),
    (km) => Effect.promise(() => km.killAll().then(() => undefined).catch(() => undefined)),
  );

/** Scenario wrapper: body errors are already full messages; collapse to a row. */
const define = (name: string, body: (dir: string) => Effect.Effect<Row, string>): Scenario => ({
  name,
  run: (dir) => Effect.catchAll(body(dir), (msg) => Effect.succeed(fail(name, msg))),
});

const scPyPersist: Scenario = define("eval-legit-py-persistence", (dir) => {
  const base = baseOf(dir);
  return Effect.flatMap(loadModules(), (loaded) =>
    withKm(loaded, base, undefined, async (km) => {
      const r1 = await km.exec("py", "x = 41", dir, LEGIT_TIMEOUT);
      if (r1.ok !== true) {
        return fail(
          "eval-legit-py-persistence",
          `first exec not ok (expected state-setting to succeed): ok=${r1.ok} error=${JSON.stringify(r1.error ?? "")}`,
        );
      }
      const r2 = await km.exec("py", "print(x+1)", dir, LEGIT_TIMEOUT);
      const got = r2.stdout.trim();
      return got === "42"
        ? pass(
            "eval-legit-py-persistence",
            `second stdout="42" (SC-10 py persistence; pyDriver=${loaded.pyLen}chars jsDriver=${loaded.jsLen}chars)`,
          )
        : fail(
            "eval-legit-py-persistence",
            `second stdout=${JSON.stringify(got)} ok=${r2.ok} error=${JSON.stringify(r2.error ?? "")} (expected "42")`,
          );
    }),
  );
});

const scJsPersist: Scenario = define("eval-legit-js-persistence", (dir) => {
  const base = baseOf(dir);
  return Effect.flatMap(loadModules(), (loaded) =>
    withKm(loaded, base, undefined, async (km) => {
      const r1 = await km.exec("js", "const y = 9", dir, LEGIT_TIMEOUT);
      if (r1.ok !== true) {
        return fail(
          "eval-legit-js-persistence",
          `first exec not ok (expected declaration to succeed): ok=${r1.ok} error=${JSON.stringify(r1.error ?? "")}`,
        );
      }
      const r2 = await km.exec("js", "console.log(y*2)", dir, LEGIT_TIMEOUT);
      const got = r2.stdout.trim();
      return got === "18"
        ? pass(
            "eval-legit-js-persistence",
            `second stdout="18" (SC-10 js persistence; pyDriver=${loaded.pyLen}chars jsDriver=${loaded.jsLen}chars)`,
          )
        : fail(
            "eval-legit-js-persistence",
            `second stdout=${JSON.stringify(got)} ok=${r2.ok} error=${JSON.stringify(r2.error ?? "")} (expected "18")`,
          );
    }),
  );
});

const scResetWipe: Scenario = define("eval-legit-reset-wipes-state", (dir) => {
  const base = baseOf(dir);
  return Effect.flatMap(loadModules(), (loaded) =>
    withKm(loaded, base, undefined, async (km) => {
      const r1 = await km.exec("py", "z = 1", dir, LEGIT_TIMEOUT);
      if (r1.ok !== true) {
        return fail(
          "eval-legit-reset-wipes-state",
          `set-state exec not ok: ok=${r1.ok} error=${JSON.stringify(r1.error ?? "")}`,
        );
      }
      const r2 = await km.exec("py", "print(z)", dir, LEGIT_TIMEOUT, true);
      const err = r2.error ?? "";
      const wiped = r2.ok === false && /NameError/.test(err);
      void loaded;
      return wiped
        ? pass("eval-legit-reset-wipes-state", `reset exec ok=false error names NameError (state gone)`)
        : fail(
            "eval-legit-reset-wipes-state",
            `reset did not wipe: ok=${r2.ok} stdout=${JSON.stringify(r2.stdout)} error=${JSON.stringify(err)} (expected ok=false + NameError)`,
          );
    }),
  );
});

const scPostResetFresh: Scenario = define("eval-legit-post-reset-fresh-state", (dir) => {
  const base = baseOf(dir);
  return Effect.flatMap(loadModules(), (loaded) =>
    withKm(loaded, base, undefined, async (km) => {
      const r1 = await km.exec("py", "z = 1", dir, LEGIT_TIMEOUT);
      if (r1.ok !== true) {
        return fail(
          "eval-legit-post-reset-fresh-state",
          `set-state exec not ok: ok=${r1.ok} error=${JSON.stringify(r1.error ?? "")}`,
        );
      }
      const r2 = await km.exec("py", "print('wiped')", dir, LEGIT_TIMEOUT, true);
      if (r2.ok !== true || r2.stdout.trim() !== "wiped") {
        return fail(
          "eval-legit-post-reset-fresh-state",
          `reset exec itself broken: ok=${r2.ok} stdout=${JSON.stringify(r2.stdout)} error=${JSON.stringify(r2.error ?? "")} (expected ok + "wiped")`,
        );
      }
      void loaded;
      const r3 = await km.exec("py", "z = 2", dir, LEGIT_TIMEOUT);
      if (r3.ok !== true) {
        return fail(
          "eval-legit-post-reset-fresh-state",
          `re-set exec not ok: ok=${r3.ok} error=${JSON.stringify(r3.error ?? "")}`,
        );
      }
      const r4 = await km.exec("py", "print(z)", dir, LEGIT_TIMEOUT);
      const got = r4.stdout.trim();
      return got === "2"
        ? pass("eval-legit-post-reset-fresh-state", `fresh driver: print(z)="2" after reset + re-set`)
        : fail(
            "eval-legit-post-reset-fresh-state",
            `fresh stdout=${JSON.stringify(got)} ok=${r4.ok} error=${JSON.stringify(r4.error ?? "")} (expected "2")`,
          );
    }),
  );
});

const scKernelMissing: Scenario = define("eval-adversarial-kernel-missing", (dir) => {
  const base = baseOf(dir);
  // Dual-key override object: {binOverrides:{py:BAD}} covers the
  // CONTRACTS-W3-named option shape; {py:BAD} covers the inline-map shape.
  // Either conforming plumbing resolves the bad binary deterministically.
  const opts = { binOverrides: { py: BAD_PY }, py: BAD_PY };
  return Effect.flatMap(loadModules(), (loaded) =>
    withKm(loaded, base, opts, async (km) => {
      const r = await km.exec("py", "print(1)", dir, LEGIT_TIMEOUT);
      const err = r.error ?? "";
      void loaded;
      return r.ok === false && err.startsWith("KERNEL_MISSING")
        ? pass("eval-adversarial-kernel-missing", `refused with error=${JSON.stringify(err.slice(0, 120))}`)
        : fail(
            "eval-adversarial-kernel-missing",
            `MUST-refuse broken: ok=${r.ok} stdout=${JSON.stringify(r.stdout)} error=${JSON.stringify(err)} (expected ok=false + error startsWith KERNEL_MISSING)`,
          );
    }),
  );
});

const scEvalTimeout: Scenario = define("eval-adversarial-eval-timeout-driver-killed", (dir) => {
  const base = baseOf(dir);
  return Effect.flatMap(loadModules(), (loaded) =>
    withKm(loaded, base, undefined, async (km) => {
      // Warmup: prove a live driver exists BEFORE the timeout exec, so the
      // post-timeout liveCount observation measures a real drop (1 -> 0).
      const warm = await km.exec("py", "print(1)", dir, LEGIT_TIMEOUT);
      if (warm.ok !== true || warm.stdout.trim() !== "1") {
        return fail(
          "eval-adversarial-eval-timeout-driver-killed",
          `warmup defect (expected live py driver): ok=${warm.ok} stdout=${JSON.stringify(warm.stdout)} error=${JSON.stringify(warm.error ?? "")}`,
        );
      }
      void loaded;
      const before = km.liveCount();
      if (before !== 1) {
        return fail(
          "eval-adversarial-eval-timeout-driver-killed",
          `precondition: liveCount=${before} after one warmup exec (expected exactly 1 live driver)`,
        );
      }
      const r = await km.exec("py", "import time; time.sleep(9)", dir, ADV_TIMEOUT);
      const err = r.error ?? "";
      // Leak guard AP-4: THAT driver must be dead. Poll up to 1s — a kill
      // that lands before exec returns shows 0 immediately (elapsed ~0ms).
      const t0 = Date.now();
      let cur = km.liveCount();
      while (cur !== 0 && Date.now() - t0 < 1000) {
        await sleep(50);
        cur = km.liveCount();
      }
      const elapsed = Date.now() - t0;
      const named = r.ok === false && err === "EVAL_TIMEOUT";
      const killed = before === 1 && cur === 0;
      return named && killed
        ? pass(
            "eval-adversarial-eval-timeout-driver-killed",
            `error=EVAL_TIMEOUT + liveCount 1->0 in ${elapsed}ms (driver killed, no leak)`,
          )
        : fail(
            "eval-adversarial-eval-timeout-driver-killed",
            `named=${named} (ok=${r.ok} error=${JSON.stringify(err)}, expected ok=false + exactly EVAL_TIMEOUT) killed=${killed} (liveCount ${before}->${cur} in ${elapsed}ms, expected 1->0 within 1000ms)`,
          );
    }),
  );
});

const scCleanup: Scenario = define("eval-cleanup-killall-zero", (dir) => {
  const base = baseOf(dir);
  return Effect.flatMap(loadModules(), (loaded) =>
    withKm(loaded, base, undefined, async (km) => {
      // js spawn: bun is guaranteed present (the runner itself runs on bun).
      const r = await km.exec("js", "console.log('alive')", dir, LEGIT_TIMEOUT);
      if (r.ok !== true) {
        return fail(
          "eval-cleanup-killall-zero",
          `spawn exec not ok (expected a live driver to kill): ok=${r.ok} error=${JSON.stringify(r.error ?? "")}`,
        );
      }
      void loaded;
      const before = km.liveCount();
      if (before < 1) {
        return fail(
          "eval-cleanup-killall-zero",
          `precondition: liveCount=${before} after a successful exec (expected >= 1 live driver)`,
        );
      }
      await km.killAll();
      const after = km.liveCount();
      return after === 0
        ? pass("eval-cleanup-killall-zero", `SC-11 in-process: liveCount ${before}->0 after killAll()`)
        : fail(
            "eval-cleanup-killall-zero",
            `SC-11 broken: liveCount ${before}->${after} after killAll() (expected 0 — leaked driver)`,
          );
    }),
  );
});

export const scenarios: ReadonlyArray<Scenario> = [
  scPyPersist,
  scJsPersist,
  scResetWipe,
  scPostResetFresh,
  scKernelMissing,
  scEvalTimeout,
  scCleanup,
];

export const scenarioNames: ReadonlyArray<string> = scenarios.map((s) => s.name);
