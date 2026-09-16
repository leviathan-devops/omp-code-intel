/**
 * tests/st/eval-gates.st.ts — Mode B script tests for the eval OPTION GATES
 * (Desk W3-E) through the REAL plugin entry (`pluginFn` default export of
 * `src/index.ts`), against the REAL eval tool + REAL KernelManager that Desk
 * W3-C wires. No mocks, no stubs, no spies: every assertion reads the
 * returned tool map / returned `{output, metadata}` / `ps` bytes ONLY.
 *
 * CONTRACT SOURCE: CONTRACTS-W3.md `src/index.ts — W3 wiring` (Desk W3-C
 * owns ALL index.ts edits; this suite imports the real entry and asserts its
 * surface, never re-implements it):
 *   - Tool id "eval"; gates BEFORE exec: `opts.eval?.py === false` + py →
 *     rejection `eval python is disabled by plugin options` (metadata.error
 *     "EVAL_DISABLED_PY"); same for js → "EVAL_DISABLED_JS". Empty code →
 *     `eval code must be non-empty` (metadata.error "EVAL_EMPTY").
 *   - Hooks key `"session.post"`: `km.killAll()` (fire-and-forget) — kernels
 *     die with the session (SC-11).
 * SPEC ANCHORS: DPL1 §6 SC-10 (persistence), SC-11 (cleanup: post-session
 * `pgrep -f mimo-intel-eval` returns nothing), §7 CONFIG angle
 * (`{eval:{py:false}}` → named disabled-error, js path advertised); the RB-08
 * form is GATE-2 below (py disabled / js alive in the SAME options object).
 *
 * SUITE-ORDERING LAW (CONTRACTS-W3, from the W2-E finding): this suite must
 * NOT touch the project-cwd chain. Tool ctx directories are sandbox-absolute
 * (`mkCtx(dir)` per harness). The KernelManager singleton base itself is
 * cwd-derived by contract (`<cwd>/.mimocode/mimo-intel`, W3-C wiring), so this
 * suite snapshots pre-existence of that dir + its `eval-rpc/` subdir and the
 * LAST scenario removes ONLY what WE created (never a pre-existing chain;
 * chain rows are append-only and untouched — this suite never invokes
 * `tool.execute.after`, so it writes zero chain rows).
 *
 * MID-FLIGHT HONESTY: W3-A/B/C land in parallel. Until W3-C wires the eval
 * tool, every gate scenario FAILs loudly with `eval tool absent from tool
 * map (W3-C pending)` — a named structural FAIL, never a pass, never a
 * throw. The orchestrator re-runs after W3-C lands.
 */
import { Effect } from "effect";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import pluginFn from "../../src/index";
import { fail, mkCtx, pass, type Row, type Scenario } from "./harness";

/** The plugin's tool-map value shape: ToolDefinitions with execute(args, ctx). */
type ToolMap = Record<string, { execute?: (args: unknown, ctx: unknown) => Promise<unknown> }>;
/** Normalized tool return: `{output, metadata}` object (string returns normalized). */
interface NormResult {
  readonly output: string;
  readonly metadata: Record<string, unknown>;
}

const asResult = (raw: unknown): NormResult => {
  if (typeof raw === "string") return { output: raw, metadata: {} };
  const o = raw as { output?: unknown; metadata?: unknown };
  return {
    output: String(o.output ?? ""),
    metadata: (o.metadata ?? {}) as Record<string, unknown>,
  };
};

/** Real plugin entry → real tool map for the given options. Never throws. */
const getTools = async (opts: Record<string, unknown>): Promise<ToolMap> => {
  const out = (await pluginFn({}, opts)) as unknown as { tool?: ToolMap };
  return out !== null && typeof out === "object" && out.tool !== null && typeof out.tool === "object"
    ? (out.tool as ToolMap)
    : {};
};

/**
 * Execute the REAL eval tool from the REAL tool map with a sandbox-absolute
 * ctx. Returns the normalized result, or the thrown message (throw-channel).
 * Contract (CONTRACTS.md:22, carried into W3): tools NEVER throw past the
 * tool boundary — rejections are RETURNED with metadata.error — so a throw
 * here is always reported as a FAIL naming the throw.
 */
const execEval = async (
  tools: ToolMap,
  args: Record<string, unknown>,
  dir: string,
  sid: string,
): Promise<{ ok: true; result: NormResult } | { ok: false; thrown: string }> => {
  const t = tools["eval"];
  if (t === undefined || t === null || typeof t.execute !== "function") {
    return { ok: false, thrown: "eval tool absent from tool map (W3-C pending)" };
  }
  try {
    return { ok: true, result: asResult(await t.execute(args, mkCtx(dir, sid))) };
  } catch (e) {
    return { ok: false, thrown: e instanceof Error ? e.message : String(e) };
  }
};

/** A hook/tool crash is an honest FAIL row carrying the thrown message — never a pass. */
const asyncScenario = (name: string, body: (dir: string) => Promise<Row>): Scenario => ({
  name,
  run: (dir) =>
    Effect.catchAll(
      Effect.tryPromise({
        try: () => body(dir),
        catch: (e) => ({ message: e instanceof Error ? e.message : String(e) }) as const,
      }),
      (c) => Effect.succeed(fail(name, `eval-gates crash (expected contract behavior, got throw): ${c.message}`)),
    ),
});

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Suite-ordering-law bookkeeping: snapshot BEFORE first touch, restore AFTER.
// ---------------------------------------------------------------------------
const intelDir = (): string => join(process.cwd(), ".mimocode", "mimo-intel");
const rpcDir = (): string => join(intelDir(), "eval-rpc");
let baseSnap: { intelExisted: boolean; rpcExisted: boolean } | null = null;
const snapshotBase = (): void => {
  if (baseSnap === null) {
    baseSnap = { intelExisted: existsSync(intelDir()), rpcExisted: existsSync(rpcDir()) };
  }
};

// ---------------------------------------------------------------------------
// GATE-1: opts {} (defaults) → tool map includes eval; empty code → EVAL_EMPTY.
// ---------------------------------------------------------------------------
const scG1Map: Scenario = asyncScenario("eval-gates-g1-map-default-includes-eval", async () => {
  snapshotBase();
  const tools = await getTools({});
  const keys = Object.keys(tools).sort().join(",");
  return "eval" in tools
    ? pass("eval-gates-g1-map-default-includes-eval", `tool map keys=[${keys}]`)
    : fail("eval-gates-g1-map-default-includes-eval", `default map excludes eval (W3-C pending?) keys=[${keys}]`);
});

const scG1Empty: Scenario = asyncScenario("eval-gates-g1-empty-code-EVAL_EMPTY", async (dir) => {
  snapshotBase();
  const tools = await getTools({});
  const r = await execEval(tools, { language: "py", code: "" }, dir, "st-eval-g1");
  if (!r.ok) {
    return fail("eval-gates-g1-empty-code-EVAL_EMPTY", `throw-channel (contract demands returned metadata.error): ${r.thrown}`);
  }
  const err = r.result.metadata["error"];
  const ok = err === "EVAL_EMPTY";
  return ok
    ? pass("eval-gates-g1-empty-code-EVAL_EMPTY", `metadata.error=EVAL_EMPTY output=${JSON.stringify(r.result.output.slice(0, 80))}`)
    : fail(
        "eval-gates-g1-empty-code-EVAL_EMPTY",
        `expected metadata.error=EVAL_EMPTY got error=${JSON.stringify(err)} output=${JSON.stringify(r.result.output.slice(0, 160))}`,
      );
});

// ---------------------------------------------------------------------------
// GATE-2 (RB-08 form): opts {eval:{py:false, js:true}} → map STILL includes
// eval (js enabled); py → EVAL_DISABLED_PY + output names "disabled"; js
// console.log(7) → output trim === "7" (js path alive in same options).
// ---------------------------------------------------------------------------
const RB08_OPTS: Record<string, unknown> = { eval: { py: false, js: true } };

const scG2aMap: Scenario = asyncScenario("eval-gates-g2a-rb08-map-still-includes-eval", async () => {
  snapshotBase();
  const tools = await getTools(RB08_OPTS);
  const keys = Object.keys(tools).sort().join(",");
  return "eval" in tools
    ? pass("eval-gates-g2a-rb08-map-still-includes-eval", `py-off/js-on map keeps eval keys=[${keys}]`)
    : fail("eval-gates-g2a-rb08-map-still-includes-eval", `py-off/js-on map dropped eval entirely keys=[${keys}]`);
});

const scG2bPy: Scenario = asyncScenario("eval-gates-g2b-rb08-py-EVAL_DISABLED_PY", async (dir) => {
  snapshotBase();
  const tools = await getTools(RB08_OPTS);
  const r = await execEval(tools, { language: "py", code: "1" }, dir, "st-eval-g2b");
  if (!r.ok) {
    return fail("eval-gates-g2b-rb08-py-EVAL_DISABLED_PY", `throw-channel (contract demands returned metadata.error): ${r.thrown}`);
  }
  const err = r.result.metadata["error"];
  const namesDisabled = /disabled/i.test(r.result.output);
  const ok = err === "EVAL_DISABLED_PY" && namesDisabled;
  return ok
    ? pass("eval-gates-g2b-rb08-py-EVAL_DISABLED_PY", `metadata.error=EVAL_DISABLED_PY output=${JSON.stringify(r.result.output.slice(0, 80))}`)
    : fail(
        "eval-gates-g2b-rb08-py-EVAL_DISABLED_PY",
        `expected error=EVAL_DISABLED_PY + output naming disabled got error=${JSON.stringify(err)} output=${JSON.stringify(r.result.output.slice(0, 160))}`,
      );
});

const scG2cJs: Scenario = asyncScenario("eval-gates-g2c-rb08-js-alive", async (dir) => {
  snapshotBase();
  const tools = await getTools(RB08_OPTS);
  const r = await execEval(tools, { language: "js", code: "console.log(7)" }, dir, "st-eval-g2c");
  if (!r.ok) {
    return fail("eval-gates-g2c-rb08-js-alive", `js path threw under py-off/js-on opts: ${r.thrown}`);
  }
  const trimmed = r.result.output.trim();
  const err = r.result.metadata["error"];
  const ok = trimmed === "7" && err === undefined;
  return ok
    ? pass("eval-gates-g2c-rb08-js-alive", `js output trim="7" (js alive beside disabled py)`)
    : fail(
        "eval-gates-g2c-rb08-js-alive",
        `expected js output trim="7" with no metadata.error got output=${JSON.stringify(r.result.output.slice(0, 160))} error=${JSON.stringify(err)}`,
      );
});

// ---------------------------------------------------------------------------
// GATE-3: opts {eval:{py:false, js:false}} → tool map EXCLUDES eval entirely
// (map otherwise healthy: ast_grep still registered — guards the degenerate
// "return an empty map" implementation).
// ---------------------------------------------------------------------------
const scG3: Scenario = asyncScenario("eval-gates-g3-both-off-excludes-eval", async () => {
  snapshotBase();
  const tools = await getTools({ eval: { py: false, js: false } });
  const keys = Object.keys(tools).sort().join(",");
  const ok = !("eval" in tools) && "ast_grep" in tools;
  return ok
    ? pass("eval-gates-g3-both-off-excludes-eval", `eval excluded, map healthy keys=[${keys}]`)
    : fail(
        "eval-gates-g3-both-off-excludes-eval",
        `expected eval absent + ast_grep present got keys=[${keys}]`,
      );
});

// ---------------------------------------------------------------------------
// GATE-4: valid py two-cell persistence through the TOOL layer (x=41, then
// print(x+1) → "42") — proves the tool→manager wiring, not just the manager.
// SC-10 through the real plugin surface, same singleton both cells share.
// ---------------------------------------------------------------------------
const scG4: Scenario = asyncScenario("eval-gates-g4-tool-persistence-42", async (dir) => {
  snapshotBase();
  const tools = await getTools({});
  const r1 = await execEval(tools, { language: "py", code: "x = 41" }, dir, "st-eval-g4");
  if (!r1.ok) {
    return fail("eval-gates-g4-tool-persistence-42", `cell1 threw: ${r1.thrown}`);
  }
  if (r1.result.metadata["error"] !== undefined) {
    return fail(
      "eval-gates-g4-tool-persistence-42",
      `cell1 rejected: error=${JSON.stringify(r1.result.metadata["error"])} output=${JSON.stringify(r1.result.output.slice(0, 160))}`,
    );
  }
  const r2 = await execEval(tools, { language: "py", code: "print(x + 1)" }, dir, "st-eval-g4");
  if (!r2.ok) {
    return fail("eval-gates-g4-tool-persistence-42", `cell2 threw: ${r2.thrown}`);
  }
  const trimmed = r2.result.output.trim();
  return trimmed === "42"
    ? pass("eval-gates-g4-tool-persistence-42", `cell1 "x = 41" → cell2 "print(x + 1)" trim="42" (tool-layer persistence)`)
    : fail(
        "eval-gates-g4-tool-persistence-42",
        `expected cell2 trim="42" got output=${JSON.stringify(r2.result.output.slice(0, 160))} error=${JSON.stringify(r2.result.metadata["error"])}`,
      );
});

// ---------------------------------------------------------------------------
// CLEANUP (SC-11): session.post → within 2s zero driver procs from THIS suite
// remain (ps scan keyed on our unique baseDir marker + driver tokens), AND a
// fresh exec afterwards still WORKS (lazy-respawn semantics: killAll kills
// drivers, the next exec respawns on demand).
// ---------------------------------------------------------------------------
const DRIVER_TOKENS = ["driver_py", "driver_js", "drv-", "eval-rpc"];

/**
 * Count live processes whose cmdline contains BOTH our base marker and a
 * driver token. Returns -1 when no process lister works (honest unknown).
 * Skips our own pid (defensive: our cmdline never contains the marker, but
 * the check is free).
 */
const psScan = (marker: string): number => {
  const bunGlobal = (globalThis as { Bun?: { spawnSync?: (argv: string[]) => { exitCode: number; stdout: unknown } } }).Bun;
  if (bunGlobal === undefined || typeof bunGlobal.spawnSync !== "function") return -1;
  const me = String(process.pid);
  for (const argv of [["ps", "-ef"], ["ps", "aux"]]) {
    try {
      const p = bunGlobal.spawnSync(argv);
      if (p.exitCode !== 0) continue;
      const text = String(p.stdout ?? "");
      if (text.length === 0) continue;
      let n = 0;
      for (const line of text.split("\n")) {
        if (!line.includes(marker)) continue;
        if (!DRIVER_TOKENS.some((t) => line.includes(t))) continue;
        // Zombie/defunct rows: the proc is dead (SIGTERM landed), merely
        // unreaped — counting it would fail SC-11 on a race, not a leak.
        if (line.includes("<defunct>") || line.includes("[driver_py.py]") || line.includes("[driver_js.js]")) continue;
        const parts = line.trim().split(/\s+/);
        // ps -ef: col 8 = state (Z = zombie); ps aux: col 8 = STAT.
        const stateCol = argv[0] === "ps" && argv[1] === "-ef" ? parts[7] : parts[7];
        if (stateCol === "Z" || (stateCol && stateCol.startsWith("Z"))) continue;
        if (parts[1] === me) continue;
        n++;
      }
      return n;
    } catch {
      continue;
    }
  }
  return -1;
};

const scCleanupPost: Scenario = asyncScenario("eval-gates-cleanup-session-post-respawn", async (dir) => {
  snapshotBase();
  const out = (await pluginFn({}, {})) as unknown as Record<string, unknown>;
  const post = out["session.post"] as ((a: unknown, b: unknown) => Promise<unknown>) | undefined;
  if (typeof post !== "function") {
    return fail("eval-gates-cleanup-session-post-respawn", `"session.post" hook absent from plugin surface (W3-C pending)`);
  }
  // Ensure a live driver exists via the TOOL path (not the manager import).
  const tools = (out.tool ?? {}) as ToolMap;
  const seed = await execEval(tools, { language: "py", code: "x = 7" }, dir, "st-eval-cleanup");
  if (!seed.ok) {
    return fail("eval-gates-cleanup-session-post-respawn", `seed exec threw (no driver to clean up): ${seed.thrown}`);
  }
  // Fire session.post exactly per contract: ({sessionID, agentID, outcome}, {}).
  await post({ sessionID: "st", agentID: "st", outcome: "completed" }, {});
  // Poll ≤2s for zero suite driver procs (killAll is fire-and-forget).
  const marker = intelDir();
  const deadline = Date.now() + 2000;
  let count = psScan(marker);
  while (count > 0 && Date.now() < deadline) {
    await sleep(100);
    count = psScan(marker);
  }
  if (count === -1) {
    return fail("eval-gates-cleanup-session-post-respawn", `no process lister (Bun.spawnSync ps failed) — orphan state UNKNOWN, refusing pass`);
  }
  if (count !== 0) {
    return fail("eval-gates-cleanup-session-post-respawn", `SC-11 broken: ${count} driver proc(s) still match marker=${marker} 2s after session.post`);
  }
  // Lazy-respawn semantics: the NEXT exec must still WORK (fresh driver).
  const re = await execEval(tools, { language: "py", code: "print(6 * 7)" }, dir, "st-eval-cleanup");
  if (!re.ok) {
    return fail("eval-gates-cleanup-session-post-respawn", `post-kill respawn exec threw: ${re.thrown}`);
  }
  const trimmed = re.result.output.trim();
  return trimmed === "42"
    ? pass("eval-gates-cleanup-session-post-respawn", `session.post killed drivers (ps=0 @ ${marker}); respawn exec trim="42" (lazy-respawn held)`)
    : fail(
        "eval-gates-cleanup-session-post-respawn",
        `drivers died (ps=0) but respawn exec broken: output=${JSON.stringify(re.result.output.slice(0, 160))} error=${JSON.stringify(re.result.metadata["error"])}`,
      );
});

// ---------------------------------------------------------------------------
// Disk restore (LAST): remove ONLY what WE created. The suite never writes
// chain rows (tool.execute.after is never invoked), so: eval-rpc/ removed
// iff it did not pre-exist; the intel dir itself removed iff it did not
// pre-exist AND no chain file exists now (a chain file means someone else —
// e.g. a sibling suite or a pre-existing project — owns the dir).
// ---------------------------------------------------------------------------
const scCleanupDisk: Scenario = asyncScenario("eval-gates-cleanup-disk", async () => {
  if (baseSnap === null) {
    return fail("eval-gates-cleanup-disk", "no baseline snapshot — ordering defect");
  }
  const notes: string[] = [];
  if (!baseSnap.rpcExisted && existsSync(rpcDir())) {
    rmSync(rpcDir(), { recursive: true, force: true });
    notes.push("removed created eval-rpc/");
  } else if (baseSnap.rpcExisted) {
    notes.push("preserved pre-existing eval-rpc/");
  } else {
    notes.push("eval-rpc/ absent (nothing to remove)");
  }
  const chainFile = join(intelDir(), "merkle-chain.jsonl");
  if (!baseSnap.intelExisted && !existsSync(chainFile) && existsSync(intelDir())) {
    rmSync(intelDir(), { recursive: true, force: true });
    notes.push("removed created .mimocode/mimo-intel/");
  } else if (baseSnap.intelExisted) {
    notes.push("preserved pre-existing .mimocode/mimo-intel/");
  } else {
    notes.push("intel dir left: chain file present (owned by another suite)");
  }
  const gone = !existsSync(rpcDir()) || baseSnap.rpcExisted;
  return gone
    ? pass("eval-gates-cleanup-disk", notes.join(" "))
    : fail("eval-gates-cleanup-disk", `rmSync did not remove created eval-rpc/ (${notes.join(" ")})`);
});

export const scenarios: ReadonlyArray<Scenario> = [
  scG1Map,
  scG1Empty,
  scG2aMap,
  scG2bPy,
  scG2cJs,
  scG3,
  scG4,
  scCleanupPost,
  scCleanupDisk,
];

export const scenarioNames: ReadonlyArray<string> = scenarios.map((s) => s.name);
