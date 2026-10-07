// st-claim-firewall — ★ L2 THE CLAIM FIREWALL CONTRACT (GI-Kernel-V2.2 W5c).
//
// D7: a fabricated completion claim ("523 tests pass" with no span) is FABRICATED and
// the turn is REJECTED; the same claim WITH a THIS-TURN tool-result span is SUPPORTED.
// THE POLARITY LAW: ABIDE fail-OPEN · CLAIM FIREWALL fail-CLOSED — never unified.
import { describe, expect, test } from "bun:test";
import {
  ABIDE_POLARITY,
  adjudicateClaim,
  bindClaimAtoms,
  CLAIM_FIREWALL_POLARITY,
  detectClaimAtoms,
} from "../src/omp/claim-firewall.ts";

describe("st-claim-firewall: L2 blocks unbound completion (W5c)", () => {
  test("test_claim_firewall_fabricated_rejected", () => {
    const atoms = detectClaimAtoms("523 tests pass");
    expect(atoms.length).toBeGreaterThan(0);
    const bindings = bindClaimAtoms(atoms, []);
    expect(bindings.every((b) => b.verdict === "FABRICATED")).toBe(true);
    const r = adjudicateClaim({ text: "523 tests pass", turnToolResults: [] });
    expect(r.verdict).toBe("FABRICATED");
    expect(r.action).toBe("REJECT");
    expect(r.reasons.join(" ")).toMatch(/FABRICATED/);
  });

  test("test_claim_firewall_bound_span_supported", () => {
    const spans = ["bun test: 523 pass, 0 fail (523 tests pass)"];
    const atoms = detectClaimAtoms("523 tests pass");
    expect(atoms.length).toBeGreaterThan(0);
    const bindings = bindClaimAtoms(atoms, spans);
    expect(bindings.every((b) => b.verdict === "SUPPORTED")).toBe(true);
    const r = adjudicateClaim({ text: "523 tests pass", turnToolResults: spans });
    expect(r.verdict).toBe("SUPPORTED");
    expect(r.action).toBe("PASS");
  });

  test("test_claim_firewall_rejects_negated_span", () => {
    // ★ A-1 (the audit's binder hole): a POSITIVE claim must NOT bind to a span that NEGATES it.
    //   BEFORE the fix: `span.includes("523")` bound "523 tests pass" to "523 tests FAILED".
    const negated = ["bun test: 523 tests failed (523 failing)"];
    const atoms = detectClaimAtoms("523 tests pass");
    expect(atoms.length).toBeGreaterThan(0);
    expect(bindClaimAtoms(atoms, negated).every((b) => b.verdict === "FABRICATED")).toBe(true);
    const r = adjudicateClaim({ text: "523 tests pass", turnToolResults: negated });
    expect(r.verdict).toBe("FABRICATED");
    expect(r.action).toBe("REJECT");
    // the WORD-BOUNDARY half: the substring "523" inside "12345" must NOT bind the number 523.
    const sub = bindClaimAtoms(detectClaimAtoms("523 tests pass"), ["run: 12345 ms elapsed"]);
    expect(sub.every((b) => b.verdict === "FABRICATED")).toBe(true);
    // the POSITIVE control still binds (no over-rejection).
    const ok = bindClaimAtoms(detectClaimAtoms("523 tests pass"), ["bun test: 523 pass, 0 fail"]);
    expect(ok.every((b) => b.verdict === "SUPPORTED")).toBe(true);
  });

  test("test_claim_firewall_polarity_not_unified", () => {
    expect(ABIDE_POLARITY).toBe("fail-open");
    expect(CLAIM_FIREWALL_POLARITY).toBe("fail-closed");
    expect(ABIDE_POLARITY).not.toBe(CLAIM_FIREWALL_POLARITY);
  });
});
