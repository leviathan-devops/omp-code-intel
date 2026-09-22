import { describe, expect, test } from "bun:test";
import { parseExports, resolveDial, runGraphGate } from "../src/omp/gate-middleware.ts";

const OLD = "export function tridentLog() {}\nexport function keep() {}\n";
const STRIP = "export function keep() {}\n";
const APPEND = OLD + "function helper() {}\n";

describe("W4 graph-gate", () => {
  test("parseExports finds exported functions", () => {
    expect(parseExports(OLD).sort()).toEqual(["keep", "tridentLog"]);
  });

  test("FULL strip → GRAPH_GATE_SIGNATURE_BREAK cancel", () => {
    const r = runGraphGate({ dial: "FULL", oldText: OLD, newText: STRIP, file: "u.ts", hasStore: true });
    expect(r.cancel).toBe(true);
    expect(r.token).toBe("GRAPH_GATE_SIGNATURE_BREAK");
  });

  test("STEER strip lands with [GATE STEER]", () => {
    const r = runGraphGate({ dial: "STEER", oldText: OLD, newText: STRIP, file: "u.ts", hasStore: true });
    expect(r.cancel).toBe(false);
    expect(r.token).toBe("[GATE STEER]");
  });

  test("OFF strip lands zero tokens", () => {
    const r = runGraphGate({ dial: "OFF", oldText: OLD, newText: STRIP, file: "u.ts", hasStore: true });
    expect(r.cancel).toBe(false);
    expect(r.token).toBeNull();
  });

  test("benign append zero-misfire on FULL", () => {
    const r = runGraphGate({ dial: "FULL", oldText: OLD, newText: APPEND, file: "u.ts", hasStore: true });
    expect(r.cancel).toBe(false);
    expect(r.token).toBeNull();
  });

  // ★★★ THE TEST THAT ENCODED THE DEFECT, CORRECTED (2026-09-22). It asserted
  //   `cancel:false` — i.e. "a missing graph ALLOWS the edit". THE OPERATOR'S LAW IS THE
  //   OPPOSITE: NO FALLBACKS — a missing substrate is a LOUD, NAMED REFUSAL. The old
  //   assertion is why this build shipped green tests over a graph that could not see the
  //   code: the gate's own test certified the silent fallback as correct behaviour.
  test("★ no store → GI_NO_STORE is a LOUD REFUSAL, never an ALLOW", () => {
    const r = runGraphGate({ dial: "FULL", oldText: OLD, newText: STRIP, file: "u.ts", hasStore: false });
    expect(r.cancel).toBe(true);                      // ★ REFUSED, not allowed
    expect(r.token).toBe("GI_NO_STORE");
    expect(r.advisory).toContain("REFUSES");          // ★ and it says WHY, loudly
  });

  test("★ the escape is EXPLICIT and NAMED — GI_ALLOW_NO_STORE=1 bypasses, visibly", () => {
    process.env.GI_ALLOW_NO_STORE = "1";
    try {
      const r = runGraphGate({ dial: "FULL", oldText: OLD, newText: STRIP, file: "u.ts", hasStore: false });
      expect(r.cancel).toBe(false);
      expect(r.advisory).toContain("BYPASSED BY EXPLICIT ENV");  // ★ never silent
    } finally {
      delete process.env.GI_ALLOW_NO_STORE;
    }
  });

  test("resolveDial default STEER", () => {
    expect(resolveDial({})).toBe("STEER");
    expect(resolveDial({ GI_DIAL: "FULL" })).toBe("FULL");
    expect(resolveDial({ GI_DIAL: "OFF" })).toBe("OFF");
  });
});
