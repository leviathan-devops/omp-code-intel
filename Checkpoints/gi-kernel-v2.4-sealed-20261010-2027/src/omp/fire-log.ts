// fire-log — ★ ONE SPACE FOR EVERY TSG + ABIDE FIRE (append-only, full decision data).
//
// Operator ruling (2026-10-04): EVERY time the TSG (the meaning gate) or the ABIDE (the
// repair path) fires, write the FULL decision data so patterns can be mined from hundreds
// of thousands of rows later. One directory, sharded-by-stream (no write races), each row
// a self-contained JSON object:
//
//   <GI_FIRELOG_DIR ?? ~/.omp/run/fire-log>/
//     tsg.jsonl    every judge decision (surface=judge) AND every enforcement (surface=enforce)
//     abide.jsonl  every ABIDE fire (the judge over the edit diff + the lexicon rows)
//     README.md    the schema + the jq one-liners
//     collect.sh   normalizes the EXTERNAL ledgers (.abide/events.jsonl) into abide.jsonl
//
// The row (tsg, surface=judge) carries: the state SENT to the judge, the QUESTION (instructions
// + criteria), the ANSWER (choice / confidence / probabilities / model / latency / degraded).
// The row (surface=enforce) carries what the gate DID (action / reason / remedy).
// The row (abide) carries the rule / band / verdict / matched_span / scores.
//
// ★ NEVER blocks a decision: a fire-log fault is NAMED (GI_FIRELOG_IO) and ignored — the
//   verdict stands regardless (the same best-effort discipline as the gate ledger).
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** The single space. ★ GIK JEV LAYER FIRE LOG — the two Jev enforcement layers (TSG + ABIDE).
 *  Clearly named so it is never mistaken for anything else and never forgotten. */
export function fireLogDir(): string {
  return process.env.GI_FIRELOG_DIR ?? path.join(os.homedir(), ".omp", "run", "gik-jev-layer-fire-log");
}

export type FireStream = "tsg" | "abide";

/** Append ONE full row. Sharded by stream so concurrent writers never interleave mid-line. */
export function logFire(stream: FireStream, row: Record<string, unknown>): void {
  try {
    const dir = fireLogDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, stream + ".jsonl"), JSON.stringify({ ts: new Date().toISOString(), stream, ...row }) + "\n");
  } catch (e) {
    // best-effort: a fire-log fault NEVER blocks a decision, but it is NAMED (never silent)
    // eslint-disable-next-line no-console
    console.error(`GI_FIRELOG_IO: ${e instanceof Error ? e.message : String(e)}`);
  }
}
