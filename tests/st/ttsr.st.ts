/**
 * tests/st/ttsr.st.ts — script tests for the REAL src/ttsr.ts (W2-B).
 *
 * LEGIT (CONTRACTS-W2 ttsr.st.ts row + spec §11 zero-misfire half):
 * clean output → scan() == [] ; reminderLine() EXACT
 * `[omp-intel rule <key>] <body>` ; persistContext() returns the bodies array.
 * ADVERSARIAL (spec §8.9 negative half): matching output → exactly 1 violation
 * carrying the rule key ; compileRules() DROPS the invalid regex "([a-"
 * (kept count 1 of 2, survivor is the valid rule — never crashes the hook).
 *
 * Mode B: real module, real fns, observable return values only. Every failure
 * asserts EXACT values (equality) — "it threw" is never a pass.
 */
import { Effect } from "effect";
import {
  compileRules,
  persistContext,
  reminderLine,
  scan,
  type Rule,
} from "../../src/ttsr";
import { fail, pass, type Row, type Scenario } from "./harness";

/** The canonical probe rule (CONTRACTS-W2 hooks.st.ts row verbatim). */
const PROBE_RULES: Rule[] = [{ key: "no-console-log", re: "console\\.log", body: "use logger.debug" }];

/** Exact reminder line per CONTRACTS-W2: `[omp-intel rule <key>] <body>`. */
const EXPECTED_REMINDER = "[omp-intel rule no-console-log] use logger.debug";

const BAD_RULE: Rule = { key: "bad-rule", re: "([a-", body: "never" };

/** Run a pure sync body; any throw becomes an honest FAIL row (never a pass). */
const syncScenario = (name: string, body: () => Row): Scenario => ({
  name,
  run: (_dir) =>
    Effect.catchAll(
      Effect.sync(body),
      (e: unknown) => Effect.succeed(fail(name, `defect: ${e instanceof Error ? e.message : String(e)}`)),
    ),
});

const scScanNoMatch: Scenario = syncScenario("ttsr-legit-scan-no-match", () => {
  const compiled = compileRules(PROBE_RULES);
  const hits = scan(compiled, "const x = 1;\nexport const y = 2;\n");
  return Array.isArray(hits) && hits.length === 0
    ? pass("ttsr-legit-scan-no-match", "scan==[] zero-misfire")
    : fail("ttsr-legit-scan-no-match", `expected=[] got=${JSON.stringify(hits)}`);
});

const scReminderExact: Scenario = syncScenario("ttsr-legit-reminder-line-exact", () => {
  const line = reminderLine({ key: "no-console-log", body: "use logger.debug" });
  return line === EXPECTED_REMINDER
    ? pass("ttsr-legit-reminder-line-exact", line)
    : fail(
        "ttsr-legit-reminder-line-exact",
        `expected=${JSON.stringify(EXPECTED_REMINDER)} got=${JSON.stringify(line)}`,
      );
});

const scPersistBodies: Scenario = syncScenario("ttsr-legit-persist-context-bodies", () => {
  const compiled = compileRules(PROBE_RULES);
  const bodies = persistContext(compiled);
  const ok = Array.isArray(bodies) && bodies.length === 1 && bodies[0] === "use logger.debug";
  return ok
    ? pass("ttsr-legit-persist-context-bodies", JSON.stringify(bodies))
    : fail("ttsr-legit-persist-context-bodies", `expected=["use logger.debug"] got=${JSON.stringify(bodies)}`);
});

const scInvalidDropped: Scenario = syncScenario("ttsr-adversarial-invalid-regex-dropped", () => {
  const kept = compileRules([...PROBE_RULES, BAD_RULE]);
  const ok = kept.length === 1 && kept[0].key === "no-console-log";
  return ok
    ? pass("ttsr-adversarial-invalid-regex-dropped", `kept=1 key=${kept[0].key}`)
    : fail(
        "ttsr-adversarial-invalid-regex-dropped",
        `expected kept=1 key=no-console-log got=${JSON.stringify(kept.map((k) => k.key))}`,
      );
});

const scScanHitOne: Scenario = syncScenario("ttsr-adversarial-scan-hit-exactly-1", () => {
  const compiled = compileRules(PROBE_RULES);
  const hits = scan(compiled, "console.log(1)");
  const ok = hits.length === 1 && hits[0].key === "no-console-log";
  return ok
    ? pass("ttsr-adversarial-scan-hit-exactly-1", `hits=1 key=${hits[0].key}`)
    : fail("ttsr-adversarial-scan-hit-exactly-1", `expected 1 hit key=no-console-log got=${JSON.stringify(hits)}`);
});

export const scenarios: ReadonlyArray<Scenario> = [
  scScanNoMatch,
  scReminderExact,
  scPersistBodies,
  scInvalidDropped,
  scScanHitOne,
];

export const scenarioNames: ReadonlyArray<string> = scenarios.map((s) => s.name);
