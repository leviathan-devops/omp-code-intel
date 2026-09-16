/**
 * tests/st/merkle.st.ts — script tests for src/merkle.ts + src/evidence.ts (W2-D)
 * through the REAL modules. Mode B: observation channels are file bytes
 * (readFileSync on the chain file) + returned output/metadata ONLY. No mocks
 * of merkle/evidence anywhere; every failure asserts a VALUE (verify === false),
 * never "it threw".
 *
 * CONTRACTS (CONTRACTS-W2.md + DPL1 §6/§11):
 *  - LEGIT (SC-8): 3 records → `<base>/merkle-chain.jsonl` holds exactly 3
 *    non-empty lines, chainLength() === 3, verify() === true; the evidence tool
 *    executed with a W1-style ctx (directory = sandbox) returns output
 *    containing `chain=3` AND `integrity=true` with metadata.integrity === true.
 *  - ADVERSARIAL (SC-9): delete the MIDDLE jsonl line → a NEW pipeline instance
 *    loadChain + verify() === false; tamper a hash value in line 3 → false;
 *    empty base (no chain file) → chainLength() === 0 AND verify() === false
 *    (SPEC-named ported semantics: verify of an empty chain is false).
 *
 * BASE LAYOUT ASSUMPTION (pinned, reconciles with W2-A on mismatch): the spec
 * (§0 decisions + §8 SC-8) fixes the canonical chain at
 * `.mimocode/mimo-intel/merkle-chain.jsonl`, and CONTRACTS-W2 fixes the
 * pipeline default base to ".mimocode/mimo-intel". Every scenario therefore uses
 * base = join(sandbox, ".mimocode", "mimo-intel") and reads
 * join(base, "merkle-chain.jsonl"). The evidence tool is called with
 * ctx.directory = sandbox, so a conforming W2-A evidence implementation
 * resolves the same subpath. If W2-A resolves elsewhere, the evidence row
 * FAILs honestly with got=observed output for reconciliation — never a pass.
 *
 * IMPORT TOLERANCE (adapter, not mock — the modules under test are always the
 * real src files): the mission names a `newPipeline` factory while CONTRACTS-W2
 * names `class EvidencePipeline`; the loader prefers `newPipeline`, then
 * `EvidencePipeline`, then a default export (construct-or-call). The evidence
 * tool id is `evidenceTool` per the DPL1 module table; if that id is absent but
 * the module exports another object with an `execute` function, the scan
 * fallback uses it and names the substitution in the row. A genuinely missing
 * src/merkle.ts (W2-A mid-flight) becomes an honest import-failure FAIL row.
 *
 * TAMPER RATIONALE: line 3's `previousHash` IS a hash value in line 3, and
 * breaking it defeats EVERY conforming verify() — a link-walk sees
 * prev !== line2.hash, and a recompute sees the stored node hash mismatch the
 * tampered preimage — so the tamper row is deterministic, not impl-coupled.
 */
import { Effect } from "effect";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  callTool,
  extractToken,
  fail,
  mkCtx,
  pass,
  TagFailure,
  tokenOfThrown,
  type Row,
  type Scenario,
  type ToolCtx,
  type ToolResult,
} from "./harness";

const MERKLE_MOD = "../../src/merkle";
const EVIDENCE_MOD = "../../src/evidence";
const CHAIN_FILE = "merkle-chain.jsonl";

/** Canonical base inside the sandbox (spec §0/SC-8 layout). */
const baseOf = (dir: string): string => join(dir, ".mimocode", "mimo-intel");
const fileOf = (base: string): string => join(base, CHAIN_FILE);

/** Structural view of the real pipeline — sync or async methods both awaited. */
interface Pipeline {
  readonly record: (tool: string, data: unknown, passed: boolean) => unknown;
  readonly chainLength: () => unknown;
  readonly verify: () => unknown;
  readonly loadChain?: () => unknown;
}

/**
 * Load the REAL src/merkle.ts and construct a pipeline on base. Adapter order:
 * newPipeline (mission-named) → EvidencePipeline (CONTRACTS-W2-named) →
 * default export (construct-or-call). Any failure is a string on the error
 * channel, never a throw past the scenario boundary.
 */
const loadPipeline = (base: string): Effect.Effect<Pipeline, string> =>
  Effect.tryPromise({
    try: async (): Promise<Pipeline> => {
      const mod: Record<string, unknown> = await import(MERKLE_MOD);
      const factory = mod["newPipeline"];
      if (typeof factory === "function") {
        return (factory as (b: string) => Pipeline)(base);
      }
      const ctor = mod["EvidencePipeline"] ?? mod["default"];
      if (typeof ctor === "function") {
        try {
          return new (ctor as new (b: string) => Pipeline)(base);
        } catch {
          return (ctor as (b: string) => Pipeline)(base);
        }
      }
      throw new Error(
        `merkle module exports lack newPipeline/EvidencePipeline (keys: ${Object.keys(mod).join(",")})`,
      );
    },
    catch: (e) =>
      `import-or-construct failure (expected pipeline on ${base}, got crash): ${e instanceof Error ? e.message : String(e)}`,
  });

/** Fresh instance on an existing base; calls loadChain() when the impl has it. */
const freshPipe = (base: string): Effect.Effect<Pipeline, string> =>
  Effect.flatMap(loadPipeline(base), (p) =>
    Effect.tryPromise({
      try: async (): Promise<Pipeline> => {
        if (typeof p.loadChain === "function") {
          await p.loadChain();
        }
        return p;
      },
      catch: (e) => `loadChain defect: ${e instanceof Error ? e.message : String(e)}`,
    }),
  );

/** The 3 RECORD calls every populated scenario starts from (SC-8 shape). */
const recordThree = (p: Pipeline): Effect.Effect<void, string> =>
  Effect.tryPromise({
    try: async (): Promise<void> => {
      await p.record("edit", { path: "a.ts", op: "insert" }, true);
      await p.record("write", { path: "b.ts" }, true);
      await p.record("edit", { path: "c.ts", op: "delete" }, true);
    },
    catch: (e) => `record defect: ${e instanceof Error ? e.message : String(e)}`,
  });

/** Disk + pipeline facts in one observation: non-empty line count, chainLength, verify. */
interface Facts {
  readonly lines: number;
  readonly length: number;
  readonly valid: boolean;
}

const observe = (p: Pipeline, file: string): Effect.Effect<Facts, string> =>
  Effect.tryPromise({
    try: async (): Promise<Facts> => {
      const lines = readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => l.length > 0);
      const length = Number(await p.chainLength());
      const valid = (await p.verify()) === true;
      return { lines: lines.length, length, valid };
    },
    catch: (e) => `observe defect: ${e instanceof Error ? e.message : String(e)}`,
  });

/** Rewrite the chain file with exactly the given rows (adversarial mutations). */
const rewriteChain = (file: string, rows: ReadonlyArray<string>): Effect.Effect<void, string> =>
  Effect.tryPromise({
    try: async (): Promise<void> => {
      writeFileSync(file, `${rows.join("\n")}\n`);
    },
    catch: (e) => `rewrite defect (${file}): ${e instanceof Error ? e.message : String(e)}`,
  });

interface Attempt {
  readonly token: string;
  readonly result: ToolResult | null;
}

/** Run the REAL evidence tool by exact contract id. */
const attemptId = (toolId: string, ctx: ToolCtx): Effect.Effect<Attempt, never> =>
  Effect.catchAll(
    Effect.map(callTool(EVIDENCE_MOD, toolId, {}, ctx), (result) => ({
      token: extractToken(result),
      result,
    })),
    (f) => Effect.succeed({ token: tokenOfThrown(f.token), result: null }),
  );

/**
 * Fallback: first module export carrying an `execute` function. Used ONLY when
 * the `evidenceTool` id is absent (wrong-id signal), never to mask a missing
 * module — a missing module fails identically on both paths.
 */
const attemptScan = (ctx: ToolCtx): Effect.Effect<Attempt, never> =>
  Effect.catchAll(
    Effect.map(
      Effect.tryPromise({
        try: async (): Promise<ToolResult> => {
          const loaded: Record<string, unknown> = await import(EVIDENCE_MOD);
          const cand = Object.values(loaded).find(
            (v) => !!v && typeof (v as { execute?: unknown }).execute === "function",
          ) as { execute: (a: unknown, c: unknown) => Promise<unknown> } | undefined;
          if (!cand) {
            throw new Error(
              `evidence module exports lack an execute tool (keys: ${Object.keys(loaded).join(",")})`,
            );
          }
          const raw: unknown = await cand.execute({}, ctx);
          if (typeof raw === "string") {
            return { output: raw, metadata: {} };
          }
          const obj = raw as { output?: unknown; metadata?: unknown };
          return {
            output: String(obj.output ?? ""),
            metadata: (obj.metadata ?? {}) as Record<string, unknown>,
          };
        },
        catch: (e) => new TagFailure(e instanceof Error ? e.message : String(e), String(e)),
      }),
      (result) => ({ token: extractToken(result), result }),
    ),
    (f) => Effect.succeed({ token: tokenOfThrown(f.token), result: null }),
  );

const attemptEvidence = (ctx: ToolCtx): Effect.Effect<Attempt, never> =>
  Effect.flatMap(attemptId("evidenceTool", ctx), (a) =>
    a.result !== null || !a.token.includes("missing execute") ? Effect.succeed(a) : attemptScan(ctx),
  );

/** Scenario wrapper: body errors are already full messages; collapse to a row. */
const define = (name: string, body: (dir: string) => Effect.Effect<Row, string>): Scenario => ({
  name,
  run: (dir) => Effect.catchAll(body(dir), (msg) => Effect.succeed(fail(name, msg))),
});

const scLegitChain: Scenario = define("merkle-legit-3-records-chain", (dir) => {
  const base = baseOf(dir);
  const file = fileOf(base);
  return Effect.flatMap(loadPipeline(base), (p) =>
    Effect.flatMap(recordThree(p), () =>
      Effect.map(observe(p, file), (f) =>
        f.lines === 3 && f.length === 3 && f.valid === true
          ? pass("merkle-legit-3-records-chain", `lines=3 chainLength=3 verify=true`)
          : fail(
              "merkle-legit-3-records-chain",
              `lines=${f.lines} chainLength=${f.length} verify=${f.valid} (expected 3/3/true)`,
            ),
      ),
    ),
  );
});

const scLegitEvidence: Scenario = define("merkle-legit-evidence-tool-chain-3", (dir) => {
  const base = baseOf(dir);
  return Effect.flatMap(loadPipeline(base), (p) =>
    Effect.flatMap(recordThree(p), () =>
      Effect.map(attemptEvidence(mkCtx(dir)), (a) => {
        if (a.result === null) {
          return fail("merkle-legit-evidence-tool-chain-3", `import-or-tool failure: ${a.token}`);
        }
        const out = a.result.output;
        const md = a.result.metadata;
        const okChain = out.includes("chain=3");
        const okInteg = out.includes("integrity=true");
        const okMetaInteg = md["integrity"] === true;
        const okMetaLen = (md["chainLength"] as unknown) === 3;
        return okChain && okInteg && okMetaInteg && okMetaLen
          ? pass("merkle-legit-evidence-tool-chain-3", `chain=3 integrity=true metadata ok`)
          : fail(
              "merkle-legit-evidence-tool-chain-3",
              `chain=3:${okChain} integrity=true:${okInteg} meta.integrity:${okMetaInteg} meta.chainLength:${okMetaLen} output=${JSON.stringify(out.slice(0, 300))} metadata=${JSON.stringify(md)}`,
            );
      }),
    ),
  );
});

const scLegitReload: Scenario = define("merkle-legit-reload-persistence", (dir) => {
  const base = baseOf(dir);
  const file = fileOf(base);
  return Effect.flatMap(loadPipeline(base), (p) =>
    Effect.flatMap(recordThree(p), () =>
      Effect.flatMap(freshPipe(base), (p2) =>
        Effect.map(observe(p2, file), (f) =>
          f.lines === 3 && f.length === 3 && f.valid === true
            ? pass("merkle-legit-reload-persistence", `fresh instance: lines=3 chainLength=3 verify=true`)
            : fail(
                "merkle-legit-reload-persistence",
                `fresh instance: lines=${f.lines} chainLength=${f.length} verify=${f.valid} (expected 3/3/true)`,
              ),
        ),
      ),
    ),
  );
});

const scDropMiddle: Scenario = define("merkle-adversarial-drop-middle-row", (dir) => {
  const base = baseOf(dir);
  const file = fileOf(base);
  return Effect.flatMap(loadPipeline(base), (p) =>
    Effect.flatMap(recordThree(p), () =>
      Effect.flatMap(
        Effect.tryPromise({
          try: async (): Promise<ReadonlyArray<string>> => {
            const rows = readFileSync(file, "utf8")
              .split("\n")
              .filter((l) => l.length > 0);
            if (rows.length !== 3) {
              throw new Error(`precondition: expected 3 chain lines, got ${rows.length}`);
            }
            return [rows[0] as string, rows[2] as string];
          },
          catch: (e) => `precondition defect: ${e instanceof Error ? e.message : String(e)}`,
        }),
        (kept) =>
          Effect.flatMap(rewriteChain(file, kept), () =>
            Effect.flatMap(freshPipe(base), (p2) =>
              Effect.tryPromise({
                try: async (): Promise<Row> => {
                  const v = (await p2.verify()) === true;
                  return v === false
                    ? pass("merkle-adversarial-drop-middle-row", `verify=false after middle-row deletion`)
                    : fail(
                        "merkle-adversarial-drop-middle-row",
                        `verify=${v} (expected false after middle-row deletion)`,
                      );
                },
                catch: (e) =>
                  `verify defect: ${e instanceof Error ? e.message : String(e)}`,
              }),
            ),
          ),
      ),
    ),
  );
});

const scTamperHash: Scenario = define("merkle-adversarial-tamper-hash", (dir) => {
  const base = baseOf(dir);
  const file = fileOf(base);
  return Effect.flatMap(loadPipeline(base), (p) =>
    Effect.flatMap(recordThree(p), () =>
      Effect.flatMap(
        Effect.tryPromise({
          try: async (): Promise<ReadonlyArray<string>> => {
            const rows = readFileSync(file, "utf8")
              .split("\n")
              .filter((l) => l.length > 0);
            if (rows.length !== 3) {
              throw new Error(`precondition: expected 3 chain lines, got ${rows.length}`);
            }
            const row = JSON.parse(rows[2] as string) as Record<string, unknown>;
            const prev = row["previousHash"];
            if (typeof prev !== "string" || prev.length === 0) {
              throw new Error(
                `precondition: line 3 previousHash missing (keys: ${Object.keys(row).join(",")})`,
              );
            }
            row["previousHash"] = `${prev}_tampered`;
            const out = [...rows];
            out[2] = JSON.stringify(row);
            return out;
          },
          catch: (e) => `precondition defect: ${e instanceof Error ? e.message : String(e)}`,
        }),
        (tampered) =>
          Effect.flatMap(rewriteChain(file, tampered), () =>
            Effect.flatMap(freshPipe(base), (p2) =>
              Effect.tryPromise({
                try: async (): Promise<Row> => {
                  const v = (await p2.verify()) === true;
                  return v === false
                    ? pass("merkle-adversarial-tamper-hash", `verify=false after line-3 previousHash tamper`)
                    : fail(
                        "merkle-adversarial-tamper-hash",
                        `verify=${v} (expected false after line-3 previousHash tamper)`,
                      );
                },
                catch: (e) =>
                  `verify defect: ${e instanceof Error ? e.message : String(e)}`,
              }),
            ),
          ),
      ),
    ),
  );
});

const scEmptyBase: Scenario = define("merkle-adversarial-empty-base", (dir) => {
  const base = baseOf(dir);
  const file = fileOf(base);
  // NOTE: plain construction, no loadChain — the contract names chainLength +
  // verify on an empty base; nothing is ever recorded and no file is created.
  return Effect.flatMap(loadPipeline(base), (p) =>
    Effect.tryPromise({
      try: async (): Promise<Row> => {
        const fileExists = existsSync(file);
        const n = Number(await p.chainLength());
        const v = (await p.verify()) === true;
        return n === 0 && v === false
          ? pass("merkle-adversarial-empty-base", `chainLength=0 verify=false (no chain file)`)
          : fail(
              "merkle-adversarial-empty-base",
              `chainLength=${n} verify=${v} fileExists=${fileExists} (expected 0/false)`,
            );
      },
      catch: (e) => `observe defect: ${e instanceof Error ? e.message : String(e)}`,
    }),
  );
});

export const scenarios: ReadonlyArray<Scenario> = [
  scLegitChain,
  scLegitEvidence,
  scLegitReload,
  scDropMiddle,
  scTamperHash,
  scEmptyBase,
];

export const scenarioNames: ReadonlyArray<string> = scenarios.map((s) => s.name);
