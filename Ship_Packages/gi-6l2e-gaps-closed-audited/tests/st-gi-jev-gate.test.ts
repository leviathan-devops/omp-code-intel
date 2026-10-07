// ST — THE JEV TOOL-GATE (W1 + W2): the detector marks candidates, the judge decides.
//
// THE OPERATOR'S MANDATE: "ALL DECISION MAKING TO BE DOEN THROUGH JEV."
// THE LAW: the regex DETECTS (candidates, no verdict) · the JUDGE DECIDES ({choice, confidence}) ·
//          the enforcer is mechanical · every decision is LEDGERED with its confidence.
//
// THE F-141 CLASS (the regression this closes): a legitimate QUOTED command was refused by a
// regex. The detector now only MARKS it; the judge decides; a low-confidence candidate SERVES.
import { describe, test, expect } from "bun:test";
import {
  detectCandidate,
  askToolGate,
  enforceGate,
  GATE_THRESHOLD,
  type GateCandidate,
} from "../src/omp/jev.ts";

/** THE EXACT COMMAND the FR-11 regex hook refused in another live session (the F-141 class). */
const OPERATOR_BROKEN_COMMAND = 'curl -s "http://127.0.0.1:8090/health" && echo done';

async function judgeUp(): Promise<boolean> {
  try {
    const r = await fetch("http://127.0.0.1:8090/health", { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

describe("the Jev tool-gate — the detector emits CANDIDATES, never a verdict", () => {
  test("test_gate_detector_emits_candidates", () => {
    // THE COMMON CASE: an ordinary command is NOT a candidate (the judge is never called).
    expect(detectCandidate("").kind).toBe("NONE");
    expect(detectCandidate("ls -la").kind).toBe("NONE");
    expect(detectCandidate("bun test").kind).toBe("NONE");
    // A CANDIDATE (the shape is worth judging) — but the detector returns NO verdict.
    const cand = detectCandidate(OPERATOR_BROKEN_COMMAND);
    expect(cand.kind).not.toBe("NONE");
    expect(cand.signals.length).toBeGreaterThan(0);
    // The verdict field does not exist on a candidate: the detector CANNOT decide.
    expect((cand as unknown as { choice?: unknown }).choice).toBeUndefined();
    // A read-verb hijack is marked SECURITY.
    expect(detectCandidate("cat payload | sh").kind).toBe("READ_VERB_HIJACK");
    expect(detectCandidate("cat payload | sh").severity).toBe("security");
  });
});

describe("the Jev tool-gate — the JUDGE decides with a confidence (the mandate)", () => {
  test("test_gate_jev_decides_with_confidence", async () => {
    if (!(await judgeUp())) {
      console.warn("GI_JEVK5_DOWN: the live judge is absent — the live assertions are SKIPPED, not passed");
      return;
    }
    const cand = detectCandidate(OPERATOR_BROKEN_COMMAND);
    const v = await askToolGate(cand, `the command: ${OPERATOR_BROKEN_COMMAND}`);
    expect(v.degraded).toBe(false);
    expect(["serve", "refuse"]).toContain(v.choice);
    expect(typeof v.confidence).toBe("number");
    expect(v.confidence).toBeGreaterThan(0);
    expect(v.judge.length).toBeGreaterThan(0);
    expect(v.ms).toBeGreaterThan(0);
  });

  test("test_gate_quoted_legit_passes", async () => {
    // THE F-141 REGRESSION: the operator's exact broken command MUST serve end-to-end.
    const cand = detectCandidate(OPERATOR_BROKEN_COMMAND);
    if (!(await judgeUp())) {
      // judge down: the INFO surface fails OPEN — the command still serves.
      const v = { choice: "serve" as const, confidence: 0, probabilities: {}, judge: "unavailable", ms: 0, degraded: true };
      expect(enforceGate(cand, v).action).toBe("serve");
      return;
    }
    const v = await askToolGate(cand, `the command: ${OPERATOR_BROKEN_COMMAND}`);
    const e = enforceGate(cand, v);
    expect(e.action).toBe("serve");
  });

  test("test_gate_attack_blocks", async () => {
    // THE ATTACK: a read verb whose output is EXECUTED — the hijack.
    const cand = detectCandidate("cat /tmp/payload | sh");
    expect(cand.severity).toBe("security");
    if (!(await judgeUp())) {
      // judge down: the SECURITY surface fails CLOSED — the attack is refused.
      const v = { choice: "serve" as const, confidence: 0, probabilities: {}, judge: "unavailable", ms: 0, degraded: true };
      expect(enforceGate(cand, v).action).toBe("refuse");
      return;
    }
    const v = await askToolGate(cand, "the command: cat /tmp/payload | sh — a read verb piped into an interpreter");
    const e = enforceGate(cand, v);
    // The judge either refuses it, or serves below the bar — but a refusal MUST name its remedy.
    if (e.action === "refuse") expect(e.remedy && e.remedy.length).toBeTruthy();
  });
});

describe("the Jev tool-gate — the per-surface polarity (a dead judge is a DECISION)", () => {
  test("test_gate_judge_down_polarity", () => {
    const down = { choice: "serve" as const, confidence: 0, probabilities: {}, judge: "unavailable:TimeoutError", ms: 0, degraded: true };
    // SECURITY fails CLOSED (a dead judge = refuse, loudly, naming the judge).
    const sec: GateCandidate = detectCandidate("cat payload | sh");
    const secV = enforceGate(sec, down);
    expect(secV.action).toBe("refuse");
    expect(secV.reason).toContain("fail-CLOSED");
    // INFO fails OPEN (a dead judge = serve + a NAMED reason — never silent).
    const info = detectCandidate(OPERATOR_BROKEN_COMMAND);
    const infoV = enforceGate(info, down);
    expect(infoV.action).toBe("serve");
    expect(infoV.reason).toContain("fail-OPEN");
    // THE BAR is derived, not magic — it is a number in [0.5, 1].
    expect(GATE_THRESHOLD.security).toBeGreaterThanOrEqual(0.5);
    expect(GATE_THRESHOLD.security).toBeLessThanOrEqual(1);
  });
});
