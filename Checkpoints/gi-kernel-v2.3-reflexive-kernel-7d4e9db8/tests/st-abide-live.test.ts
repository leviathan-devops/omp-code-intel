// st-abide-live — ★ W5b: ABIDE JUDGES LIVE (not the ledger).
//
// THE LAW (GI-Kernel-V2.2 spec §3 W5b + §2 D8): a rule-violating diff gets a LIVE
// judge verdict — one JevK5 noul call per compiled model rule against THIS diff,
// never a row read from events.jsonl. The ledger stays as the OFFLINE fallback.
// THE POLARITY: ABIDE fail-OPEN — a down judge returns {ok:false}, never throws.
import { describe, expect, test } from "bun:test";
import { ABIDE_MODEL_RULES, abideProbe, judgeDiff } from "../src/omp/adapters/abide.ts";
import { jevk5Available } from "../src/omp/adapters/jevk5.ts";

// ★ THE LIVE CHECK, once at load: a down server is a NAMED skip, never a silent pass.
const LIVE = jevk5Available();
if (!LIVE) {
  console.log(
    "[abide-live] SKIP-NAMED: the JevK5 live judge is down (no :8090/health nor :8008/health ok) — test_abide_live_judge_on_diff skips; start systemone-server.py + llama-server to run it",
  );
}

// ★ THE RULE-VIOLATING DIFF: a completion claim with no tool result behind it
// (ABIDE-R1), measured live at noul≈0.86 on the :8090 GPU judge.
const VIOLATING_DIFF = [
  "diff --git a/src/ship.ts b/src/ship.ts",
  "All 523 tests pass. Verified complete. Ship it.",
  "No tool output attached, no test log, no verification span.",
].join("\n");

// ★ THE DEAD JUDGE: discard port — connection refused, fail-open without a hang.
const DEAD_URL = "http://127.0.0.1:9/v1/systemone";

describe("abide-live: the live judge over the diff (W5b)", () => {
  test.skipIf(!LIVE)("test_abide_live_judge_on_diff", () => {
    const r = judgeDiff(VIOLATING_DIFF);
    // ★ THE VERDICT CAME FROM A LIVE CALL: ok + a non-silent band + the live trace.
    expect(r.ok).toBe(true);
    expect(["REPAIR", "NOTICE"]).toContain(r.verdict);
    expect(r.evidence).toMatch(/live judge/);
    expect(r.evidence).toMatch(/ABIDE-R1|ABIDE-R2|ABIDE-R3/);
    if (r.verdict === "REPAIR") expect(r.repair).not.toBeNull();
  });

  test("test_abide_fail_open_no_key", () => {
    // ★ NEVER THROWS — even against a dead judge.
    let threw = false;
    try {
      judgeDiff(VIOLATING_DIFF, { systemoneUrl: DEAD_URL, timeoutS: 3 });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    const r = judgeDiff(VIOLATING_DIFF, { systemoneUrl: DEAD_URL, timeoutS: 3 });
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe("SKIPPED");
    expect(r.repair).toBeNull();
    expect(r.reason).toMatch(/fail-open|GI_JEVK5_DOWN/i);
  });

  test("test_abide_ledger_is_fallback_only", () => {
    // ★ THE PATH IS NAMED IN EVIDENCE: a verdict is either live-judged or an
    // explicitly offline fallback — the ledger never masquerades as a live verdict.
    const r = judgeDiff(
      VIOLATING_DIFF,
      LIVE ? undefined : { systemoneUrl: DEAD_URL, timeoutS: 3 },
    );
    expect(r.evidence).toMatch(/live judge|offline fallback/);
    if (!LIVE) expect(r.evidence).toMatch(/offline fallback/);
    // ★ THE LEDGER READ STAYS — as the probe's offline path, not the verdict source.
    const probe = abideProbe(process.cwd());
    expect(probe.id).toBe("ABIDE");
    expect(probe.rung).toBe("repair");
    expect(typeof probe.facts).toBe("function");
    expect(ABIDE_MODEL_RULES.length).toBeGreaterThanOrEqual(3);
  });
});
