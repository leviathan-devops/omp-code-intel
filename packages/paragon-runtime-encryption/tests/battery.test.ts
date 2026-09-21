// THE BATTERY — pins the LAWS, not the lines. 15 tests: the 8 mandated
// (T1–T8) + ledger/anchor/config/secrets/limit coverage (T9–T15).
import { describe, expect, test, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { KernelStore, verifyHooks, runLe, runGt } from "../src/index";
import { freshStore, rmDir, THEATRICAL, STRUCTURAL } from "./helpers";

let dirs: string[] = [];
let open: KernelStore[] = [];
function rig() {
  const r = freshStore();
  dirs.push(r.dir);
  open.push(r.store);
  return r;
}
afterEach(() => {
  for (const s of open.splice(0)) {
    try {
      s.close();
    } catch {}
  }
  for (const d of dirs.splice(0)) rmDir(d);
  verifyHooks.compare = ((a: string, b: string) => {
    if (a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
  }) as typeof verifyHooks.compare;
});

function seedTwo(store: KernelStore) {
  const r1 = store.write({
    entityId: THEATRICAL,
    kind: "Reflex",
    label: 'claim "tests pass" with zero bound spans',
    evidenceQuote: "the claim + the absence proof (0 spans)",
    confidence: 0.95,
    confirmed: 19,
    refuted: 1,
    unresolved: 3,
    createdRun: "run-7",
  });
  const r2 = store.write({
    entityId: STRUCTURAL,
    kind: "Guard",
    label: "structural edit to a symbol with no prior query",
    evidenceQuote: "edit w.ts:208 with 0 prior graph queries",
    confidence: 0.99,
    confirmed: 31,
    refuted: 1,
    unresolved: 2,
    createdRun: "run-9",
  });
  return { r1, r2 };
}

/** Direct-SQL forgery, reference ATTACK shape: bogus sig, GENESIS chain. */
function forgeRow(store: KernelStore, entityId: string, run: string, label = "AGENT-AUTHORED EXEMPTION"): number {
  const { recordTable: R, idColumn: C } = store.cfg;
  const res = store.db.run(
    `INSERT INTO ${R} (${C}, kind, label, evidence_quote, confidence, confirmed, refuted, unresolved, created_run, superseded_run, prev_hash, sig)
     VALUES (?, 'Retired', ?, 'forged', 1.0, 999, 0, 0, ?, NULL, 'GENESIS', 'deadbeefdeadbeef')`,
    [entityId, label, run],
  );
  return Number((res as unknown as { lastInsertRowid: number | bigint }).lastInsertRowid);
}

describe("paragon-runtime-encryption battery", () => {
  test("T1 write+verify round-trip green", () => {
    const { store } = rig();
    const { r1, r2 } = seedTwo(store);
    expect(store.verify(r1)).toBe(true);
    expect(store.verify(r2)).toBe(true);
    expect(store.readLive(THEATRICAL)?.id).toBe(r1.id);
    expect(store.readLive(STRUCTURAL)?.id).toBe(r2.id);
    expect(store.verifyChain().ok).toBe(true);
  });

  test("T2 forged row rejected", () => {
    const { store } = rig();
    seedTwo(store);
    // Fresh identity: the one-live index (T4) already proves a live twin
    // cannot coexist, so the signature proof needs no index interference.
    const fid = forgeRow(store, "app:reflex:forged-probe", "run-99");
    const forged = store.rawById(fid);
    expect(forged).not.toBeNull();
    expect(store.verify(forged!)).toBe(false);
  });

  test("T3 forged row = ABSENT to the reader", () => {
    const { store } = rig();
    const { r1 } = seedTwo(store);
    // Forge under a FRESH identity so the one-live index cannot interfere:
    // absence must come from verification alone.
    const fid = forgeRow(store, "app:reflex:brand-new", "run-99");
    expect(store.verify(store.rawById(fid)!)).toBe(false);
    expect(store.readLive("app:reflex:brand-new")).toBeNull();
    // ...and a forged twin of a live row cannot even coexist: the one-live
    // index refuses it (reference ATTACK 1) — the real row is undisplaced.
    expect(() => forgeRow(store, THEATRICAL, "run-100")).toThrow(/UNIQUE constraint failed/);
    expect(store.readLive(THEATRICAL)?.id).toBe(r1.id);
  });

  test("T4 ATTACK-1 shape: direct insert blocked by the one-live index", () => {
    const { store } = rig();
    seedTwo(store);
    let err: unknown = null;
    try {
      store.db.run(
        `INSERT INTO ${store.cfg.recordTable} (${store.cfg.idColumn}, kind, label, evidence_quote, confidence, created_run, prev_hash, sig) VALUES (?, 'Reflex', 'dup', 'x', 0.5, 'run-10', 'GENESIS', 'aa')`,
        [THEATRICAL],
      );
    } catch (e) {
      err = e;
    }
    expect(err).not.toBeNull();
    expect(String(err)).toMatch(/UNIQUE constraint failed/);
  });

  test("T5 ATTACK-2 shape: retire-then-forge -> retirement IGNORED, real row STAYS LIVE", () => {
    const { store } = rig();
    const { r1 } = seedTwo(store);
    // Attacker stamps the victim retired FIRST (now zero live rows for the
    // identity, so the one-live index permits the forged successor INSERT —
    // exactly the reference's ATTACK-2 table: id=1 stamped, id=3 live).
    store.db.run(`UPDATE ${store.cfg.recordTable} SET superseded_run = ? WHERE id = ?`, ["run-99", r1.id]);
    const fid = forgeRow(store, THEATRICAL, "run-99");
    expect(store.verify(store.rawById(fid)!)).toBe(false);
    // The fix: supersede by an UNVERIFIED run-99 is IGNORED — row stays live.
    const live = store.readLive(THEATRICAL);
    expect(live).not.toBeNull();
    expect(live!.id).toBe(r1.id);
    expect(live!.kind).toBe("Reflex");
  });

  test("T5b kernel retire still works (verified succession retires)", () => {
    const { store } = rig();
    const { r1 } = seedTwo(store);
    const sup = store.retire(THEATRICAL, "run-11", {
      kind: "Guard",
      label: "promoted",
      evidenceQuote: "precision crossed the bar",
      confidence: 0.97,
    });
    expect(store.verify(sup)).toBe(true);
    expect(store.readLive(THEATRICAL)?.id).toBe(sup.id);
    expect(store.readAsOf(THEATRICAL, "run-7")?.id).toBe(r1.id);
  });

  test("T6 chain break detected at the right row", () => {
    const { store } = rig();
    const { r1 } = seedTwo(store);
    // Tamper with row 2's label behind the kernel's back.
    store.db.run(`UPDATE ${store.cfg.recordTable} SET label = ? WHERE id = ?`, ["tampered", r1.id + 1]);
    const res = store.verifyChain();
    expect(res.ok).toBe(false);
    expect(res.breakAt?.rowId).toBe(r1.id + 1);
    expect(res.breakAt?.reason).toBe("BAD_SIG");
  });

  test("T6b deleted row surfaces as BAD_LINK at the successor", () => {
    const { store } = rig();
    const { r1, r2 } = seedTwo(store);
    void r1;
    store.db.run(`DELETE FROM ${store.cfg.recordTable} WHERE id = ?`, [r1.id]);
    const res = store.verifyChain();
    expect(res.ok).toBe(false);
    expect(res.breakAt?.rowId).toBe(r2.id);
    expect(res.breakAt?.reason).toBe("BAD_LINK");
  });

  test("T7 as-of query returns the right belief", () => {
    const { store } = rig();
    const { r1 } = seedTwo(store);
    const sup = store.retire(THEATRICAL, "run-11", {
      kind: "Guard",
      label: "promoted",
      evidenceQuote: "precision crossed the bar",
      confidence: 0.97,
    });
    expect(store.readAsOf(THEATRICAL, "run-7")?.id).toBe(r1.id);
    expect(store.readAsOf(THEATRICAL, "run-9")?.id).toBe(r1.id);
    expect(store.readAsOf(THEATRICAL, "run-11")?.id).toBe(sup.id);
    expect(store.readAsOf(THEATRICAL, "run-6")).toBeNull();
    expect(runLe("run-7", "run-99")).toBe(true);
    expect(runGt("run-99", "run-9")).toBe(true);
  });

  test("T8 MUTATION: removing the signature check makes T2 FAIL (the test bites)", () => {
    const { store } = rig();
    seedTwo(store);
    // Forge under a FRESH identity so the one-live index cannot interfere:
    // with compare gutted, the forged row reads LIVE — that is the bite.
    const fid = forgeRow(store, "app:reflex:mutant-probe", "run-99");
    const realCompare = verifyHooks.compare;
    verifyHooks.compare = () => true; // MUTANT: every sig "verifies"
    try {
      // T2's expectation (forgery rejected) now FAILS: the mutant trusts it.
      expect(store.verify(store.rawById(fid)!)).toBe(true);
      expect(store.readLive("app:reflex:mutant-probe")?.id).toBe(fid);
      // And the battery's T2 invariant is inverted — the proof it bites:
      expect(store.verify(store.rawById(fid)!)).not.toBe(false);
    } finally {
      verifyHooks.compare = realCompare;
    }
  });

  test("T9 outcome without firing throws LEDGER_NO_FIRING", () => {
    const { store } = rig();
    seedTwo(store);
    expect(() =>
      store.appendOutcome({ entityId: THEATRICAL, firingId: 4242, outcome: "confirmed", outcomeAt: "t1" }),
    ).toThrow("LEDGER_NO_FIRING");
  });

  test("T10 write after tail corruption throws CHAIN_TAIL_UNVERIFIED", () => {
    const { store } = rig();
    seedTwo(store);
    store.db.run(`UPDATE ${store.cfg.recordTable} SET label = 'tampered' WHERE id = 2`);
    expect(() =>
      store.write({
        entityId: "app:reflex:third",
        kind: "Reflex",
        label: "late",
        evidenceQuote: "q",
        confidence: 0.5,
        createdRun: "run-12",
      }),
    ).toThrow("CHAIN_TAIL_UNVERIFIED");
  });

  test("T11 ledger append-only: firing then outcome, precision recomputed", () => {
    const { store } = rig();
    const f1 = store.appendFiring({ entityId: THEATRICAL, firedAt: "t0", verdict: "act", actFingerprint: "fp1" });
    const f2 = store.appendFiring({ entityId: THEATRICAL, firedAt: "t1", verdict: "act", actFingerprint: "fp2" });
    store.appendOutcome({ entityId: THEATRICAL, firingId: f1, outcome: "confirmed", outcomeAt: "t2", outcomeEvidence: "repaired" });
    store.appendOutcome({ entityId: THEATRICAL, firingId: f2, outcome: "refuted", outcomeAt: "t3", outcomeEvidence: "noise" });
    const p = store.precision(THEATRICAL);
    expect(p.confirmed).toBe(1);
    expect(p.refuted).toBe(1);
    expect(p.precision).toBe(0.5);
    // The firing rows are untouched: outcome is a NEW record.
    const rows = store.db.query(`SELECT outcome_at FROM ${store.cfg.ledgerTable} WHERE id IN (?, ?)`).all(f1, f2) as Array<{
      outcome_at: null;
    }>;
    expect(rows.every((r) => r.outcome_at === null)).toBe(true);
  });

  test("T12 anchor writes the head sha to a durable file", () => {
    const { store, dir } = rig();
    const { r2 } = seedTwo(store);
    const p = path.join(dir, "ledger", "head.sha");
    const head = store.anchor(p);
    expect(head).toBe(r2.sig);
    expect(fs.readFileSync(p, "utf8").trim()).toBe(r2.sig);
  });

  test("T13 config is load-bearing: custom names isolate, bad names throw", () => {
    const { store, dir, cfg } = rig();
    seedTwo(store);
    const other = KernelStore.open({ ...cfg, storePath: path.join(dir, "vault", "other.sqlite") });
    open.push(other);
    expect(other.readLive(THEATRICAL)).toBeNull();
    expect(() => KernelStore.open({ storePath: cfg.storePath, keyPath: cfg.keyPath, recordTable: "no-dashes!" })).toThrow(
      "BAD_CONFIG",
    );
  });

  test("T14 key errors are NAMED labels, never key material", () => {
    const { dir } = rig();
    const bad = path.join(dir, "missing.key");
    let msg = "";
    try {
      KernelStore.open({ storePath: path.join(dir, "v", "s.sqlite"), keyPath: bad });
    } catch (e) {
      msg = String(e);
    }
    expect(msg).toMatch(/KEY_ABSENT/);
    expect(msg.length).toBeLessThan(120);
  });

  test("T15 store dir is 0700, key file is 0600", () => {
    const { dir, cfg } = rig();
    expect(fs.statSync(path.dirname(cfg.storePath)).mode & 0o777).toBe(0o700);
    expect(fs.statSync(cfg.keyPath).mode & 0o777).toBe(0o600);
    expect(fs.statSync(cfg.keyPath).size).toBe(32);
    void dir;
    void Database;
  });
}
);
