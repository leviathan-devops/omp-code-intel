// st-gi-v21-policy — W5: THE POLICY STORE (D026 — data, not code).
//
// THE PRINCIPLE: a threshold is a DECISION, and a decision that lives in source
// code can only be changed by a rebuild. The operator's cost posture is not a
// constant of the kernel — it is a number the operator owns and may revise. So
// the recipes live in JSON, versioned, and a human edits them without touching
// the build.
//
// ★ AND THE EDIT MUST NOT COST A RE-INFERENCE. The probability is already
//   stored on every row (§6.4.3 rule 4). Changing a threshold re-BANDS those
//   stored probabilities — it does not re-ask the model. That is the whole
//   economics of the design: 50 fires can be re-bandied under a revised
//   posture for $0, which is what makes calibration iterative rather than
//   expensive.
//
// ★ AND A POLICY THAT CANNOT BE LOADED IS LOUD. D026 puts the numbers in data,
//   which means the numbers can be WRONG in a way code cannot: a missing file,
//   malformed JSON, or a policy whose act bar sits below its flag bar. Every
//   one of those must THROW with a name. A malformed policy that silently fell
//   back to the seeds would move the enforcement bar without anyone noticing —
//   the exact class of silent change this kernel exists to eliminate.
//
// ADVERSARIAL-FIRST: the load failures run before the reload.

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  DEFAULT_POLICY_FILE,
  PolicyStore,
  writePolicyFile,
  type PolicyFile,
} from "../src/omp/policy-store.ts";
import { FireGate, SEED_POLICY, absorbContext, type Fire } from "../src/omp/fire-gate.ts";
import type { Judge } from "../src/omp/enforcement.ts";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gi-v21-pol-"));
}
function aFile(over: Partial<PolicyFile> = {}): PolicyFile {
  return { version: 1, policies: {}, ...over };
}
const A_POLICY = { name: "dumb-tuned", act: 0.75, flag: 0.35, failPolarity: "open" as const };

describe("st-gi-v21-policy: W5 — the policy store", () => {
  // ══ ADVERSARIAL FIRST: the load failures ═════════════════════════════════

  test("test_policy_missing_file_is_loud — no silent seed substitution", () => {
    let threw = false;
    let msg = "";
    try {
      new PolicyStore(path.join(tmpDir(), "does-not-exist.json"));
    } catch (e) {
      threw = true;
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(threw).toBe(true);
    expect(msg).toContain("GI_POLICY");
    expect(msg).toContain("MISSING");
  });

  test("test_policy_malformed_json_is_loud — a broken file is never a shrug", () => {
    const p = path.join(tmpDir(), "broken.json");
    fs.writeFileSync(p, "{ this is not json");
    let threw = false;
    let msg = "";
    try {
      new PolicyStore(p);
    } catch (e) {
      threw = true;
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(threw).toBe(true);
    expect(msg).toContain("GI_POLICY");
    expect(msg).toContain("MALFORMED");
  });

  test("test_policy_act_below_flag_is_rejected — a nonsensical bar cannot load", () => {
    // act < flag would make the ESCALATE band empty: a probability could be
    // "above the flag" and "below the act" in an order the kernel never
    // expects. The kernel's own banding assumes act >= flag.
    const p = path.join(tmpDir(), "inverted.json");
    // ★ WRITTEN DIRECTLY — writePolicyFile now REFUSES to persist an inverted bar
    //   (audit finding P4), so the READER's rejection is what this test must reach.
    fs.writeFileSync(p, JSON.stringify(aFile({ policies: { "*dumb": { ...A_POLICY, act: 0.2, flag: 0.9 } } })));
    let threw = false;
    let msg = "";
    try {
      new PolicyStore(p);
    } catch (e) {
      threw = true;
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(threw).toBe(true);
    expect(msg).toContain("GI_POLICY");
    expect(msg).toContain("INVERTED");
  });

  test("test_policy_out_of_range_is_rejected — a threshold above 1 can never fire", () => {
    const p = path.join(tmpDir(), "range.json");
    fs.writeFileSync(p, JSON.stringify(aFile({ policies: { "*dumb": { ...A_POLICY, act: 1.5 } } })));
    let threw = false;
    let msg = "";
    try {
      new PolicyStore(p);
    } catch (e) {
      threw = true;
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(threw).toBe(true);
    expect(msg).toContain("GI_POLICY");
    expect(msg).toContain("RANGE");
  });

  // ══ THE EXIT GATE ════════════════════════════════════════════════════════

  test("test_policy_reload — ★ an edited JSON re-BANDS a stored probability, NO re-inference", async () => {
    const dir = tmpDir();
    const p = path.join(dir, "policies.json");
    writePolicyFile(p, aFile({ policies: { "*dumb": A_POLICY } }));

    // ★ THE STORE IS LOADED FIRST — otherwise the "reload" is a no-op that
    //   re-reads the file it was constructed from. My first version of this
    //   test edited the file and THEN constructed the store, so `changed`
    //   came back false and the assertion caught the fixture's own mistake:
    //   the production sequence is load → a human edits → reload.
    const store = new PolicyStore(p);
    expect(store.get("*dumb")!.name).toBe("dumb-tuned");

    const calls = { n: 0 };
    const judge: Judge = {
      async evaluate() { calls.n += 1; return [{ id: "fire_is_real", probability: 0.80 }]; },
    };
    const gate = new FireGate({ judge, now: () => 1000 });
    const fire: Fire = {
      ruleId: "*dumb", cls: "dumb", shape: "blind edit", tool: "edit",
      target: "src/omp/kernel-v2.ts", evidence: "queriedBefore=false",
    };
    const ctx = absorbContext(fire, [
      { kind: "reasoning", text: "because the kernel file is next", offsetMs: -100 },
    ]);
    const d1 = await gate.judge(fire, ctx);
    expect(calls.n).toBe(1);
    expect(d1.probability).toBeCloseTo(0.80, 6);
    expect(d1.band).toBe("act");            // 0.80 >= act 0.75 → FIRE
    expect(d1.action).toBe("FIRE");

    // ── THE HUMAN EDITS THE FILE. No rebuild. No restart. ──────────────────
    // ★ THE VERSION IS A *SCHEMA* VERSION, NOT A CONTENT REVISION. The first version of
    //   this test bumped it to 2 to signal "something changed" — and the P0 fix
    //   (a reader must refuse a shape it does not understand) correctly rejected it.
    //   A threshold edit changes the CONTENT; the schema is unchanged, so the version
    //   stays 1 and `changed` is detected by comparing the content.
    writePolicyFile(p, aFile({ version: 1, policies: { "*dumb": { ...A_POLICY, name: "dumb-tightened", act: 0.90 } } }));
    const r = store.reload();
    expect(r.changed).toBe(true);           // ★ the edit was SEEN
    expect(r.version).toBe(1);              // the SCHEMA version is unchanged
    expect(store.get("*dumb")!.name).toBe("dumb-tightened");

    // ★ THE SAME STORED PROBABILITY, RE-BANDED UNDER THE NEW POLICY.
    const row = d1.row;
    const re = gate.reroute(row, store.get("*dumb")!);
    expect(re.probability).toBeCloseTo(0.80, 6);   // the probability is UNCHANGED
    expect(re.band).toBe("escalate");               // ★ 0.80 < act 0.90 → ESCALATE
    expect(re.action).toBe("ESCALATE");
    expect(re.policyName).toBe("dumb-tightened");
    expect(re.actThreshold).toBeCloseTo(0.90, 6);
    expect(re.costUsd).toBe(0);
    // ★★ AND NO RE-INFERENCE HAPPENED — the model was asked exactly once.
    expect(calls.n).toBe(1);
  });

  test("test_policy_reload_reports_unchanged — reloading an unedited file is a no-op", () => {
    const p = path.join(tmpDir(), "stable.json");
    writePolicyFile(p, aFile({ policies: { "*dumb": A_POLICY } }));
    const store = new PolicyStore(p);
    expect(store.reload().changed).toBe(false);
    expect(store.version()).toBe(1);
  });

  test("test_policy_absent_rule_falls_to_the_class_seed — the documented seed path", () => {
    const p = path.join(tmpDir(), "partial.json");
    writePolicyFile(p, aFile({ policies: { "*dumb": A_POLICY } }));
    const store = new PolicyStore(p);
    expect(store.get("*dumb")!.name).toBe("dumb-tuned");
    // a rule with no entry in the file: the class seed is the documented
    // fallback — and the seed is the CODE's, not a silent default invented here.
    expect(store.get("*theatrical")).toBeUndefined();
    expect(SEED_POLICY["theatrical"]).toBeDefined();
  });

  test("test_policy_default_file_is_loadable — the shipped recipes parse", () => {
    const p = path.join(tmpDir(), "policies.json");
    writePolicyFile(p, DEFAULT_POLICY_FILE);
    const store = new PolicyStore(p);
    store.validate();                        // throws on any invalid policy
    expect(store.version()).toBe(DEFAULT_POLICY_FILE.version);
    // every seeded class has a recipe, so the shipped file is complete
    for (const cls of ["dumb", "theatrical", "destructive"]) {
      expect(store.get(`*${cls}`)).toBeDefined();
    }
  });
});
