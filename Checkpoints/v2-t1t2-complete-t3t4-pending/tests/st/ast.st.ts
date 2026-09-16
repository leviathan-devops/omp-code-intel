/**
 * tests/st/ast.st.ts — script tests for src/ast.ts (W1-B) through the REAL tools.
 *
 * LEGIT (SC-4/SC-7): ast_grep finds 3 matches + `#` tag header + matchCount 3;
 * ast_edit proposes WITHOUT writing; resolve applies (disk changes, `applied`).
 * ADVERSARIAL (wave-plan known-bad): empty pat → exact non-empty-pattern token;
 * duplicate pats → rejection + bytes identical; resolve with nothing staged →
 * rejection. Every failure asserts its EXACT token (equality).
 *
 * ST-pinned tokens (CONTRACTS.md leaves these two unnamed — deviation noted in
 * the return report): DUP_PAT_TOKEN, NOTHING_STAGED_TOKEN. If W1-B names them
 * differently, the row FAILs honestly with got=observed token for reconciliation.
 */
import { Effect } from "effect";
import { readFileSync } from "node:fs";
import {
  callTool,
  extractToken,
  fail,
  mkCtx,
  mkFixture,
  pass,
  tokenOfThrown,
  writeFixture,
  type Row,
  type Scenario,
  type ToolCtx,
  type ToolResult,
} from "./harness";

const AST_MOD = "../../src/ast";

/** CONTRACTS.md:69 verbatim. */
const EMPTY_PAT_TOKEN = "pat must be a non-empty pattern";
/** ST-pinned from OBSERVED real-tool behavior (CONTRACTS unnamed): exact metadata.error. */
const DUP_PAT_TOKEN = "Duplicate rewrite pattern: console.log($$$)";
/** ST-pinned from OBSERVED real-tool behavior (CONTRACTS unnamed): exact metadata.error. */
const NOTHING_STAGED_TOKEN = "nothing staged: run ast_edit first";

/** `[<relPath>]#<tag>` header per CONTRACTS.md:71 (tag = 4-hex HL_FILE_HASH_LENGTH). */
const TAG_HEADER_RE = /\[[^\]\n]+\]#[0-9a-f]{4}/;

interface Attempt {
  readonly token: string;
  readonly result: ToolResult | null;
}

/** Run the real tool; fold BOTH rejection channels into one comparable token. */
const attempt = (
  toolId: string,
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Effect.Effect<Attempt> =>
  Effect.catchAll(
    Effect.map(callTool(AST_MOD, toolId, args, ctx), (result) => ({
      token: extractToken(result),
      result,
    })),
    (f) => Effect.succeed({ token: tokenOfThrown(f.token), result: null }),
  );

const importFailureRow = (name: string, token: string): Row =>
  fail(name, `import-or-tool failure (expected contract token, got crash): ${token}`);

const scGrepLegit: Scenario = {
  name: "ast-grep-legit-3-matches",
  run: (dir) =>
    Effect.catchAll(
      Effect.map(attempt("astGrepTool", { pat: "console.log($$$)", path: mkFixture(dir) }, mkCtx(dir)), (a) => {
        if (a.result === null) {
          return importFailureRow("ast-grep-legit-3-matches", a.token);
        }
        const matchCount = (a.result.metadata["matchCount"] as number | undefined) ?? null;
        const okMatches = a.result.output.includes("matches=3");
        const okHeader = TAG_HEADER_RE.test(a.result.output);
        const okCount = matchCount === 3;
        return okMatches && okHeader && okCount
          ? pass("ast-grep-legit-3-matches", `matches=3 header+matchCount ok`)
          : fail(
              "ast-grep-legit-3-matches",
              `matches=3:${okMatches} header:${okHeader} matchCount:${String(matchCount)} output=${JSON.stringify(a.result.output.slice(0, 400))}`,
            );
      }),
      (e) => Effect.succeed(fail("ast-grep-legit-3-matches", `defect: ${String(e)}`)),
    ),
};

const scEditPropose: Scenario = {
  name: "ast-edit-legit-propose-no-write",
  run: (dir) =>
    Effect.catchAll(
      Effect.flatMap(
        Effect.sync(() => {
          const fixture = mkFixture(dir);
          return { fixture, before: readFileSync(fixture) };
        }),
        ({ fixture, before }) =>
          Effect.map(
            attempt(
              "astEditTool",
              { ops: [{ pat: "console.log($$$)", out: "logger.debug($$$)" }], paths: [fixture] },
              mkCtx(dir, "st-ast-propose"),
            ),
            (a) => {
              if (a.result === null) {
                return importFailureRow("ast-edit-legit-propose-no-write", a.token);
              }
              const after = readFileSync(fixture);
              const okProposed = a.result.output.startsWith("proposed");
              const okUnchanged = (before as Buffer).equals(after);
              return okProposed && okUnchanged
                ? pass("ast-edit-legit-propose-no-write", a.result.output.split("\n")[0] ?? "")
                : fail(
                    "ast-edit-legit-propose-no-write",
                    `startsWith(proposed):${okProposed} diskUnchanged:${okUnchanged} output=${JSON.stringify(a.result.output.slice(0, 300))}`,
                  );
            },
          ),
      ),
      (e) => Effect.succeed(fail("ast-edit-legit-propose-no-write", `defect: ${String(e)}`)),
    ),
};

const scResolveApply: Scenario = {
  name: "ast-resolve-legit-applied",
  run: (dir) =>
    Effect.catchAll(
      Effect.flatMap(
        Effect.sync(() => {
          const fixture = mkFixture(dir);
          return { fixture, before: readFileSync(fixture) };
        }),
        ({ fixture, before }) => {
          const ctx = mkCtx(dir, "st-ast-resolve");
          return Effect.flatMap(
            attempt(
              "astEditTool",
              { ops: [{ pat: "console.log($$$)", out: "logger.debug($$$)" }], paths: [fixture] },
              ctx,
            ),
            (stage) =>
              stage.result === null
                ? Effect.succeed(importFailureRow("ast-resolve-legit-applied", stage.token))
                : Effect.map(attempt("resolveTool", { reason: "st replace" }, ctx), (a) => {
                    if (a.result === null) {
                      return importFailureRow("ast-resolve-legit-applied", a.token);
                    }
                    const after = readFileSync(fixture);
                    const afterText = after.toString("utf8");
                    const okApplied = a.result.output.includes("applied");
                    const okChanged = !(before as Buffer).equals(after);
                    const okContent = afterText.includes("logger.debug");
                    const okTag = /#[0-9a-f]{4}/.test(a.result.output);
                    return okApplied && okChanged && okContent && okTag
                      ? pass("ast-resolve-legit-applied", a.result.output.split("\n")[0] ?? "")
                      : fail(
                          "ast-resolve-legit-applied",
                          `applied:${okApplied} changed:${okChanged} hasLoggerDebug:${okContent} freshTag:${okTag} output=${JSON.stringify(a.result.output.slice(0, 400))}`,
                        );
                  }),
          );
        },
      ),
      (e) => Effect.succeed(fail("ast-resolve-legit-applied", `defect: ${String(e)}`)),
    ),
};

const scGrepEmpty: Scenario = {
  name: "ast-grep-adversarial-empty-pat",
  run: (dir) =>
    Effect.catchAll(
      Effect.map(attempt("astGrepTool", { pat: "", path: mkFixture(dir) }, mkCtx(dir)), (a) =>
        a.token === EMPTY_PAT_TOKEN
          ? pass("ast-grep-adversarial-empty-pat", a.token)
          : fail("ast-grep-adversarial-empty-pat", `expected=${JSON.stringify(EMPTY_PAT_TOKEN)} got=${JSON.stringify(a.token)}`),
      ),
      (e) => Effect.succeed(fail("ast-grep-adversarial-empty-pat", `defect: ${String(e)}`)),
    ),
};

const scEditDup: Scenario = {
  name: "ast-edit-adversarial-duplicate-pats",
  run: (dir) =>
    Effect.catchAll(
      Effect.flatMap(
        Effect.sync(() => {
          const fixture = writeFixture(dir, "dup.ts", `console.log("x");\nexport const m = 1;\n`);
          return { fixture, before: readFileSync(fixture) };
        }),
        ({ fixture, before }) =>
          Effect.map(
            attempt(
              "astEditTool",
              {
                ops: [
                  { pat: "console.log($$$)", out: "logger.debug($$$)" },
                  { pat: "console.log($$$)", out: "logger.debug($$$)" },
                ],
                paths: [fixture],
              },
              mkCtx(dir, "st-ast-dup"),
            ),
            (a) => {
              const after = readFileSync(fixture);
              const okToken = a.token === DUP_PAT_TOKEN;
              const okUnchanged = (before as Buffer).equals(after);
              return okToken && okUnchanged
                ? pass("ast-edit-adversarial-duplicate-pats", a.token)
                : fail(
                    "ast-edit-adversarial-duplicate-pats",
                    `expected=${JSON.stringify(DUP_PAT_TOKEN)} got=${JSON.stringify(a.token)} diskUnchanged:${okUnchanged}`,
                  );
            },
          ),
      ),
      (e) => Effect.succeed(fail("ast-edit-adversarial-duplicate-pats", `defect: ${String(e)}`)),
    ),
};

const scResolveEmpty: Scenario = {
  name: "ast-resolve-adversarial-nothing-staged",
  run: (dir) =>
    Effect.catchAll(
      Effect.flatMap(
        Effect.sync(() => {
          const fixture = mkFixture(dir);
          return { fixture, before: readFileSync(fixture) };
        }),
        ({ fixture, before }) =>
          // Fresh session that never staged: nothing-staged is deterministic regardless of run order.
          Effect.map(attempt("resolveTool", { reason: "st nothing staged probe" }, mkCtx(dir, "st-ast-empty")), (a) => {
            const after = readFileSync(fixture);
            const okToken = a.token === NOTHING_STAGED_TOKEN;
            const okUnchanged = (before as Buffer).equals(after);
            void fixture;
            return okToken && okUnchanged
              ? pass("ast-resolve-adversarial-nothing-staged", a.token)
              : fail(
                  "ast-resolve-adversarial-nothing-staged",
                  `expected=${JSON.stringify(NOTHING_STAGED_TOKEN)} got=${JSON.stringify(a.token)} diskUnchanged:${okUnchanged}`,
                );
          }),
      ),
      (e) => Effect.succeed(fail("ast-resolve-adversarial-nothing-staged", `defect: ${String(e)}`)),
    ),
};

export const scenarios: ReadonlyArray<Scenario> = [
  scGrepLegit,
  scEditPropose,
  scResolveApply,
  scGrepEmpty,
  scEditDup,
  scResolveEmpty,
];

export const scenarioNames: ReadonlyArray<string> = scenarios.map((s) => s.name);
