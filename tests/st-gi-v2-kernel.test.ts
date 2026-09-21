// st-gi-v2-kernel — WAVE 3 GATE: the RSI reflex layer (T-7) with VERIFIED
// RETIREMENT. The two assertions that matter are the two ATTACKS:
//
//   SC-4  a forged row is ABSENT to the reader — and the test that asserts it
//         goes RED when the signature check is removed (the mutation proof).
//   SC-5  an unsigned supersede is IGNORED — the victim row STAYS LIVE. This is
//         the disablement hole a live attack found on 2026-09-21: signature
//         checks stop INJECTION but do nothing about DISABLEMENT, because the
//         attacker only has to touch the victim's row.
import { describe, test, expect, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  DEFAULT_THRESHOLDS,
  RsiStore,
  deriveTier,
  type ReflexRow,
} from "../src/omp/rsi.ts";

let seq = 0;
function newStore(): { store: RsiStore; dir: string } {
  seq += 1;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `gi-rsi-${seq}-`));
  const store = new RsiStore({
    storePath: path.join(dir, "rsi.sqlite"),
    keyPath: path.join(dir, ".kernel.key"),
  });
  return { store, dir };
}

const R = (id: string, label = "claim with zero spans") => ({
  canonicalId: id, kind: "REFLEX" as const, label,
  evidenceQuote: "the actual claim + the absence proof", confidence: 0.5,
});

describe("st-gi-v2-kernel: W3 — the RSI reflex layer", () => {
  // ── SC-4: a forged row is ABSENT (the INJECTION attack) ──────────────────
  test("sc4_a_forged_row_does_not_verify_and_is_ABSENT_to_the_reader", () => {
    const { store } = newStore();
    try {
      store.write(R("gi:reflex:theatrical:unbound-claim"), "rsi-1");
      // the attack, in its REAL two-step shape (proven live 2026-09-21): the
      // partial unique index blocks a bare insert, so the attacker must first
      // retire the victim, THEN insert its own live row.
      store.forceSupersedeForTest("gi:reflex:theatrical:unbound-claim", "rsi-99");
      store.forgeForTest(
        { canonicalId: "gi:reflex:theatrical:unbound-claim", kind: "RETIRED", createdRun: "rsi-99" },
        "deadbeef".repeat(8),
      );
      const all = store.allRows();
      expect(all.length).toBe(2);                       // the forged row IS in the file
      // The NAIVE live view is EMPTY — that is the attack's whole effect: the
      // real row now reads as superseded and the forged row does not verify.
      expect(store.live().length).toBe(0);
      const forged = all.filter((r) => r.createdRun === "rsi-99");
      expect(forged).toHaveLength(1);
      expect(store.verify(forged[0]!)).toBe(false);     // ← the mutation target
      // The VERIFIED-RETIREMENT reader recovers the real row from the wreckage.
      const recovered = store.liveIncludingForgedRetirement("gi:reflex:theatrical:unbound-claim");
      expect(recovered).not.toBeNull();
      expect(recovered!.kind).toBe("REFLEX");
      expect(recovered!.createdRun).toBe("rsi-1");
    } finally {
      store.close();
    }
  });

  test("sc4_a_TAMPERED_row_fails_verification", () => {
    const { store } = newStore();
    try {
      store.write(R("gi:reflex:dumb:blind-edit"), "rsi-1");
      const row = store.allRows()[0]!;
      expect(store.verify(row)).toBe(true);
      // flip ONE field: the signature covers the canonical byte form
      const tampered: ReflexRow = { ...row, confidence: 0.99 };
      expect(store.verify(tampered)).toBe(false);
    } finally {
      store.close();
    }
  });

  test("sc4_a_MALFORMED_sig_is_REJECTED_not_a_RangeError", () => {
    // Found by the first live-store run: crypto.timingSafeEqual THROWS on a
    // length mismatch, so a hostile row with a short sig crashed the verifier
    // instead of being ABSENT. The unit tests missed it because every fixture
    // used a well-formed 64-char sig.
    const { store } = newStore();
    try {
      store.write(R("gi:reflex:malformed"), "rsi-1");
      // the same two-step attack shape: the partial unique index requires the
      // victim be retired before a second live row can exist.
      store.forceSupersedeForTest("gi:reflex:malformed", "rsi-99");
      store.forgeForTest({ canonicalId: "gi:reflex:malformed", kind: "RETIRED", createdRun: "rsi-99" }, "deadbeef");
      const rows = store.allRows();
      const short = rows.find((r) => r.sig.length < 64)!;
      expect(short).toBeTruthy();
      expect(() => store.verify(short)).not.toThrow();   // ← the defect
      expect(store.verify(short)).toBe(false);           // and it is ABSENT
      expect(() => store.live()).not.toThrow();          // the reader survives
    } finally {
      store.close();
    }
  });

  // ── SC-5: an unsigned supersede is IGNORED (the DISABLEMENT attack) ──────
  test("sc5_an_unsigned_supersede_is_IGNORED_the_row_STAYS_LIVE", () => {
    const { store } = newStore();
    try {
      store.write(R("gi:reflex:theatrical:unbound-claim"), "rsi-1");
      // the attack: retire the victim by touching ITS row (no valid successor)
      store.forceSupersedeForTest("gi:reflex:theatrical:unbound-claim", "rsi-99");
      // the na(row|ive) reader — superseded_run IS NULL — sees NOTHING:
      expect(store.live().length).toBe(0);
      // the VERIFIED reader honors the row's own validity over the claim on it:
      const survivor = store.liveIncludingForgedRetirement("gi:reflex:theatrical:unbound-claim");
      expect(survivor).not.toBeNull();
      expect(survivor!.kind).toBe("REFLEX");
      expect(survivor!.supersededRun).toBe("rsi-99");   // forged, and ignored
    } finally {
      store.close();
    }
  });

  test("sc5_a_VERIFIED_supersede_is_honored", () => {
    const { store } = newStore();
    try {
      store.write(R("gi:reflex:theatrical:unbound-claim"), "rsi-1");
      store.appendOutcome("gi:reflex:theatrical:unbound-claim", "confirmed", "spans found later");
      const next = store.supersede("gi:reflex:theatrical:unbound-claim", "rsi-2");
      expect(next).not.toBeNull();                      // the belief changed → a new row
      const survivor = store.liveIncludingForgedRetirement("gi:reflex:theatrical:unbound-claim");
      expect(survivor!.createdRun).toBe("rsi-2");       // the new belief is live
      // BOTH rows survive — the history is queryable, the old one superseded
      expect(store.allRows().length).toBe(2);
      expect(store.allRows()[0]!.supersededRun).toBe("rsi-2");
    } finally {
      store.close();
    }
  });

  // ── SC-4: precision RECOMPUTED, never incremented ────────────────────────
  test("sc4_precision_is_recomputed_from_the_appended_ledger", () => {
    const { store } = newStore();
    try {
      const id = "gi:reflex:dumb:blind-edit";
      store.write(R(id), "rsi-1");
      expect(store.recount(id)).toEqual({ confirmed: 0, refuted: 0, unresolved: 0 });
      const at = new Date().toISOString();
      store.appendFiring(id, at);
      expect(store.recount(id)).toEqual({ confirmed: 0, refuted: 0, unresolved: 1 });
      store.appendOutcome(id, "confirmed", "repaired in-session");
      store.appendOutcome(id, "confirmed", "second detector agreed");
      store.appendOutcome(id, "refuted", "permitted downstream, no harm");
      // the ledger is the truth: 2 confirmed, 1 refuted, 1 unresolved
      expect(store.recount(id)).toEqual({ confirmed: 2, refuted: 1, unresolved: 1 });
      // and the outcome rows are APPEND-ONLY — nothing was updated in place
      const d = deriveTier(2, 1, 1);
      expect(d.precision).toBeCloseTo(2 / 3, 6);
      expect(d.fires).toBe(4);
      expect(d.unresolvedRatio).toBeCloseTo(0.25, 6);
    } finally {
      store.close();
    }
  });

  // ── the tier ladder: HOLD never promotes ─────────────────────────────────
  test("t7_hold_never_promotes_and_retirement_is_bounded", () => {
    // one lucky firing must NOT promote
    const lucky = deriveTier(1, 0, 0);
    expect(lucky.precision).toBe(1);
    expect(lucky.tier).toBe("HOLD");                       // fires < guardMinFires
    // enough fires + precision + low unresolved → GUARD
    const guard = deriveTier(19, 1, 2);
    expect(guard.tier).toBe("GUARD");
    // high unresolved blocks promotion even at perfect precision: 11 unknown
    // against 10 known is more than half unknown — no basis to act on.
    expect(deriveTier(10, 0, 11).tier).toBe("HOLD");
    // and the REFLEX floor is a real floor: two firings is still noise
    expect(deriveTier(2, 0, 0).tier).toBe("HOLD");
    expect(deriveTier(3, 0, 0).tier).toBe("REFLEX");
    // precision below the reflex floor after ENOUGH fires → RETIRED; before
    // that many it is still HOLD (retirement also needs evidence)
    expect(deriveTier(4, 6, 0).tier).toBe("HOLD");
    expect(deriveTier(8, 12, 0).tier).toBe("RETIRED");
    // and the thresholds are declared, never magic
    expect(DEFAULT_THRESHOLDS.guardPrecision).toBe(0.9);
    expect(DEFAULT_THRESHOLDS.guardMinFires).toBe(10);
  });

  // ── the chain ────────────────────────────────────────────────────────────
  test("t7_rows_chain_and_each_links_the_prior", () => {
    const { store } = newStore();
    try {
      store.write(R("gi:reflex:a"), "rsi-1");
      store.write(R("gi:reflex:b"), "rsi-1");
      store.write(R("gi:reflex:c"), "rsi-1");
      const rows = store.allRows();
      expect(rows.length).toBe(3);
      expect(rows[0]!.prevHash).toBe("GENESIS");
      expect(rows[1]!.prevHash).toBe(rows[0]!.sig);
      expect(rows[2]!.prevHash).toBe(rows[1]!.sig);
      for (const r of rows) expect(store.verify(r)).toBe(true);
    } finally {
      store.close();
    }
  });

  test("t7_the_key_is_0600_and_the_store_dir_is_0700", () => {
    const { store, dir } = newStore();
    try {
      const keyPath = path.join(dir, ".kernel.key");
      const keyMode = fs.statSync(keyPath).mode & 0o777;
      const dirMode = fs.statSync(dir).mode & 0o777;
      expect(keyMode).toBe(0o600);
      expect(dirMode).toBe(0o700);
      expect(fs.readFileSync(keyPath).length).toBe(32);
    } finally {
      store.close();
    }
  });
});
