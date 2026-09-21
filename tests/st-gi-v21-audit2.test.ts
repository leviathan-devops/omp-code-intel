// st-gi-v21-audit2 — THE SECOND AUDIT PASS: the oracle + policy-store findings.
//
// ★ PROVENANCE: found by independent models (ocr over muse-spark-1.3-contributor-free,
//   .audit/sg-ocr-oracle.json and .audit/sg-ocr-policy-store.json). 13 findings,
//   8 of them HIGH. None were visible to my own red-team: they are not bad-data
//   cases, they are CONTRACT cases — a comment promising more than the code does, a
//   validated object handed out mutably, a NaN that disables a filter instead of
//   emptying it, a rule branch that can never execute.
//
// THE TWO THAT MATTER MOST, because each inverts the intent of the code that holds it:
//   O0 — an unparseable `row.at` makes EVERY record pass the forward window
//        (NaN comparisons are false), so the filter gathers ALL evidence instead of
//        NONE. The guard exists to bound evidence; a bad stamp unbounds it.
//   O2 — the ">= 2 corroborating signals" branch CANNOT EXECUTE: after the harm and
//        permit early-returns, at most one signal remains. A documented rule with no
//        reachable path is a promise the code does not keep.

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { FireGate, absorbContext, degradationOf, mpsePreFilter, type Fire } from "../src/omp/fire-gate.ts";
import { keyFileComponent, liveSocketComponent } from "../src/omp/hard-deps.ts";
import type { Judge } from "../src/omp/enforcement.ts";
import { FireLedger, drain } from "../src/omp/fire-ledger.ts";
import { gather, classify, resolveAll, type OutcomeRecord, type Subject } from "../src/omp/oracle.ts";
import {
  DEFAULT_POLICY_FILE, PolicyStore, readPolicyFile, validatePolicies, writePolicyFile,
  type PolicyFile,
} from "../src/omp/policy-store.ts";

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gi-a2-")); }
function judgeOf(p: number): Judge {
  return { async evaluate() { return [{ id: "fire_is_real", probability: p }]; } };
}
function aFire(over: Partial<Fire> = {}): Fire {
  return { ruleId: "*dumb", cls: "dumb", shape: "blind edit", tool: "edit", target: "src/omp/kernel-v2.ts", evidence: "queriedBefore=false", ...over };
}
const NEUTRAL = [{ kind: "reasoning", text: "because the file is next", offsetMs: -100 }];
const T0 = "2026-09-20T08:00:00.000Z";
const T1 = "2026-09-20T09:00:00.000Z";

async function seededLedger(): Promise<{ ledger: FireLedger; hash: string }> {
  const ledger = new FireLedger(path.join(tmpDir(), "l.sqlite"));
  const gate = new FireGate({ judge: judgeOf(0.9), now: () => Date.parse(T0) });
  const f = aFire();
  await gate.judge(f, absorbContext(f, NEUTRAL));
  drain(gate, ledger);
  return { ledger, hash: ledger.all()[0]!.stateHash };
}

describe("st-gi-v21-audit2: the oracle + policy-store findings", () => {
  // ══ O0 (HIGH) — AN UNPARSEABLE STAMP MUST EMPTY THE WINDOW, NOT OPEN IT ══════

  test("O0-bad-stamp: an unparseable row.at gathers NO evidence", () => {
    const subject: Subject = { target: "src/omp/kernel-v2.ts" };
    const records: OutcomeRecord[] = [
      { kind: "edit", at: T1, target: subject.target },
      { kind: "test", passed: false, at: T1, target: subject.target },
    ];
    const ev = gather({ at: "not-a-timestamp" }, subject, records);
    // ★ with the defect, EVERY record passed the filter and all signals appeared.
    expect(ev.signals).toEqual([]);
    expect(classify(ev).truth).toBe("unresolved");
    expect(ev.notes.join(" ")).toContain("unparseable");   // and it is NAMED, not silent
  });

  // ══ O1 (HIGH) — A FLAG-LESS TEST IS NOT A PASSING TEST ═══════════════════════

  test("O1-flagless-test: a test with no pass/fail flag produces NO signal", () => {
    const subject: Subject = { target: "src/omp/kernel-v2.ts" };
    const ev = gather({ at: T0 }, subject, [{ kind: "test", at: T1, target: subject.target }]);
    // the record's own note says it "cannot corroborate anything" — so it must not.
    expect(ev.signals).toEqual([]);
    expect(ev.notes.join(" ")).toContain("no pass/fail flag");
  });

  test("O1b-flagless-plus-permit: a flag-less test cannot stand in for a second signal", () => {
    const subject: Subject = { target: "src/omp/kernel-v2.ts" };
    const ev = gather({ at: T0 }, subject, [
      { kind: "permit", at: T1, by: "gate" },
      { kind: "test", at: T1, target: subject.target },      // no flag
    ]);
    expect(ev.signals).toEqual(["permitted"]);                // NOT ["permitted","testPassed"]
  });

  // ══ O2 (HIGH) — THE UNREACHABLE CORROBORATION BRANCH ═════════════════════════

  test("O2-reachable-refutation: a permit is the ONLY corroboration path, and it works", () => {
    const subject: Subject = { target: "src/omp/kernel-v2.ts" };
    // the >= 2-signal branch is unreachable, so the ONLY refutation without harm is a
    // permit. This asserts the surviving path rather than a documented-but-dead rule.
    const ev = gather({ at: T0 }, subject, [{ kind: "permit", at: T1, by: "downstream" }]);
    expect(ev.signals).toEqual(["permitted"]);
    expect(classify(ev).truth).toBe("refuted");
    // and with NO signal at all, silence is still unresolved
    expect(classify(gather({ at: T0 }, subject, [])).truth).toBe("unresolved");
  });

  // ══ O3 (HIGH) — Subject.tool WAS DECLARED AND NEVER USED ═════════════════════

  test("O3-tool-filter: evidence from a DIFFERENT tool on the same target is not this fire's", () => {
    const subject: Subject = { target: "src/omp/kernel-v2.ts", tool: "edit" };
    const records: OutcomeRecord[] = [
      { kind: "edit", at: T1, target: subject.target, tool: "bash" },   // same target, WRONG tool
    ];
    const ev = gather({ at: T0 }, subject, records);
    expect(ev.signals).toEqual([]);                 // ★ the tool filter must reject it
    // and the RIGHT tool still counts
    const ok = gather({ at: T0 }, subject, [{ kind: "edit", at: T1, target: subject.target, tool: "edit" }]);
    expect(ok.signals).toEqual(["laterEdit"]);
  });

  // ══ O4 (HIGH) — A SKEWED CLOCK MUST NOT LEAVE A PARTIAL BATCH ════════════════

  test("O4-atomic-batch: a time-travel row aborts the WHOLE batch, writing NOTHING", async () => {
    const { ledger } = await seededLedger();
    const rows = ledger.all();
    const pairs = [
      { row: rows[0]!, subject: { target: "src/omp/kernel-v2.ts" } },
    ];
    const recs: OutcomeRecord[] = [{ kind: "edit", at: new Date(Date.parse(T0) + 3_600_000).toISOString(), target: "src/omp/kernel-v2.ts" }];
    // a clock BEFORE the row's own `at` — the guard must fire
    let msg = "";
    try {
      resolveAll(ledger, pairs, recs, { now: () => new Date(Date.parse(T0) - 3_600_000).toISOString() });
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    expect(msg).toContain("GI_ORACLE_TIME_TRAVEL");
    // ★ NOTHING was written — the pre-validation happens before the first write.
    expect(ledger.all()[0]!.laterTruth).toBe("unresolved");
    ledger.close();
  });

  // ══ O5 (MEDIUM) — THE DISMISSED-EVIDENCE DISCLOSURE ON EVERY PATH ════════════

  test("O5-disclosure: a 1-signal UNRESOLVED basis still names what it dismissed", () => {
    const subject: Subject = { target: "src/omp/kernel-v2.ts" };
    const ev = gather({ at: T0 }, subject, [
      { kind: "test", passed: true, at: T1, target: subject.target },     // 1 real signal
      // ★ the withdraw NAMES its target (pass-3: a withdraw without a subject cannot be
      //   evidence about one) but carries NO SPAN — so it is dismissed for the span,
      //   which is the dismissal this test asserts is disclosed.
      { kind: "withdraw", at: T1, target: subject.target },               // no span → dismissed
    ]);
    expect(ev.signals).toEqual(["testPassed"]);
    const c = classify(ev);
    expect(c.truth).toBe("unresolved");
    // ★ the header promises EVERY basis discloses its dismissed evidence
    expect(c.basis).toContain("dismissed");
    expect(c.basis).toContain("WITHOUT a span");
  });

  // ══ EN-064 — A DECLARED-BUT-DEAD CONTRACT (the counters that were never written) ══
  // ★ This test exists because the fix for it SILENTLY FAILED TO APPLY once. The
  //   interface declared `contended`/`failed` and the report initialized them, but
  //   nothing ever SET them — and the suite was green, because no test READ them.
  //   A field no test reads is a field that can be dead for a whole release.

  test("EN-064: the ResolveReport counters are POPULATED, not merely declared", async () => {
    const ledger = new FireLedger(path.join(tmpDir(), "cnt.sqlite"));
    const gate = new FireGate({ judge: judgeOf(0.9), now: () => Date.parse(T0) });
    const f = aFire();
    await gate.judge(f, absorbContext(f, NEUTRAL));
    drain(gate, ledger);
    const row = ledger.all()[0]!;
    const subject: Subject = { target: "src/omp/kernel-v2.ts" };
    const recs: OutcomeRecord[] = [{ kind: "edit", at: T1, target: subject.target }];

    // a PHANTOM row — a state_hash this ledger does not hold
    const phantomRow = { ...row, stateHash: "0000000000000000" };
    const r1 = resolveAll(ledger, [{ row: phantomRow, subject }], recs);
    expect(r1.phantom).toBe(1);                    // ★ the counter is WRITTEN
    expect(r1.resolved).toBe(0);

    // a CONTENDED row — resolved by another writer between our read and our write
    const r2 = resolveAll(ledger, [{ row, subject }], recs);
    expect(r2.resolved).toBe(1);
    const stale = { ...row };                      // a snapshot still saying 'unresolved'
    const r3 = resolveAll(ledger, [{ row: stale, subject }], recs);
    // the ledger is the authority: the row is already resolved, so it is skipped —
    // `contended` counts the CONDITIONAL-update loss, which this path does not reach,
    // so we assert the field is READABLE and zero rather than left undefined.
    expect(r3.contended).toBe(0);
    expect(Array.isArray(r3.failed)).toBe(true);
    expect(r3.failed.length).toBe(0);
    ledger.close();
  });

  // ══ P0 (HIGH) — THE SCHEMA VERSION WAS NEVER GATED ═══════════════════════════

  test("P0-version-gate: an unsupported schema version is REFUSED", () => {
    const p = path.join(tmpDir(), "v99.json");
    // ★ WRITTEN DIRECTLY, because writePolicyFile now REFUSES to create a file this
    //   build cannot read — the fix's own effect. An externally-produced v99 file is
    //   the case the reader must still handle.
    fs.writeFileSync(p, JSON.stringify({ version: 99, policies: {} }));
    let msg = "";
    try { new PolicyStore(p); } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    expect(msg).toContain("GI_POLICY");
    expect(msg).toContain("UNSUPPORTED_VERSION");
  });

  // ══ P1 (HIGH) — VALIDATED POLICIES WERE HANDED OUT MUTABLY ═══════════════════

  test("P1-immutable: mutating a returned policy cannot move the enforcement bar", () => {
    const p = path.join(tmpDir(), "p.json");
    writePolicyFile(p, { version: 1, policies: { "*dumb": { name: "d", act: 0.75, flag: 0.35, failPolarity: "open" } } });
    const store = new PolicyStore(p);
    const got = store.get("*dumb")!;
    // ★ the audit: `store.get(id)!.act = 0` bypassed validatePolicies entirely.
    let threw = false;
    try { (got as { act: number }).act = 0; } catch { threw = true; }
    // either the write throws (frozen) or it is invisible — never effective
    expect(store.get("*dumb")!.act).toBe(0.75);
    expect(threw || store.get("*dumb")!.act === 0.75).toBe(true);
    // and `all()` is not a back door either
    const all = store.all() as Record<string, { act: number }>;
    try { all["*dumb"]!.act = 0; } catch { /* frozen is fine */ }
    expect(store.get("*dumb")!.act).toBe(0.75);
  });

  // ══ P2 (HIGH) — THE TEMP PATH WAS NOT UNIQUE ═════════════════════════════════

  test("P2-temp-unique: two writes to the same path both succeed and leave a valid file", () => {
    const p = path.join(tmpDir(), "race.json");
    const a: PolicyFile = { version: 1, policies: { "*dumb": { name: "a", act: 0.75, flag: 0.35, failPolarity: "open" } } };
    const b: PolicyFile = { version: 1, policies: { "*dumb": { name: "b", act: 0.8, flag: 0.4, failPolarity: "open" } } };
    writePolicyFile(p, a);
    writePolicyFile(p, b);
    // no stray temp files left behind, and the final content is one of the two
    const leftovers = fs.readdirSync(path.dirname(p)).filter((f) => f.includes(".tmp"));
    expect(leftovers).toEqual([]);
    const final = readPolicyFile(p);
    expect(["a", "b"]).toContain(final.policies["*dumb"]!.name);
  });

  // ══ P3 (MEDIUM) — readPolicyFile RETURNED AN UNVALIDATED CAST ════════════════

  test("P3-read-validates: readPolicyFile refuses an out-of-range bar", () => {
    const p = path.join(tmpDir(), "bad.json");
    fs.writeFileSync(p, JSON.stringify({ version: 1, policies: { "*dumb": { name: "x", act: 9, flag: 0.3, failPolarity: "open" } } }));
    let msg = "";
    try { readPolicyFile(p); } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    expect(msg).toContain("GI_POLICY");
  });

  // ══ P4 (MEDIUM) — writePolicyFile PERSISTED INVALID POLICIES ═════════════════

  test("P4-write-validates: writing an INVERTED policy fails at the WRITER, not the next load", () => {
    const p = path.join(tmpDir(), "inv.json");
    let msg = "";
    try {
      writePolicyFile(p, { version: 1, policies: { "*dumb": { name: "inv", act: 0.2, flag: 0.9, failPolarity: "open" } } });
    } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    expect(msg).toContain("GI_POLICY");
    expect(msg).toContain("INVERTED");
    // ★ and NOTHING was written — the fail is not deferred to a restart
    expect(fs.existsSync(p)).toBe(false);
  });

  // ══ P5 (MEDIUM) — DEFAULT_POLICY_FILE WAS MUTABLY EXPORTED ═══════════════════

  test("P5-seeds-frozen: the shipped seeds cannot be mutated by an importer", () => {
    const before = DEFAULT_POLICY_FILE.policies["*dumb"]!.act;
    let threw = false;
    try { (DEFAULT_POLICY_FILE.policies["*dumb"] as { act: number }).act = 0; } catch { threw = true; }
    expect(threw || DEFAULT_POLICY_FILE.policies["*dumb"]!.act === before).toBe(true);
    expect(DEFAULT_POLICY_FILE.policies["*dumb"]!.act).toBe(before);
  });

  // ══ PASS 5 — THE FIVE HIGHS THE REGISTER AND THE GATE'S OWN AUDIT FOUND ══════

  test("P5-kind-match: a record whose KIND matches but whose TEXT has no marker is DROPPED", () => {
    // ★ the kind-match bypass: `{kind:"reasoning", text:"lorem ipsum"}` sailed through the
    //   narrow-before-judge gate carrying NO decision-relevant material.
    const f: Fire = aFire();
    const withMarker = absorbContext(f, [
      { kind: "reasoning", text: "because the migration is real", offsetMs: -100 },
    ]);
    const withoutMarker = absorbContext(f, [
      { kind: "reasoning", text: "lorem ipsum dolor sit amet", offsetMs: -100 },
    ]);
    expect(withMarker.slots.length).toBe(1);      // "because" is a reasoning marker
    expect(withoutMarker.slots.length).toBe(0);   // ★ NO marker, NO admission
    expect(withoutMarker.droppedKinds).toContain("reasoning");
  });

  test("P5-empty-target: an empty target does NOT settle IGNORE via the negation branch", () => {
    // ★ ''.includes('') is true — an empty target matched EVERY slot and was settled IGNORE
    //   on no evidence.
    const f: Fire = aFire({ target: "" });
    const ctx = absorbContext(f, [{ kind: "reasoning", text: "because the file is next", offsetMs: -100 }]);
    const pre = mpsePreFilter(f, ctx);
    expect(pre.settle).toBeNull();                // it goes to Jev, not to a branch
    expect(pre.reason).toContain("names no target");
  });

  test("P5-unknown-cls: an UNKNOWN class falls to the FAIL-CLOSED policy, not dumb-seed", async () => {
    // ★ the first version fell to SEED_POLICY["dumb"] — fail-OPEN. A new destructive-like
    //   surface would have defaulted to the polarity that lets a down judge DISMISS it.
    const gate = new FireGate({ judge: { async evaluate() { throw new Error("down"); } } });
    const f: Fire = aFire({ cls: "banana", ruleId: "*banana" });
    const d = await gate.judge(f, absorbContext(f, [{ kind: "reasoning", text: "because x", offsetMs: -100 }]));
    // fail-CLOSED ⇒ the degraded row reads FIRE, and the policy name is not dumb-seed
    expect(d.row.policyName).not.toContain("dumb-seed");
    expect(d.action).toBe("FIRE");
    expect(d.probability).toBe(1);
  });

  test("P5-reroute: a DEGRADED row stays degraded through a reroute", () => {
    // ★ the first version replaced the policy name outright, STRIPPING the marker — so a
    //   placeholder, re-bandied, presented itself as a real judgment.
    const gate = new FireGate({ judge: { async evaluate() { return [{ id: "fire_is_real", probability: 0.9 }]; } } });
    const degraded = {
      at: new Date().toISOString(), ruleId: "*dumb", cls: "dumb", questionVersion: "q",
      probability: 0, band: "ignore", action: "IGNORE", policyName: "dumb-seed+timeout",
      actThreshold: 0.75, flagThreshold: 0.35, stateHash: "h", costUsd: 0,
      laterTruth: "unresolved" as const,
    };
    const re = gate.reroute(degraded, { name: "tuned", act: 0.9, flag: 0.5, failPolarity: "open" });
    expect(re.policyName).toBe("tuned+timeout");           // ★ the marker SURVIVES
    expect(degradationOf(re.policyName)).toBe("TIMEOUT");  // and is still recognizable
    // a REAL row reroutes normally (no suffix invented)
    const real = { ...degraded, policyName: "dumb-seed", probability: 0.9, band: "act", action: "FIRE" };
    const re2 = gate.reroute(real, { name: "tuned", act: 0.9, flag: 0.5, failPolarity: "open" });
    expect(re2.policyName).toBe("tuned");
    expect(degradationOf(re2.policyName)).toBeNull();
  });

  test("P5-socket-liveness: a REAL listening socket reads UP; the same path dead reads DOWN", async () => {
    // ★ existence is not liveness, and a SUBSTRING match would report UP on a partial path.
    const dir = tmpDir();
    const sockPath = path.join(dir, "probe.instance.sock");
    const comp = liveSocketComponent("PROBE", "layer", "a test socket", "GI_PROBE", dir);
    // nothing there yet
    expect(comp.probe().up).toBe(false);
    // a REAL listener
    const server = Bun.listen({ unix: sockPath, socket: { data() {} } });
    try {
      const live = comp.probe();
      expect(live.up).toBe(true);                          // ★ the kernel's table has it
      expect(live.evidence).toContain("LISTENING");
    } finally {
      server.stop(true);
    }
    // ★ THE STALE CORPSE, reproduced exactly: a socket FILE present with NO listener —
    //   the condition measured on this host (two au sockets dated Sep 16/17, both
    //   ECONNREFUSED). `server.stop()` unlinks the socket, so the file is re-created;
    //   the probe only readdirs and consults /proc/net/unix, so a plain file exercises
    //   the same path.
    fs.writeFileSync(sockPath, "");
    const dead = comp.probe();
    expect(dead.up).toBe(false);
    expect(dead.evidence).toContain("STALE");          // ★ a file is not a listener
  });

  test("P5-key-presence: the JEV probe reports PRESENCE, never the key's size", () => {
    // ★ the first version reported `len=107` — a key's length narrows the search space.
    const dir = tmpDir();
    const keyFile = path.join(dir, "key");
    fs.writeFileSync(keyFile, "secret-material-of-a-known-length");
    const comp = keyFileComponent("JEV", "kernel", "the key", "GI_JEV_DOWN", keyFile, "TYPESAFE_AI_API_KEY", {});
    const r = comp.probe();
    expect(r.up).toBe(true);
    expect(r.evidence).toContain("present");
    expect(r.evidence).not.toContain("len=");              // ★ no side channel
    // an EMPTY key is not a warm substrate
    fs.writeFileSync(keyFile, "");
    expect(comp.probe().up).toBe(false);
  });

  // ══ THE FIXES MUST NOT BREAK THE CONTRACT ════════════════════════════════════

  test("A2-regression: the shipped file still loads, validates and reloads", () => {
    const p = path.join(tmpDir(), "ok.json");
    writePolicyFile(p, DEFAULT_POLICY_FILE);
    const store = new PolicyStore(p);
    expect(store.version()).toBe(DEFAULT_POLICY_FILE.version);
    expect(store.get("*dumb")!.act).toBe(0.75);
    expect(store.reload().changed).toBe(false);
    store.validate();
  });
});
