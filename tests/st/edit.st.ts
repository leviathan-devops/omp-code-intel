/**
 * tests/st/edit.st.ts — script tests for src/edit.ts (W1-C, mimo_edit) through the REAL tools.
 *
 * Snapshots come from the REAL ast_grep (src/ast.ts, W1-B): the tag is parsed
 * from the `[path]#tag` header, then fed to the REAL mimo_edit (src/edit.ts).
 *
 * LEGIT (SC-5): valid tag+hunk → `applied` in output, disk line 2 replaced,
 * new tag !== old. Reusing the old tag → exact STALE_ANCHOR + bytes identical.
 * ADVERSARIAL (SC-6/wave-plan known-bad): no snapshot → READ_FIRST + unchanged;
 * wrong hunk.old → ANCHOR_MISMATCH + unchanged; out-of-band tamper then old
 * tag → STALE_ANCHOR + tampered bytes preserved (guard neither reverted nor
 * mutated). Every failure asserts its EXACT token (equality).
 *
 * All tokens below are CONTRACTS.md:20-22 + src/edit.ts algorithm verbatim.
 */
import { Effect } from "effect";
import { readFileSync, writeFileSync } from "node:fs";
import {
  callTool,
  extractToken,
  fail,
  mkCtx,
  pass,
  tokenOfThrown,
  writeFixture,
  type Row,
  type Scenario,
  type ToolCtx,
  type ToolResult,
} from "./harness";

const AST_MOD = "../../src/ast";
const EDIT_MOD = "../../src/edit";

const STALE_ANCHOR = "STALE_ANCHOR";
const ANCHOR_MISMATCH = "ANCHOR_MISMATCH";
const READ_FIRST = "READ_FIRST";

/** `[<relPath>]#<tag>` header per CONTRACTS.md:71 (tag = 4-hex). */
const TAG_HEADER_RE = /\[([^\]\n]+)\]#([0-9a-f]{4})/;

/** Real 4-line TS fixture (valid syntax so ast patterns parse against it). */
const FOUR_LINES = `export const alpha = "one";\nexport const beta = "two";\nexport const gamma = "three";\nexport const delta = "four";\n`;
const LINE2_OLD = `export const beta = "two";`;

interface Attempt {
  readonly token: string;
  readonly result: ToolResult | null;
}

const attempt = (
  mod: string,
  toolId: string,
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Effect.Effect<Attempt> =>
  Effect.catchAll(
    Effect.map(callTool(mod, toolId, args, ctx), (result) => ({
      token: extractToken(result),
      result,
    })),
    (f) => Effect.succeed({ token: tokenOfThrown(f.token), result: null }),
  );

const importFailureRow = (name: string, token: string): Row =>
  fail(name, `import-or-tool failure (expected contract token, got crash): ${token}`);

/** Snapshot via real ast_grep; parse the tag from the `[path]#tag` header. */
const snapshot = (
  fixture: string,
  ctx: ToolCtx,
): Effect.Effect<{ tag: string } | { failure: Row }> =>
  Effect.map(attempt(AST_MOD, "astGrepTool", { pat: "export const $A = $B", path: fixture }, ctx), (a) => {
    if (a.result === null) {
      return { failure: importFailureRow("snapshot", a.token) };
    }
    const m = TAG_HEADER_RE.exec(a.result.output);
    if (!m || !m[2]) {
      return {
        failure: fail("snapshot", `no [path]#tag header in ast_grep output: ${JSON.stringify(a.result.output.slice(0, 300))}`),
      };
    }
    return { tag: m[2] };
  });

const lineAt = (abs: string, line1: number): string =>
  readFileSync(abs, "utf8").split("\n")[line1 - 1] ?? "";

const scApplyRetag: Scenario = {
  name: "edit-legit-apply-retag",
  run: (dir) =>
    Effect.catchAll(
      Effect.flatMap(
        Effect.sync(() => writeFixture(dir, "target.ts", FOUR_LINES)),
        (fixture) => {
          const ctx = mkCtx(dir, "st-edit-apply");
          return Effect.flatMap(snapshot(fixture, ctx), (snap) => {
            if ("failure" in snap) {
              return Effect.succeed({ ...snap.failure, name: "edit-legit-apply-retag" });
            }
            return Effect.map(
              attempt(
                EDIT_MOD,
                "mimoEditTool",
                { file_path: fixture, tag: snap.tag, hunks: [{ line: 2, old: LINE2_OLD, new: "REPLACED" }] },
                ctx,
              ),
              (a) => {
                if (a.result === null) {
                  return importFailureRow("edit-legit-apply-retag", a.token);
                }
                const newTag =
                  typeof a.result.metadata["tag"] === "string"
                    ? (a.result.metadata["tag"] as string)
                    : (TAG_HEADER_RE.exec(a.result.output)?.[2] ?? "");
                const okApplied = a.result.output.includes("applied");
                const okLine = lineAt(fixture, 2) === "REPLACED";
                const okRetag = newTag.length === 4 && newTag !== snap.tag;
                return okApplied && okLine && okRetag
                  ? pass("edit-legit-apply-retag", `tag ${snap.tag} -> ${newTag}`)
                  : fail(
                      "edit-legit-apply-retag",
                      `applied:${okApplied} line2:${JSON.stringify(lineAt(fixture, 2))} newTag:${JSON.stringify(newTag)} oldTag:${snap.tag} output=${JSON.stringify(a.result.output.slice(0, 300))}`,
                    );
              },
            );
          });
        },
      ),
      (e) => Effect.succeed(fail("edit-legit-apply-retag", `defect: ${String(e)}`)),
    ),
};

const scStaleReuse: Scenario = {
  name: "edit-stale-tag-rejected",
  run: (dir) =>
    Effect.catchAll(
      Effect.flatMap(
        Effect.sync(() => writeFixture(dir, "target.ts", FOUR_LINES)),
        (fixture) => {
          const ctx = mkCtx(dir, "st-edit-stale");
          return Effect.flatMap(snapshot(fixture, ctx), (snap) => {
            if ("failure" in snap) {
              return Effect.succeed({ ...snap.failure, name: "edit-stale-tag-rejected" });
            }
            const oldTag = snap.tag;
            return Effect.flatMap(
              attempt(
                EDIT_MOD,
                "mimoEditTool",
                { file_path: fixture, tag: oldTag, hunks: [{ line: 2, old: LINE2_OLD, new: "REPLACED" }] },
                ctx,
              ),
              (first) => {
                if (first.result === null || !first.result.output.includes("applied")) {
                  return Effect.succeed(
                    first.result === null
                      ? importFailureRow("edit-stale-tag-rejected", first.token)
                      : fail("edit-stale-tag-rejected", `setup apply failed: ${JSON.stringify(first.result.output.slice(0, 200))}`),
                  );
                }
                const appliedBytes = readFileSync(fixture);
                return Effect.map(
                  attempt(
                    EDIT_MOD,
                    "mimoEditTool",
                    { file_path: fixture, tag: oldTag, hunks: [{ line: 3, old: `export const gamma = "three";`, new: "SHOULD_NOT_APPLY" }] },
                    ctx,
                  ),
                  (a) => {
                    const after = readFileSync(fixture);
                    const okToken = a.token === STALE_ANCHOR;
                    const okIdentical = (appliedBytes as Buffer).equals(after);
                    return okToken && okIdentical
                      ? pass("edit-stale-tag-rejected", a.token)
                      : fail(
                          "edit-stale-tag-rejected",
                          `expected=${STALE_ANCHOR} got=${JSON.stringify(a.token)} diskIdentical:${okIdentical}`,
                        );
                  },
                );
              },
            );
          });
        },
      ),
      (e) => Effect.succeed(fail("edit-stale-tag-rejected", `defect: ${String(e)}`)),
    ),
};

const scReadFirst: Scenario = {
  name: "edit-adversarial-no-snapshot-read-first",
  run: (dir) =>
    Effect.catchAll(
      Effect.flatMap(
        Effect.sync(() => {
          const fixture = writeFixture(dir, "fresh.ts", FOUR_LINES);
          return { fixture, before: readFileSync(fixture) };
        }),
        ({ fixture, before }) =>
          // No prior snapshot for this abs path (fresh sandbox): store.get → undefined.
          Effect.map(
            attempt(
              EDIT_MOD,
              "mimoEditTool",
              { file_path: fixture, tag: "abcd", hunks: [{ line: 1, old: `export const alpha = "one";`, new: "SHOULD_NOT_APPLY" }] },
              mkCtx(dir, "st-edit-readfirst"),
            ),
            (a) => {
              const after = readFileSync(fixture);
              const okToken = a.token === READ_FIRST;
              const okUnchanged = (before as Buffer).equals(after);
              return okToken && okUnchanged
                ? pass("edit-adversarial-no-snapshot-read-first", a.token)
                : fail(
                    "edit-adversarial-no-snapshot-read-first",
                    `expected=${READ_FIRST} got=${JSON.stringify(a.token)} diskUnchanged:${okUnchanged}`,
                  );
            },
          ),
      ),
      (e) => Effect.succeed(fail("edit-adversarial-no-snapshot-read-first", `defect: ${String(e)}`)),
    ),
};

const scAnchorMismatch: Scenario = {
  name: "edit-adversarial-anchor-mismatch",
  run: (dir) =>
    Effect.catchAll(
      Effect.flatMap(
        Effect.sync(() => {
          const fixture = writeFixture(dir, "target.ts", FOUR_LINES);
          return { fixture, before: readFileSync(fixture) };
        }),
        ({ fixture, before }) => {
          const ctx = mkCtx(dir, "st-edit-mismatch");
          return Effect.flatMap(snapshot(fixture, ctx), (snap) => {
            if ("failure" in snap) {
              return Effect.succeed({ ...snap.failure, name: "edit-adversarial-anchor-mismatch" });
            }
            return Effect.map(
              attempt(
                EDIT_MOD,
                "mimoEditTool",
                { file_path: fixture, tag: snap.tag, hunks: [{ line: 2, old: `export const beta = "WRONG";`, new: "SHOULD_NOT_APPLY" }] },
                ctx,
              ),
              (a) => {
                const after = readFileSync(fixture);
                const okToken = a.token === ANCHOR_MISMATCH;
                const okUnchanged = (before as Buffer).equals(after);
                return okToken && okUnchanged
                  ? pass("edit-adversarial-anchor-mismatch", a.token)
                  : fail(
                      "edit-adversarial-anchor-mismatch",
                      `expected=${ANCHOR_MISMATCH} got=${JSON.stringify(a.token)} diskUnchanged:${okUnchanged}`,
                    );
              },
            );
          });
        },
      ),
      (e) => Effect.succeed(fail("edit-adversarial-anchor-mismatch", `defect: ${String(e)}`)),
    ),
};

const scOobTamper: Scenario = {
  name: "edit-adversarial-oob-write-stale",
  run: (dir) =>
    Effect.catchAll(
      Effect.flatMap(
        Effect.sync(() => writeFixture(dir, "target.ts", FOUR_LINES)),
        (fixture) => {
          const ctx = mkCtx(dir, "st-edit-oob");
          return Effect.flatMap(snapshot(fixture, ctx), (snap) => {
            if ("failure" in snap) {
              return Effect.succeed({ ...snap.failure, name: "edit-adversarial-oob-write-stale" });
            }
            // Out-of-band direct write (simulates external file.edited): tag goes stale.
            const tampered = `${FOUR_LINES}// tampered out of band\n`;
            writeFileSync(fixture, tampered);
            const tamperedBytes = readFileSync(fixture);
            return Effect.map(
              attempt(
                EDIT_MOD,
                "mimoEditTool",
                { file_path: fixture, tag: snap.tag, hunks: [{ line: 2, old: LINE2_OLD, new: "SHOULD_NOT_APPLY" }] },
                ctx,
              ),
              (a) => {
                const after = readFileSync(fixture);
                const okToken = a.token === STALE_ANCHOR;
                // Guard neither reverted the tamper nor mutated it: bytes equal tampered bytes.
                const okPreserved = (tamperedBytes as Buffer).equals(after);
                return okToken && okPreserved
                  ? pass("edit-adversarial-oob-write-stale", a.token)
                  : fail(
                      "edit-adversarial-oob-write-stale",
                      `expected=${STALE_ANCHOR} got=${JSON.stringify(a.token)} tamperedPreserved:${okPreserved}`,
                    );
              },
            );
          });
        },
      ),
      (e) => Effect.succeed(fail("edit-adversarial-oob-write-stale", `defect: ${String(e)}`)),
    ),
};

export const scenarios: ReadonlyArray<Scenario> = [
  scApplyRetag,
  scStaleReuse,
  scReadFirst,
  scAnchorMismatch,
  scOobTamper,
];

export const scenarioNames: ReadonlyArray<string> = scenarios.map((s) => s.name);
