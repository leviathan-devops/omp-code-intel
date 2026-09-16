/**
 * tests/st/harness.ts — Mode B script-test harness (W1-E).
 *
 * Effect-wrapped, real-modules-only spine for the W1 ST suite:
 *  - withSandbox: mkdtempSync sandbox + scope finalizer cleanup (Effect.scoped).
 *  - TagFailure: the failure mapper — a thrown tool/import crash becomes a
 *    TagFailure carrying the message, so scenarios assert EXACT tokens.
 *  - callTool: dynamic-imports the REAL src module and runs the tool's
 *    `execute` with a real ToolContext. NO mocks, NO stubs, NO spies.
 *  - extractToken: metadata.error wins, else the leading token before ":".
 *  - Row helpers: { name, verdict: "PASS" | "FAIL", got } — assertions read
 *    returned output/metadata + disk bytes (readFileSync) ONLY.
 *  - mkFixture: real .ts fixture (3 console.log lines + one export).
 *
 * CONTRACTS.md:114 is the single source of truth for every token asserted here.
 */
import { Effect } from "effect";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** ToolContext shape per CONTRACTS.md:12 (sessionID/messageID/agent/directory/worktree/abort/metadata/ask). */
export interface ToolCtx {
  readonly sessionID: string;
  readonly messageID: string;
  readonly agent: string;
  readonly directory: string;
  readonly worktree: string;
  readonly abort: AbortSignal;
  readonly metadata: (...args: Array<unknown>) => unknown;
  readonly ask: (...args: Array<unknown>) => Promise<unknown>;
}

/** Build the real ctx the tools execute against. directory/worktree = sandbox. */
export const mkCtx = (dir: string, sessionID = "st"): ToolCtx => ({
  sessionID,
  messageID: "st",
  agent: "test",
  directory: dir,
  worktree: dir,
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
});

/**
 * Failure mapper (spec §11 verbatim shape): a throw anywhere inside callTool
 * (missing module, crashed tool body, import error) becomes a TagFailure whose
 * `token` is the thrown message. Scenarios compare tokens for EQUALITY —
 * "it threw" is never a pass.
 */
export class TagFailure {
  readonly _tag = "TagFailure";
  constructor(
    readonly token: string,
    readonly detail: string,
  ) {}
}

/** Normalized tool result: `{ output, metadata }` object, or a bare string. */
export interface ToolResult {
  readonly output: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Run a REAL tool from a REAL src module. `mod` is the module specifier
 * (extensionless, e.g. "../../src/ast"), `toolId` the exported ToolDefinition
 * name (e.g. "astGrepTool"). Throws past the Effect boundary NOTHING — every
 * throw is mapped to TagFailure(message).
 */
export const callTool = (
  mod: string,
  toolId: string,
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Effect.Effect<ToolResult, TagFailure> =>
  Effect.tryPromise({
    try: async (): Promise<ToolResult> => {
      // Real dynamic import of the real sibling module — never a stub.
      const loaded: Record<string, unknown> = await import(mod);
      const tool = loaded[toolId] as
        | { execute?: (a: unknown, c: unknown) => Promise<unknown> }
        | undefined;
      if (!tool || typeof tool.execute !== "function") {
        throw new Error(`tool ${toolId} missing execute in ${mod}`);
      }
      const raw: unknown = await tool.execute(args, ctx);
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
  });

/**
 * Extract the spec-named token from a returned result: metadata.error wins
 * (CONTRACTS.md:22 rejection shape), else the leading token before ":" in the
 * output text, else the whole trimmed output (e.g. the empty-pat sentence).
 */
export const extractToken = (result: ToolResult): string => {
  const err = result.metadata["error"];
  if (typeof err === "string" && err.length > 0) {
    return err;
  }
  const idx = result.output.indexOf(":");
  if (idx > 0) {
    return result.output.slice(0, idx).trim();
  }
  return result.output.trim();
};

/**
 * Same leading-token rule applied to a THROWN message (the TagFailure path),
 * so adversarial assertions compare exact tokens on BOTH rejection channels:
 * returned-result rejections (CONTRACTS.md:22 — tools never throw past the
 * tool boundary) and genuine crashes/import failures (which then mismatch the
 * expected token and surface as honest FAIL rows, never passes).
 */
export const tokenOfThrown = (message: string): string => {
  const idx = message.indexOf(":");
  if (idx > 0) {
    return message.slice(0, idx).trim();
  }
  return message.trim();
};

/** Observable row — the only verdict carrier. No spy verbs exist. */
export interface Row {
  readonly name: string;
  readonly verdict: "PASS" | "FAIL";
  readonly got: string;
}

export const pass = (name: string, got = ""): Row => ({ name, verdict: "PASS", got });
export const fail = (name: string, got: string): Row => ({ name, verdict: "FAIL", got });

/** A named scenario: given a sandbox dir, produce its row. Never fails at the Effect level. */
export interface Scenario {
  readonly name: string;
  readonly run: (dir: string) => Effect.Effect<Row>;
}

/**
 * Sandbox scope: mkdtempSync under the OS tmpdir, rmSync(recursive, force)
 * registered via Effect.addFinalizer, whole thing under Effect.scoped.
 * Fixtures live ONLY inside this dir.
 */
export const withSandbox = <A, E>(use: (dir: string) => Effect.Effect<A, E>): Effect.Effect<A, E> =>
  Effect.scoped(
    Effect.flatMap(
      Effect.sync(() => mkdtempSync(join(tmpdir(), "mimo-intel-st-"))),
      (dir) =>
        Effect.zipRight(
          Effect.addFinalizer(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true }))),
          use(dir),
        ),
    ),
  );

/** Write an arbitrary real fixture file inside the sandbox; returns abs path. */
export const writeFixture = (dir: string, name: string, text: string): string => {
  const abs = join(dir, name);
  writeFileSync(abs, text);
  return abs;
};

/** Real .ts fixture: 3 console.log lines + one export. Returns abs path. */
export const mkFixture = (dir: string): string =>
  writeFixture(
    dir,
    "fixture.ts",
    `console.log("alpha");\nconsole.log("beta");\nconsole.log("gamma");\nexport const marker = 1;\n`,
  );
