// st-gi-lsp — ★ W1/W3 THE GI LSP + THE FACT CARDS (GI_KERNEL_V2.3 FR-1, FR-3).
//
// S1: the LSP answers FROM the layers — a didOpen on a real file yields ≥1 diagnostic whose
//     source ∈ GI_LSP_TOKENS.
// S3: the cards are real — UNWIRED fires at 0 inbound edges, and stays SILENT otherwise.
// C5 (the negative): a doc-only file yields ZERO cards (the HUD/LSP card CODE, never docs).
// S4/FR-5: a MEANING card carries the JevK5 confidence; a DOWN judge is FAIL-OPEN (null).
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import {
  callersCard,
  fileCards,
  GI_LSP_TOKENS,
  isCodeFile,
  meaningCard,
  unwiredCard,
  type MeaningJudge,
} from "../src/gi-lsp/cards.ts";
import { diagnosticsFor } from "../scripts/gi-lsp.ts";
import { jevk5Available, jevk5Probe } from "../src/omp/adapters/jevk5.ts";
import type { LayerFact } from "../src/omp/layer-registry.ts";

const REPO = path.resolve(import.meta.dir, "..");
const CORBELL = path.join(REPO, ".omp/graph-intelligence/corbell-checkout/store.sqlite");

describe("st-gi-lsp: W1 THE LSP ANSWERS + W3 THE CARDS", () => {
  test("test_gi_lsp_emits_callers_card", () => {
    // S1 — the LSP answers from the layers (source-roots.ts has real callers in the graph).
    const { cards } = diagnosticsFor(REPO, path.join(REPO, "src/hunter/profile/source-roots.ts"));
    expect(cards.length).toBeGreaterThan(0);
    // every card's source is an LSP token the consumer filters by
    expect(cards.every((c) => (GI_LSP_TOKENS as readonly string[]).includes(c.source))).toBe(true);
    // a CALLERS card carries ≥1 real file:line row (the fabrication anti-pattern: no rows)
    const callers = cards.filter((c) => c.shape === "CALLERS");
    expect(callers.length).toBeGreaterThan(0);
    expect(callers[0]!.rows.length).toBeGreaterThan(0);
  });

  test("test_card_unwired_fires_at_zero", () => {
    // S3 — UNWIRED fires ONLY on an explicit 0-caller reading.
    const db = new Database(CORBELL, { readonly: true });
    try {
      // a symbol with NO inbound edges → the card FIRES
      const fires = unwiredCard(db, "aSymbolWithDefinitelyNoCallersZzz");
      expect(fires).not.toBeNull();
      expect(fires?.shape).toBe("UNWIRED");
      expect(fires?.total).toBe(0);
      // the NEGATIVE half: a symbol WITH callers → SILENT (no false positive)
      const silent = unwiredCard(db, "discoverSourceRoots");
      expect(silent).toBeNull();
      // and a real CALLERS card for the same symbol carries its count
      const c = callersCard(db, "discoverSourceRoots");
      expect(c?.shape).toBe("CALLERS");
      expect(c?.total).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });

  test("test_gi_lsp_card_is_silent_on_a_doc", () => {
    // C5 — the negative: a doc-only file gets ZERO cards (the LSP/HUD card CODE only).
    expect(isCodeFile("README.md")).toBe(false);
    expect(isCodeFile("docs/notes.md")).toBe(false);
    expect(isCodeFile("src/x.ts")).toBe(true);
    const db = new Database(CORBELL, { readonly: true });
    try {
      const cards = fileCards({ db, projectRoot: REPO, relFile: "README.md", src: "# doc\n" });
      expect(cards).toEqual([]);
    } finally {
      db.close();
    }
  });

  // ★ S4 (FR-5) — the JevK5 route: a MEANING card carrying the MEASURED confidence, and
  //   the FAIL-OPEN contract (a down judge is null, NEVER a throw — container C7).
  test(
    "test_card_meaning_carries_confidence",
    () => {
      const db = new Database(CORBELL, { readonly: true });
      try {
        // ── THE DOWN HALF (deterministic, endpoint-independent): a judge that THROWS is
        //    silence. The throw is the live adapter's own GI_JEVK5_DOWN contract.
        const down: MeaningJudge = () => {
          throw new Error("GI_JEVK5_DOWN: no JevK5 health at :8090 nor :8008");
        };
        expect(meaningCard(db, "discoverSourceRoots", down)).toBeNull();
        // WIRED-BUT-SILENT is not a verdict either.
        expect(meaningCard(db, "discoverSourceRoots", () => [])).toBeNull();
        // a fact with NO finite confidence fabricates nothing.
        const noNumber: LayerFact[] = [
          { consumer: "TSG", rung: "meaning", subject: "discoverSourceRoots", value: { meaning: "match" }, source: "x#jevk5" },
        ];
        expect(meaningCard(db, "discoverSourceRoots", () => noNumber)).toBeNull();

        // ── THE UP HALF: the card carries the confidence the judge REPORTED (no invention).
        const measured: LayerFact[] = [
          {
            consumer: "TSG",
            rung: "meaning",
            subject: "discoverSourceRoots",
            value: { meaning: "match", confidence: 0.57, noul: 0.57, model: "jevk5-4b-v0.2-Q8_0", ms: 383.5 },
            source: "GI#jevk5(match p=0.570 · jevk5-4b-v0.2-Q8_0 · :8090 · 383.5ms)",
          },
        ];
        const card = meaningCard(db, "discoverSourceRoots", () => measured);
        expect(card).not.toBeNull();
        expect(card?.shape).toBe("MEANING");
        expect(card?.source).toBe("gi-lsp/meaning");
        expect(card?.severity).toBe(3);
        expect(card?.rows.some((r) => r.includes("confidence 0.570"))).toBe(true);
        expect(GI_LSP_TOKENS as readonly string[]).toContain(card?.source ?? "");

        // ── THE LIVE HALF: the REAL JevK5 adapter (jevk5Probe(REPO).facts).
        //    UP   → a REAL confidence rides the card.
        //    DOWN → the FAIL-OPEN path: null, no throw — and the test still PASSES.
        const live = jevk5Probe(REPO).facts;
        if (jevk5Available()) {
          const liveCard = meaningCard(db, "discoverSourceRoots", live);
          expect(liveCard).not.toBeNull();
          expect(liveCard?.shape).toBe("MEANING");
          expect(liveCard?.rows.some((r) => /confidence \d\.\d{3}/.test(r))).toBe(true);
        } else {
          expect(meaningCard(db, "discoverSourceRoots", live)).toBeNull();
        }
      } finally {
        db.close();
      }
    },
    60_000,
  );
});
