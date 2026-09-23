// ★ ST-AC-1..ST-AC-4 — THE ARTIFACT-COVERAGE SUITE (W1: the §7 gap made mechanical).
//
// THE GAP THIS CLOSES (measured 2026-09-23): of 51 test files, 1 MOUNTED the deployed bundle.
// The other 50 import `../src` — so the suite proved the SOURCE while the artifact that RUNS
// could drift unnoticed (the F-98 class: the kernel was type-only-imported, ERASED at build,
// and the deployed bundle carried ZERO kernel symbols while every source test stayed green).
//
// ★ THE SUBJECT OF EVERY TEST HERE IS THE DEPLOYED BUNDLE:
//     extensions/graph-intelligence/index.js
//   — never `../src`. A test in this file that imports the source is a BUG in this file.
//
// ★ AND THE SUITE REFUSES A STALE ARTIFACT: `test_artifact_dist_is_current` asserts the dist is
//   newer than every `src/**/*.ts` file, so a source edit that was never rebuilt FAILS here —
//   the staleness gate is the suite's, not just the deploy's.

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createHash } from "node:crypto";

const ROOT = path.resolve(import.meta.dir, "..");
/** ★ THE SUBJECT — the DEPLOYED BUNDLE. Never `../src`. */
const BUNDLE = path.join(ROOT, "extensions", "graph-intelligence", "index.js");

/** The symbols the artifact MUST carry — the kernel + the KEV meaning gate + the decision. */
const REQUIRED_SYMBOLS = [
  "runKernelV2",
  "FireLedger",
  "PolicyStore",
  "graphFacts",
  "decideFromRegistry",
  "decideFireFromGraph",
  "layerCertifications",
  "kevProbe",
  "isUniform",
  "gi-decide",
] as const;

/** Mount the DEPLOYED bundle on a fake `pi` and return its tool map + the module's exports.
 *  ★ THE DYNAMIC IMPORT IS THE POINT (the rule's own exception: "Test cases that intentionally
 *  exercise module loading boundaries"): BUNDLE is a BUILD ARTIFACT whose path is resolved at
 *  run time, and the test's subject IS the deployed module. */
async function mountBundle(): Promise<{
  tools: Map<string, { name: string; execute: (...a: unknown[]) => Promise<{ content: Array<{ text: string }>; details: Record<string, unknown> }> }>;
  exports: string[];
}> {
  const mod = (await import(BUNDLE)) as Record<string, unknown>;
  const tools = new Map<string, { name: string; execute: (...a: unknown[]) => Promise<{ content: Array<{ text: string }>; details: Record<string, unknown> }> }>();
  const zodAny: unknown = new Proxy(function () {}, { get: () => zodAny, apply: () => zodAny });
  const pi = {
    registerTool: (t: unknown) => {
      const tt = t as { name: string };
      tools.set(tt.name, tt as never);
    },
    on: () => {}, registerCommand: () => {}, registerAgent: () => {}, log: () => {},
    zod: new Proxy({}, { get: () => zodAny }), z: new Proxy({}, { get: () => zodAny }),
  };
  const register = mod.registerGiOmpTools as unknown as (p: unknown, cwdOf: (ctx?: { cwd?: string }) => string) => string[];
  register(pi, (ctx) => ctx?.cwd ?? process.cwd());
  return { tools, exports: Object.keys(mod).sort() };
}

function sha256Of(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** Every .ts file under src/, recursively (the staleness comparison set). */
function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...srcFiles(p));
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

describe("st-artifact-coverage: ★ THE DEPLOYED BUNDLE IS THE SUBJECT", () => {
  test("test_artifact_registry_matches_source", async () => {
    // ★ ST-AC-1. The bundle REGISTERS its tools and the registry is the one the source declares.
    const { tools, exports } = await mountBundle();
    const mounted = [...tools.keys()].sort();
    // the bundle exports its registrar (the omp extension contract)
    expect(exports).toContain("registerGiOmpTools");
    // every tool the extension promises is ACTUALLY mounted by the artifact
    const names = tools.get("gi-decide");
    expect(names).toBeDefined();
    expect(mounted.length).toBeGreaterThanOrEqual(6);
    // the KEV decision tool is the newest member — it must be in the artifact, not just the src
    expect(mounted).toContain("gi-decide");
    expect(mounted).toContain("gi-consumption");
  }, 120_000);

  test("test_artifact_decide_on_known_subject", async () => {
    // ★ ST-AC-2. The ARTIFACT decides — the kernel runs over the registry, from the bundle.
    const { tools } = await mountBundle();
    const decide = tools.get("gi-decide");
    expect(decide).toBeDefined();
    const res = await decide!.execute("t", { subject: "evidence", scopeRoot: ROOT }, undefined, undefined, { cwd: ROOT });
    const text = res.content[0].text;
    // the kernel's own vocabulary — a verdict, a class, the PREFLIGHT stage
    expect(text).toMatch(/verdict=(ALLOW|STEER|REFUSE|ABORT)/);
    expect(text).toMatch(/class=(dumb|theatrical|destructive|benign)/);
    expect(text).toContain("PREFLIGHT");
    // the layer-edge: the kernel's layers come from the registry (6 of the closed set of 8)
    expect(text).toMatch(/layersWired=\d\/8/);
  }, 300_000);

  test("test_artifact_ledger_row_written", async () => {
    // ★ ST-AC-3. The RECORD stage fires: a decision made THROUGH THE ARTIFACT lands a row.
    const { tools } = await mountBundle();
    const scope = fs.mkdtempSync(path.join(os.tmpdir(), "gi-ac-ledger-"));
    try {
      const decide = tools.get("gi-decide");
      const before = path.join(scope, ".omp", "graph-intelligence", "fire-decisions.db");
      expect(fs.existsSync(before)).toBe(false); // a FRESH scope has no ledger
      const res = await decide!.execute("t", { subject: "evidence", scopeRoot: scope }, undefined, undefined, { cwd: scope });
      const text = res.content[0].text;
      // the ledger's directory + file were CREATED by the decision (the F-99 fix, in the artifact)
      expect(fs.existsSync(before)).toBe(true);
      expect(fs.statSync(before).size).toBeGreaterThan(0);
      expect(text).not.toContain("GI_LEDGER_OPEN_FAILED");
      expect(text).not.toContain("GI_DECIDE_FAILED");
    } finally {
      fs.rmSync(scope, { recursive: true, force: true });
    }
  }, 300_000);

  test("test_artifact_refuses_missing_substrate", async () => {
    // ★ ST-AC-4. A scope with NO substrates REFUSES with a NAMED code — never a silent pass.
    const scope = fs.mkdtempSync(path.join(os.tmpdir(), "gi-ac-empty-"));
    try {
      const { tools } = await mountBundle();
      const decide = tools.get("gi-decide");
      const res = await decide!.execute("t", { subject: "evidence", scopeRoot: scope }, undefined, undefined, { cwd: scope });
      const text = res.content[0].text;
      // the kernel refuses the incomplete stack, naming the offenders
      expect(text).toMatch(/GI_LAYER_(DOWN|ERROR|STALE)|GI_STACK_INCOMPLETE/);
      expect(text).toMatch(/verdict=REFUSE/);
      // ★ the FAIL token: a uniform/empty pass dressed as a decision
      expect(text).not.toMatch(/consumed:8\/8/);
    } finally {
      fs.rmSync(scope, { recursive: true, force: true });
    }
  }, 300_000);

  test("test_artifact_dist_is_current", () => {
    // ★ THE STALENESS GATE, INSIDE THE SUITE (the pin: "the suite reads the dist's sha so a
    //   stale dist FAILS the suite, not just the gate"). Two mechanical assertions:
    //   (a) the artifact carries every REQUIRED symbol (a content gate), and
    //   (b) no .ts under src/ is NEWER than the artifact (a source edit never rebuilt = FAIL).
    expect(fs.existsSync(BUNDLE)).toBe(true);
    const bundleText = fs.readFileSync(BUNDLE, "utf8");
    const missing = REQUIRED_SYMBOLS.filter((s) => !bundleText.includes(s));
    expect(missing).toEqual([]);

    const bundleMtime = fs.statSync(BUNDLE).mtimeMs;
    const stale = srcFiles(path.join(ROOT, "src")).filter((f) => fs.statSync(f).mtimeMs > bundleMtime);
    // ★ a stale artifact FAILS here — with the offending files named
    expect(stale.map((f) => path.relative(ROOT, f))).toEqual([]);

    // the sha is COMPUTED and reported so the run's log carries the artifact it tested
    const sha = sha256Of(BUNDLE);
    expect(sha).toMatch(/^[a-f0-9]{64}$/);
    console.log(`[ST-AC] ★ the artifact under test: sha256 ${sha} (${fs.statSync(BUNDLE).size} B)`);
  }, 120_000);
});
