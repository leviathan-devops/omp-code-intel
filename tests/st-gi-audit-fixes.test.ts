// st-gi-audit-fixes — THE REGRESSION PINS for the 2026-09-23 code-audit's 2 HIGH findings.
//
// The audit (ocr, GO lane, session 2bced5f8) returned: high=2 · medium=4 · low=7.
// BOTH HIGH findings were adjudicated REAL (not probe errors) and fixed. These tests pin them
// so they cannot silently return.
//
// ★ ADVERSARIAL FIRST — each test states the FAILURE it prevents, not the happy path.

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { layerCertifications, decideFireFromGraph } from "../src/omp/decision.ts";
import type { LayerFact } from "../src/omp/layer-registry.ts";

const BUNDLE = path.resolve(import.meta.dir, "..", "extensions", "graph-intelligence", "index.js");

/** Mount the DEPLOYED bundle on a fake `pi` and return its tool map (the E-2 surface).
 *  ★ THE DYNAMIC IMPORT IS THE POINT (the rule's own exception: "Test cases that intentionally
 *  exercise module loading boundaries"): BUNDLE is a BUILD ARTIFACT whose path is resolved at
 *  run time, and the test's subject is exactly the deployed module — a static import of a
 *  file that does not exist until the build would fail tsc for every non-built checkout. */
async function mountBundle(): Promise<Map<string, { name: string; execute: (...a: unknown[]) => Promise<{ content: Array<{ text: string }>; details: Record<string, unknown> }> }>> {
  const mod = await import(BUNDLE);
  const tools = new Map<string, { name: string; execute: (...a: unknown[]) => Promise<{ content: Array<{ text: string }>; details: Record<string, unknown> }> }>();
  const zodAny: unknown = new Proxy(function () {}, { get: () => zodAny, apply: () => zodAny });
  const pi = {
    registerTool: (t: unknown) => { const tt = t as { name: string }; tools.set(tt.name, tt as never); },
    on: () => {}, registerCommand: () => {}, registerAgent: () => {}, log: () => {},
    zod: new Proxy({}, { get: () => zodAny }), z: new Proxy({}, { get: () => zodAny }),
  };
  const register = mod.registerGiOmpTools as unknown as (
    p: unknown,
    cwdOf: (ctx?: { cwd?: string }) => string,
  ) => string[];
  register(pi, (ctx) => ctx?.cwd ?? process.cwd());
  return tools;
}

describe("st-gi-audit-fixes: the 2026-09-23 code-audit's HIGH findings", () => {
  test("AUDIT-HIGH-1: only LAYER facts certify a layer — a kernel fact (TSG/ABIDE) is filtered", () => {
    // THE FAILURE THIS PREVENTS: `factsFor` returns facts from EVERY consumer, including the
    // 2 KERNEL consumers (TSG, ABIDE) which are NOT LayerIds. The first version cast
    // `f.consumer as LayerId` for all of them → a certification carrying an INVALID layer.
    const facts: LayerFact[] = [
      { consumer: "L5_CORBELL", rung: "settlement", subject: "s", value: 1, source: "the corbell store" },
      { consumer: "TSG", rung: "meaning", subject: "s", value: 2, source: "the tsg verdict" },
      { consumer: "ABIDE", rung: "repair", subject: "s", value: 3, source: "the abide repair" },
      { consumer: "L1_SEMANTICA", rung: "decision", subject: "s", value: 4, source: "the semantica kg" },
    ];
    const certs = layerCertifications(facts);
    // exactly the 2 layers survive; the 2 kernels are dropped
    expect(certs.length).toBe(2);
    expect(certs.map((c) => c.layer).sort()).toEqual(["L1_SEMANTICA", "L5_CORBELL"]);
    // ★ NO certification may carry a non-layer id — the invalid-cast class
    const LAYER_IDS = ["L1_SEMANTICA", "L2_ARSUMBRIS", "L3_UA", "L4_C2KG", "L5_CORBELL", "L6_GRAPHIFY"];
    for (const c of certs) expect(LAYER_IDS).toContain(c.layer);
    // and the reason is the fact's OWN anchor (the audit trail)
    expect(certs.find((c) => c.layer === "L5_CORBELL")!.reason).toBe("the corbell store");
  });

  test("AUDIT-HIGH-2: a FAILED wipe audit is a LOUD failure, never `GI_CLEARED` with ok:true", async () => {
    // THE FAILURE THIS PREVENTS: the tool returned `GI_CLEARED` with `ok: true` when the audit
    // had FAILED (wipeAudited:false) — a false success. The remedy: `WIPE_AUDIT_FAILED`+ok:false.
    const tools = await mountBundle();
    const probe = tools.get("graph-probe");
    expect(probe).toBeDefined();
    const prev = process.env.GI_OMP_ALLOW_CLEAR;
    process.env.GI_OMP_ALLOW_CLEAR = "1";   // clear the env gate so the audit path is reached
    try {
      // a cwd that CANNOT exist → confineTargetPath fails → audited:false
      const ghost = path.join(os.tmpdir(), `gi-audit-ghost-${Date.now()}`, "nope");
      const res = await probe!.execute("t", { action: "wipe" }, undefined, undefined, { cwd: ghost });
      const text = res.content[0].text;
      // ★ the false-success token must be ABSENT when the audit failed
      expect(text).toContain("WIPE_AUDIT_FAILED");
      expect(res.details.ok).toBe(false);
      expect(res.details.token ?? "").not.toBe("GI_CLEARED");
      expect(text).not.toContain("GI_CLEARED");
    } finally {
      if (prev === undefined) delete process.env.GI_OMP_ALLOW_CLEAR; else process.env.GI_OMP_ALLOW_CLEAR = prev;
    }
  });

  test("AUDIT-HIGH-2b: the wipe path actually CALLS clearGiRegistry (it was a DEAD import)", () => {
    // THE FAILURE THIS PREVENTS: `clearGiRegistry` was imported into extension.ts but NEVER
    // CALLED — the tool reported `GI_CLEARED` without ever clearing. This pin asserts the call
    // site EXISTS in the source (a source-anchor check; the runtime behavior needs the env gate
    // + a real registry, exercised in the container).
    const src = fs.readFileSync(path.resolve(import.meta.dir, "..", "src", "omp", "extension.ts"), "utf8");
    expect(src).toContain("clearGiRegistry();");
    // and the false-success shape is gone
    expect(src).not.toContain('textResult("GI_CLEARED\\n" + wipeAudit.text, { ok: true');
  });

  test("AUDIT-MED-1: a MALFORMED policy.json is LOUD — the silent seed fallback is gone", () => {
    // THE FAILURE THIS PREVENTS: the catch around `new PolicyStore(policyPath)` was EMPTY, so
    // a malformed/unreadable policy.json silently fell back to the seed set and no caller
    // could tell "no policy file" from "a broken one". The seed set is the NAMED fallback for
    // the ABSENT case ONLY; any other failure must name itself.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-policy-bad-"));
    try {
      const dir = path.join(root, ".omp", "graph-intelligence");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "policy.json"), "{ this is not valid json");
      const ev = decideFireFromGraph(root, "someSymbol", "consume");
      // ★ the source NAMES the invalid policy — never the anonymous seed message
      expect(ev.policySource).toContain("POLICY_INVALID");
      expect(ev.policySource).not.toContain("no policy.json on disk");
      // and the seed count still stands (the decision is not blocked by a bad policy file)
      expect(ev.policyCount).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("AUDIT-MED-1b: an ABSENT policy.json keeps the documented seed fallback", () => {
    // the control: with NO policy file, the seed message IS the correct, named fallback.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-policy-none-"));
    try {
      const ev = decideFireFromGraph(root, "someSymbol", "consume");
      expect(ev.policySource).toContain("seed policy set");
      expect(ev.policySource).not.toContain("POLICY_INVALID");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("AUDIT-MED-2: the ledger directory is CREATED (a fresh scope's decision never dies on its record)", () => {
    // THE FAILURE THIS PREVENTS: `fs.mkdirSync` was unguarded and its parent absent on a fresh
    // scope → GI_LEDGER_OPEN_FAILED took the whole verdict (F-99). The dir must exist after.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-ledgerdir-"));
    try {
      const ev = decideFireFromGraph(root, "someSymbol", "consume");
      expect(fs.existsSync(path.dirname(ev.ledgerPath))).toBe(true);
      expect(fs.existsSync(ev.ledgerPath)).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("st-gi-audit-fixes: ★ THE PREDICATE LAW — consumed:N/8 must FAIL when violated", () => {
  // ★ THE MEASURED DEFECT (2026-09-23): `scripts/consumption-audit.ts` exited 0 for a subject
  // with NO facts AND for an empty scope — the goal's "DONE only when the register reads
  // consumed:8" was DOCUMENTATION, not a predicate. THE EXIT TEST: does something exit NONZERO
  // when the condition is violated? These pins assert it does.
  const SCRIPT = path.resolve(import.meta.dir, "..", "scripts", "consumption-audit.ts");
  const REPO = path.resolve(import.meta.dir, "..");

  const run = (args: string[]): number => {
    const r = Bun.spawnSync(["bun", SCRIPT, ...args], { cwd: REPO, stdout: "pipe", stderr: "pipe" });
    return r.exitCode;
  };

  test("test_consumption_predicate: --gate PASSES at 8/8 (exit 0)", () => {
    expect(run([REPO, "evidence", "--gate"])).toBe(0);
  }, 300_000);

  test("test_consumption_predicate: --gate FAILS below the bar (exit 1, a NAMED error)", () => {
    // a subject no consumer knows ⇒ every consumer is UNCONSUMED ⇒ consumed < 8 ⇒ EXIT 1
    expect(run([REPO, "ThisSubjectHasNoFactsAtAll", "--gate"])).toBe(1);
  }, 300_000);

  test("test_consumption_predicate: --expect is explicit (the RAW count for the subject)", () => {
    // ★ THE CONTRACT, corrected (2026-09-24, the red-team close). `--expect N` is the RAW count
    //   for the GIVEN subject; `--gate` is the PER-DOMAIN predicate (all 8 consumed for their
    //   own domains). MEASURED: subject `evidence` reads consumed:7/8 — L2_ARSUMBRIS answers
    //   about the au engine's REPO/DEP names, not about "evidence". So `--expect 8` for
    //   `evidence` is an IMPOSSIBLE bar (exit 1, correctly) and `--expect 7` passes.
    expect(run([REPO, "evidence", "--expect", "99"])).toBe(1);
    expect(run([REPO, "evidence", "--expect", "8"])).toBe(1); // 7 < 8 — the honest raw count
    expect(run([REPO, "evidence", "--expect", "7"])).toBe(0); // the measured count
  }, 300_000);

  test("test_consumption_predicate: no flag keeps the plain read (exit 0)", () => {
    // the predicate is OPT-IN so the operator's plain read never breaks a pipeline
    expect(run([REPO, "ThisSubjectHasNoFactsAtAll"])).toBe(0);
  }, 300_000);
});

describe("st-gi-audit-fixes: ★★ THE GOAL PREDICATE — the five DONE conditions as an exit test", () => {
  // ★ THE PREDICATE LAW applied to the COMPLETION CLAIM: if no command exits nonzero when a
  // done condition is violated, the condition is documentation. `scripts/goal-verify.ts` is the
  // exit test for all five. This pin asserts BOTH directions.
  const REPO = path.resolve(import.meta.dir, "..");
  const run = (args: string[]): { code: number; out: string } => {
    const r = Bun.spawnSync(["bun", path.join(REPO, "scripts", "goal-verify.ts"), ...args], { cwd: REPO, stdout: "pipe", stderr: "pipe" });
    return { code: r.exitCode, out: r.stdout.toString() };
  };

  test("test_goal_predicate: 5/5 on the real conditions (exit 0)", () => {
    const r = run([REPO, "evidence"]);
    expect(r.out).toContain("[goal-verify] ★ THE PREDICATE PASSED: 5/5 conditions met");
    expect(r.code).toBe(0);
  }, 600_000);

  test("test_goal_predicate: a VIOLATED condition exits 1 with the named failure", () => {
    // a subject no consumer knows ⇒ C1 fails ⇒ the whole gate FAILS
    const r = run([REPO, "ThisSubjectHasNoFactsAtAll"]);
    expect(r.out).toContain("GI_GOAL_NOT_MET");
    expect(r.out).toContain("C1 FAIL");
    expect(r.code).toBe(1);
  }, 600_000);

  test("test_goal_predicate: an empty scope exits 1", () => {
    const r = run(["/tmp/gi-goal-verify-empty-scope", "evidence"]);
    expect(r.code).toBe(1);
  }, 600_000);
});

describe("st-gi-audit-fixes: ★★ FR-1 — THE GATE MUST NOT CONTRADICT ITSELF", () => {
  // ★ FR-1 THE LYING GATE (F-115, the zero-trust auditor's find). `goal-verify` printed
  //   `C1 PASS  the register reads consumed:8 (not up=11/11)` while its OWN NEXT LINE printed
  //   `C1 detail: ... the register reads consumed:7/8`. A gate whose PASS line contradicts its
  //   detail line is worse than a FAIL — it fabricates with a receipt.
  // ★ THE PIN: no PASS line's number may differ from its detail line's number.
  const REPO = path.resolve(import.meta.dir, "..");
  const SCRIPT = path.join(REPO, "scripts", "goal-verify.ts");

  test("test_goal_predicate_honest_text: no PASS line contradicts its own detail line", () => {
    const r = Bun.spawnSync(["bun", SCRIPT, REPO, "evidence"], { cwd: REPO, stdout: "pipe", stderr: "pipe" });
    const out = r.stdout.toString();
    // ★ parse every PASS line and every detail line, keyed by the check id
    const passes = [...out.matchAll(/([A-Z]\d)\s+PASS\s+([^\n]*)/g)].map((m) => [m[1], m[2]] as const);
    const details = [...out.matchAll(/([A-Z]\d)\s+detail:\s+([^\n]*)/g)].map((m) => [m[1], m[2]] as const);
    let contradictions = 0;
    for (const [pid, ptext] of passes) {
      for (const [did, dtext] of details) {
        if (pid !== did) continue;
        const pn = [...ptext.matchAll(/consumed:(\d)\/8/g)].map((m) => m[1]);
        const dn = [...dtext.matchAll(/consumed:(\d)\/8/g)].map((m) => m[1]);
        if (pn.length > 0 && dn.length > 0 && pn.join() !== dn.join()) contradictions++;
      }
    }
    if (contradictions > 0) {
      throw new Error(`THE LYING GATE IS BACK: ${contradictions} PASS line(s) contradict their detail. stdout:\n${out}`);
    }
    expect(contradictions).toBe(0);
    // ★ AND the C1 condition string names the per-domain union (never a bare consumed:8)
    const src = fs.readFileSync(SCRIPT, "utf8");
    expect(src).toContain("all 8 consumers are CONSUMED for their own domains");
    expect(src).not.toContain('condition: "the register reads consumed:8');
    expect(r.exitCode).toBe(0);
  }, 900_000);
});
