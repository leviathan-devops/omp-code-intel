/**
 * tests/st/hooks.st.ts — script tests for the REAL src/index.ts hook wiring
 * (W2-C) against the REAL src/ttsr.ts rule engine (W2-B). Mode B: observable
 * channels only — returned hook objects + the project-cwd chain-file bytes
 * (`<cwd>/.mimocode/omp-intel/merkle-chain.jsonl`). Exact tokens.
 *
 * Plugin under test: `pluginFn({}, {merkle:true,
 * ttsr:{rules:[{key:"no-console-log", re:"console\\.log",
 * body:"use logger.debug"}]}})` (CONTRACTS-W2 hooks.st.ts row verbatim).
 *
 * LEGIT/POSITIVE: tool.execute.after(edit, "console.log(1)") →
 * messages.transform yields 1 synthetic message whose parts[0].text
 * startsWith "[omp-intel rule no-console-log]" ; second transform → 0
 * (store cleared) ; session.compacting context includes "use logger.debug" ;
 * system.transform yields 1 line containing "omp-code-intel active:".
 * ADVERSARIAL/NEGATIVE (§8.9 zero-misfire half): tool.execute.after with tool
 * "read" → NO new chain row (mutating-set gate held) ; the after-hook NEVER
 * mutates the output object (byte-identical JSON before/after) ;
 * messages.transform with no pending violations → messages unchanged.
 *
 * TEST ISOLATION: the chain file lives under process.cwd() (the project dir
 * when run via run.ts) — NOT the scenario sandbox. The first chain-touching
 * scenario snapshots whether `<cwd>/.mimocode/omp-intel` pre-existed; the
 * final cleanup scenario rmSyncs ONLY that dir when WE created it, and when
 * it pre-existed asserts append-only preservation (rows >= snapshot, never
 * wiped). Every positive scenario DRAINS its own violation batch so the
 * module-level store (shared across plugin() calls in one process) is empty
 * for the negative scenarios — run order is sequential per run.ts.
 */
import { Effect } from "effect";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import pluginFn from "../../src/index";
import { fail, pass, type Row, type Scenario } from "./harness";

const RULES = [{ key: "no-console-log", re: "console\\.log", body: "use logger.debug" }];
const RULE_BODY = "use logger.debug";
const RULE_PREFIX = "[omp-intel rule no-console-log]";
const CAPABILITY_TOKEN = "omp-code-intel active:";

type Hooks = Awaited<ReturnType<typeof pluginFn>>;

const loadHooks = (): Promise<Hooks> => pluginFn({}, { merkle: true, ttsr: { rules: RULES } });

const intelDir = (): string => join(process.cwd(), ".mimocode", "omp-intel");
const chainFile = (): string => join(intelDir(), "merkle-chain.jsonl");

/** Chain row count from disk bytes (readFileSync split/filter — same as merkle.st.ts). -1 on read defect. */
const chainRows = (): number => {
  try {
    if (!existsSync(chainFile())) return 0;
    return readFileSync(chainFile(), "utf8").split("\n").filter((l) => l.length > 0).length;
  } catch {
    return -1;
  }
};

/** Test-isolation baseline: did <cwd>/.mimocode/omp-intel exist before WE wrote? Set once, by the first scenario that touches the chain. */
let baseline: { mimocodeExisted: boolean; rows: number } | null = null;
const snapshotBaseline = (): void => {
  if (baseline === null) {
    baseline = { mimocodeExisted: existsSync(intelDir()), rows: chainRows() };
  }
};

/** A hook-crash is an honest FAIL row carrying the thrown message — never a pass. */
const asyncScenario = (name: string, body: () => Promise<Row>): Scenario => ({
  name,
  run: (_dir) =>
    Effect.catchAll(
      Effect.tryPromise({
        try: body,
        catch: (e) => ({ message: e instanceof Error ? e.message : String(e) }) as const,
      }),
      (c) => Effect.succeed(fail(name, `hook-crash (expected contract behavior, got throw): ${c.message}`)),
    ),
});

interface SyntheticMsg {
  readonly info?: { readonly role?: string; readonly id?: string };
  readonly parts?: ReadonlyArray<{ readonly type?: string; readonly text?: string }>;
}

const asMessages = (ret: unknown, fallback: unknown): SyntheticMsg[] => {
  const fromRet =
    typeof ret === "object" && ret !== null && Array.isArray((ret as { messages?: unknown }).messages)
      ? ((ret as { messages: unknown }).messages as SyntheticMsg[])
      : null;
  return (fromRet ?? fallback ?? []) as SyntheticMsg[];
};

const scTransformInjectsOne: Scenario = asyncScenario("hooks-legit-transform-injects-one", async () => {
  const hooks = await loadHooks();
  snapshotBaseline();
  await hooks["tool.execute.after"](
    { tool: "edit", sessionID: "st-hooks-inject", callID: "c1", args: {} },
    { title: "", output: "console.log(1)", metadata: {} },
  );
  const out = { messages: [] as SyntheticMsg[] };
  const ret = await hooks["experimental.chat.messages.transform"]({}, out);
  const msgs = asMessages(ret, out.messages);
  const text = msgs.length === 1 ? (msgs[0].parts?.[0]?.text ?? "") : "";
  const ok = msgs.length === 1 && text.startsWith(RULE_PREFIX);
  // Drain unconditionally: the module-level store must be empty for later scenarios.
  await hooks["experimental.chat.messages.transform"]({}, { messages: [] });
  return ok
    ? pass("hooks-legit-transform-injects-one", `1 synthetic message text=${JSON.stringify(text.slice(0, 80))}`)
    : fail(
        "hooks-legit-transform-injects-one",
        `expected 1 message startsWith=${JSON.stringify(RULE_PREFIX)} got=${msgs.length} text=${JSON.stringify(text.slice(0, 160))}`,
      );
});

const scSecondTransformCleared: Scenario = asyncScenario("hooks-legit-second-transform-cleared", async () => {
  const hooks = await loadHooks();
  snapshotBaseline();
  await hooks["tool.execute.after"](
    { tool: "edit", sessionID: "st-hooks-cleared", callID: "c1", args: {} },
    { title: "", output: "console.log(1)", metadata: {} },
  );
  const first = asMessages(
    await hooks["experimental.chat.messages.transform"]({}, { messages: [] }),
    [],
  );
  const second = asMessages(
    await hooks["experimental.chat.messages.transform"]({}, { messages: [] }),
    [],
  );
  const ok = first.length === 1 && second.length === 0;
  return ok
    ? pass("hooks-legit-second-transform-cleared", "first=1 second=0 (store cleared)")
    : fail("hooks-legit-second-transform-cleared", `expected first=1 second=0 got first=${first.length} second=${second.length}`);
});

const scCompactingPersists: Scenario = asyncScenario("hooks-legit-compacting-persists-body", async () => {
  const hooks = await loadHooks();
  const out = { context: [] as string[] };
  const ret = await hooks["experimental.session.compacting"]({ sessionID: "st-hooks-compact" }, out);
  const ctx: unknown =
    typeof ret === "object" && ret !== null && Array.isArray((ret as { context?: unknown }).context)
      ? (ret as { context: unknown }).context
      : out.context;
  const ok = Array.isArray(ctx) && (ctx as unknown[]).includes(RULE_BODY);
  return ok
    ? pass("hooks-legit-compacting-persists-body", `context includes ${JSON.stringify(RULE_BODY)}`)
    : fail("hooks-legit-compacting-persists-body", `expected context to include ${JSON.stringify(RULE_BODY)} got=${JSON.stringify(ctx)}`);
});

const scSystemBrief: Scenario = asyncScenario("hooks-legit-system-transform-brief", async () => {
  const hooks = await loadHooks();
  const out = { system: [] as string[] };
  const ret1 = await hooks["experimental.chat.system.transform"]({ sessionID: "st-hooks-sys", model: "test" }, out);
  const sys1 = asStrings(ret1, out.system);
  // Idempotency: a second pass over the same array must not duplicate the line.
  const ret2 = await hooks["experimental.chat.system.transform"](
    { sessionID: "st-hooks-sys", model: "test" },
    Array.isArray((ret1 as { system?: unknown })?.system) ? (ret1 as { system: string[] }) : out,
  );
  const sys2 = asStrings(ret2, out.system);
  const ok =
    sys1.length === 1 && sys1[0].includes(CAPABILITY_TOKEN) && sys2.length === 1;
  return ok
    ? pass("hooks-legit-system-transform-brief", `1 line + idempotent: ${JSON.stringify(sys1[0].slice(0, 60))}…`)
    : fail(
        "hooks-legit-system-transform-brief",
        `expected 1 line containing ${JSON.stringify(CAPABILITY_TOKEN)} (idempotent) got pass1=${JSON.stringify(sys1)} pass2len=${sys2.length}`,
      );
});

const asStrings = (ret: unknown, fallback: unknown): string[] => {
  if (typeof ret === "object" && ret !== null && Array.isArray((ret as { system?: unknown }).system)) {
    return (ret as { system: unknown }).system as string[];
  }
  return (fallback ?? []) as string[];
};

const scReadNoChainRow: Scenario = asyncScenario("hooks-adversarial-read-no-chain-row", async () => {
  const hooks = await loadHooks();
  snapshotBaseline();
  const existedBefore = existsSync(chainFile());
  const before = chainRows();
  await hooks["tool.execute.after"](
    { tool: "read", sessionID: "st-hooks-read", callID: "c2", args: { path: "x.ts" } },
    { title: "", output: "const x = 1;", metadata: {} },
  );
  const existedAfter = existsSync(chainFile());
  const after = chainRows();
  // Mutating-set gate: a "read" must append NOTHING. If the file never
  // existed, the gate holding also means it still does not exist.
  const ok = after === before && (existedBefore || !existedAfter);
  return ok
    ? pass("hooks-adversarial-read-no-chain-row", `rows ${before}->${after} exists=${existedAfter}`)
    : fail(
        "hooks-adversarial-read-no-chain-row",
        `mutating-set gate broken: rows ${before}->${after} existsBefore=${existedBefore} existsAfter=${existedAfter}`,
      );
});

const scOutputByteIdentical: Scenario = asyncScenario("hooks-adversarial-output-byte-identical", async () => {
  const hooks = await loadHooks();
  const out = { title: "t", output: "const x = 1;", metadata: {} };
  const before = JSON.stringify(out);
  const ret = await hooks["tool.execute.after"](
    { tool: "read", sessionID: "st-hooks-ident", callID: "c3", args: {} },
    out,
  );
  const after = JSON.stringify(out);
  const ok = before === after;
  return ok
    ? pass("hooks-adversarial-output-byte-identical", `sameRef=${ret === out} bytes=${after.length}`)
    : fail(
        "hooks-adversarial-output-byte-identical",
        `observer mutated output: before=${before} after=${after}`,
      );
});

const scTransformNoViolations: Scenario = asyncScenario("hooks-adversarial-transform-no-violations-unchanged", async () => {
  const hooks = await loadHooks();
  const probe = [{ info: { role: "user", id: "probe" }, parts: [{ type: "text", text: "hello-probe" }] }];
  const before = JSON.stringify(probe);
  const out = { messages: probe as unknown as SyntheticMsg[] };
  const ret = await hooks["experimental.chat.messages.transform"]({}, out);
  const msgs = asMessages(ret, out.messages);
  const after = JSON.stringify(msgs);
  const ok = after === before;
  return ok
    ? pass("hooks-adversarial-transform-no-violations-unchanged", "messages unchanged (zero-misfire)")
    : fail(
        "hooks-adversarial-transform-no-violations-unchanged",
        `misfire: messages changed before=${before} after=${after.slice(0, 300)}`,
      );
});

const scOmpEditChainRow: Scenario = asyncScenario("hooks-legit-omp-edit-appends-chain-row", async () => {
  const hooks = await loadHooks();
  snapshotBaseline();
  const before = chainRows();
  await hooks["tool.execute.after"](
    { tool: "omp_edit", sessionID: "st-hooks-ompedit", callID: "c4", args: {} },
    { title: "", output: "const ok = 1;", metadata: {} },
  );
  const exists = existsSync(chainFile());
  const after = chainRows();
  const ok = exists && after === before + 1;
  return ok
    ? pass("hooks-legit-omp-edit-appends-chain-row", `chain exists rows ${before}->${after}`)
    : fail(
        "hooks-legit-omp-edit-appends-chain-row",
        `expected chain file exists + rows ${before}->${before + 1} got exists=${exists} rows=${after}`,
      );
});

const scCleanup: Scenario = asyncScenario("hooks-cleanup-created-mimocode", async () => {
  if (baseline === null) {
    return fail("hooks-cleanup-created-mimocode", "no baseline snapshot — ordering defect");
  }
  if (baseline.mimocodeExisted) {
    // Pre-existing .mimocode: NEVER wipe. Assert append-only preservation.
    const now = chainRows();
    const ok = existsSync(intelDir()) && now >= baseline.rows;
    return ok
      ? pass("hooks-cleanup-created-mimocode", `preserved pre-existing .mimocode rows ${baseline.rows}->${now}`)
      : fail("hooks-cleanup-created-mimocode", `pre-existing .mimocode damaged: rows ${baseline.rows}->${now}`);
  }
  // We created it: remove ONLY the omp-intel dir we wrote, then prove it.
  rmSync(intelDir(), { recursive: true, force: true });
  const gone = !existsSync(intelDir());
  return gone
    ? pass("hooks-cleanup-created-mimocode", "removed created .mimocode/omp-intel")
    : fail("hooks-cleanup-created-mimocode", "rmSync did not remove created .mimocode/omp-intel");
});

export const scenarios: ReadonlyArray<Scenario> = [
  scTransformInjectsOne,
  scSecondTransformCleared,
  scCompactingPersists,
  scSystemBrief,
  scReadNoChainRow,
  scOutputByteIdentical,
  scTransformNoViolations,
  scOmpEditChainRow,
  scCleanup,
];

export const scenarioNames: ReadonlyArray<string> = scenarios.map((s) => s.name);
