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

  test("no store → GI_NO_STORE ALLOW", () => {
    const r = runGraphGate({ dial: "FULL", oldText: OLD, newText: STRIP, file: "u.ts", hasStore: false });
    expect(r.cancel).toBe(false);
    expect(r.token).toBe("GI_NO_STORE");
  });

  test("resolveDial default STEER", () => {
    expect(resolveDial({})).toBe("STEER");
    expect(resolveDial({ GI_DIAL: "FULL" })).toBe("FULL");
    expect(resolveDial({ GI_DIAL: "OFF" })).toBe("OFF");
  });
});
