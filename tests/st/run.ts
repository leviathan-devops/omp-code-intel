/**
 * tests/st/run.ts — the ST runner (W1-E). SC-18 gate.
 *
 * Imports all ST scenario arrays (ast + edit + merkle), runs them SEQUENTIALLY (one sandbox per
 * scenario), prints the `PASS <name>` / `FAIL <name> <got>` table, and exits
 * rows.every(PASS) ? 0 : 1. Exactly ONE Effect.runPromise at the bottom.
 * Every scenario is Effect.timeout("30 seconds")-bounded; a timeout becomes a
 * FAIL row (never a hang, never a swallow).
 */
import { Effect } from "effect";
import { scenarios as astScenarios } from "./ast.st";
import { scenarios as editScenarios } from "./edit.st";
import { scenarios as merkleScenarios } from "./merkle.st";
import { scenarios as ttsrScenarios } from "./ttsr.st";
import { scenarios as evalGatesScenarios } from "./eval-gates.st";
import { scenarios as evalScenarios } from "./eval.st";
import { scenarios as w4Scenarios } from "./w4.st";
import { scenarios as v2w1Scenarios } from "./v2w1.st";
import { scenarios as safetyScenarios } from "./safety.st";
import { scenarios as hooksScenarios } from "./hooks.st";
import { withSandbox, type Row, type Scenario } from "./harness";

const all: ReadonlyArray<Scenario> = [...astScenarios, ...editScenarios, ...merkleScenarios, ...ttsrScenarios, ...evalGatesScenarios, ...evalScenarios, ...w4Scenarios, ...v2w1Scenarios, ...safetyScenarios, ...hooksScenarios];

const runOne = (sc: Scenario): Effect.Effect<Row> =>
  Effect.catchAll(
    Effect.timeout(withSandbox((dir) => sc.run(dir)), "30 seconds"),
    (e) => Effect.succeed<Row>({ name: sc.name, verdict: "FAIL", got: `timeout-or-defect: ${String(e)}` }),
  );

const program: Effect.Effect<void> = Effect.map(
  Effect.forEach(all, runOne, { concurrency: 1 }),
  (rows) => {
    for (const r of rows) {
      if (r.verdict === "PASS") {
        console.log(`PASS ${r.name}`);
      } else {
        console.log(`FAIL ${r.name} ${r.got}`);
      }
    }
    const passed = rows.filter((r) => r.verdict === "PASS").length;
    console.log(`--- ${passed}/${rows.length} passed ---`);
    process.exit(rows.every((r) => r.verdict === "PASS") ? 0 : 1);
  },
);

process.env.OMP_INTEL_ALLOW_TMP ??= "1";

Effect.runPromise(program);
