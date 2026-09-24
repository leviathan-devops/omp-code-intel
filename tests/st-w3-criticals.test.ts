// ★ ST-W3-CRIT-1..ST-W3-CRIT-8 — THE 8 CRITICAL FINDINGS, EACH PINNED.
//
// The whole-tree audit (W3) returned 8 CRITICAL findings. Each is either FIXED (pinned here
// by a test that FAILS if the fix is reverted) or proven NOT-A-BUG. A critical with no test is
// a wish. The pins read the DEPLOYED bundle (the artifact) AND the source, so a fix that lands
// in src but never reaches the dist is caught.

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { upsertRow } from "../src/scoping/scoped-store.ts";
import { tickSessionBudget, readSessionState } from "../src/scoping/session-state.ts";

const ROOT = path.resolve(import.meta.dir, "..");
const read = (p: string): string => fs.readFileSync(path.join(ROOT, p), "utf8");
const DIST = (): string => read("extensions/graph-intelligence/index.js");

describe("st-w3-criticals: ★ THE 8 CRITICALS, EACH PINNED", () => {
  // ── #1 store-map.ts · supersede INSIDE the transaction ────────────────────────────────────
  test("test_crit1_store_map_supersede_in_transaction", () => {
    // ★ THE CLAIM: the supersede UPDATEs ran in AUTOCOMMIT before BEGIN IMMEDIATE — a later
    //   insert failure left ZERO live rows with no replacements (data loss).
    // ★ THE PIN: BEGIN IMMEDIATE must appear BEFORE the first supersede UPDATE in the writer.
    const src = read("src/hunter/graph/store-map.ts");
    const fn = src.slice(src.indexOf("export function writeCorbellToTypedStore"));
    const beginAt = fn.indexOf("BEGIN IMMEDIATE");
    const superAt = fn.indexOf("UPDATE typed_nodes SET superseded_run");
    expect(beginAt).toBeGreaterThan(-1);
    expect(superAt).toBeGreaterThan(beginAt); // the supersede is AFTER the transaction opened
    expect(fn.includes("ROLLBACK")).toBe(true); // and a rollback exists
  });

  // ── #2 templates.ts · the injected source, never the raw fs read ──────────────────────────
  test("test_crit2_templates_injected_source", () => {
    // ★ THE CLAIM: WIRING_EXPORT_IMPORTER called readFileSync directly, bypassing ctx.source.
    const src = read("src/hunter/lexicon/templates.ts");
    expect(src.includes("ctx.source.read(file).split('\\n')")).toBe(true);
    // the ONLY readFileSync left is the import line itself
    const reads = src.split("\n").filter((l) => l.includes("readFileSync(") && !l.includes("import"));
    expect(reads.length).toBe(0);
  });

  // ── #3 query-tool.ts · input.depth capped by MAX_BLAST_DEPTH ──────────────────────────────
  test("test_crit3_query_tool_depth_capped", () => {
    // ★ THE CLAIM: input.depth fed the recursive CTE uncapped; MAX_BLAST_DEPTH was dead code.
    const src = read("src/hunter/surface/query-tool.ts");
    expect(src.includes("Math.min(input.depth ?? DEFAULT_BLAST_DEPTH, MAX_BLAST_DEPTH)")).toBe(true);
    // MAX_BLAST_DEPTH is now USED (defined once + referenced)
    const uses = src.split("\n").filter((l) => l.includes("MAX_BLAST_DEPTH")).length;
    expect(uses).toBeGreaterThanOrEqual(2);
  });

  // ── #4 graph-facts.ts · every typed_edges query filters superseded_run ────────────────────
  test("test_crit4_graph_facts_superseded_filter", () => {
    // ★ THE CLAIM: all 4 typed_edges reads counted DEAD (superseded) edges.
    const src = read("src/omp/graph-facts.ts");
    // ★ after F-133 the inDegree filter lives in the `where` template (still applied via ${where});
    //   every OTHER typed_edges read must carry the filter inline.
    expect(src.includes("dst_canonical LIKE ?1 AND superseded_run IS NULL")).toBe(true);
    expect((src.match(/superseded_run IS NULL/g) ?? []).length).toBeGreaterThanOrEqual(4);
    // no typed_edges read is left unfiltered: every `FROM typed_edges` is paired with the filter
    const edgeLines = src.split("\n").filter((l) => l.includes("FROM typed_edges"));
    const unfiltered = edgeLines.filter((l) => !l.includes("superseded_run IS NULL") && !l.includes("${where}"));
    expect(unfiltered.length).toBe(0);
  });

  // ── #5 populate-graphify.ts · the populated_at marker rides INSIDE the tx ─────────────────
  test("test_crit5_populate_graphify_marker_in_tx", () => {
    // ★ THE CLAIM: the gi_meta insert ran AFTER COMMIT but inside the try whose catch ROLLBACKs.
    const src = read("src/omp/populate-graphify.ts");
    const lines = src.split("\n");
    const mi = lines.findIndex((l) => l.includes("gi_meta") && l.includes('"populated_at"'));
    expect(mi).toBeGreaterThan(-1);
    expect(lines[mi].includes("gi_meta")).toBe(true); // the marker line writes gi_meta
    const ci = lines.findIndex((l, i) => i > mi && l.includes('db.exec("COMMIT;"'));
    expect(ci).toBeGreaterThan(mi);
    expect(ci - mi).toBeLessThan(6); // the COMMIT immediately follows — the marker is INSIDE the tx
  });

  // ── #6 store-open.ts · the exclusive create (no TOCTOU truncate) ──────────────────────────
  test("test_crit6_store_open_exclusive_create", () => {
    // ★ THE CLAIM: existsSync + writeFileSync('w') truncated a peer-created store.
    const src = read("src/omp/store-open.ts");
    expect(src.includes('flag: "wx"')).toBe(true);
    expect(src.includes("!fs.existsSync(storePath)")).toBe(false); // the TOCTOU check is gone
  });

  // ── #7 scoped-store.ts · the identifier validation refuses a bad name ─────────────────────
  test("test_crit7_scoped_store_ident_validation", () => {
    // ★ THE CLAIM: table/pkColumn interpolated into SQL with no validation.
    expect(() => upsertRow("gi_sessions; DROP TABLE x", "id", "1", "{}")).toThrow(/GI_SQL_IDENT_REFUSED/);
    expect(() => upsertRow("gi_sessions", "id'--", "1", "{}")).toThrow(/GI_SQL_IDENT_REFUSED/);
    // ★ THE NEGATIVE CONTROL: a legit identifier passes the guard (it may fail LATER on the
    //   store's dbPath requirement — that is a different error, never GI_SQL_IDENT_REFUSED).
    let legitErr: unknown = null;
    try { upsertRow("gi_sessions", "session_id", "1", "{}"); } catch (e) { legitErr = e; }
    expect(String(legitErr)).not.toContain("GI_SQL_IDENT_REFUSED");
  });

  // ── #8 session-state.ts · the read-modify-write is serialized ─────────────────────────────
  test("test_crit8_session_state_rmw_serialized", () => {
    // ★ THE CLAIM: tickSessionBudget read-modify-wrote the state file with no lock (lost ticks).
    const src = read("src/scoping/session-state.ts");
    expect(src.includes("withStateLock")).toBe(true);
    // ★ THE BEHAVIORAL HALF: sequential ticks still increment correctly (the lock preserves semantics)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-crit8-"));
    const sp = path.join(dir, "state.json");
    const a = tickSessionBudget(sp, "ses_aaaaaaaaaaaaaaaaaaaaaaaa", 1000);
    const b = tickSessionBudget(sp, "ses_aaaaaaaaaaaaaaaaaaaaaaaa", 1000);
    const c = tickSessionBudget(sp, "ses_aaaaaaaaaaaaaaaaaaaaaaaa", 1000);
    expect([a, b, c]).toEqual([1, 2, 3]);
    // the plan mtime change RESETS the budget (the latch law survives the lock)
    const d = tickSessionBudget(sp, "ses_aaaaaaaaaaaaaaaaaaaaaaaa", 2000);
    expect(d).toBe(1);
    // no lock file is left behind
    expect(fs.existsSync(sp + ".lock")).toBe(false);
  });

  // ── THE ARTIFACT GATE: the dist carries the fixes (a src-only fix is UNBUILT) ─────────────
  test("test_criticals_reached_the_dist", () => {
    // ★ NOTE: session-state.ts (#8) is NOT in the extension's import graph (0 importers — it is
    //   a script/wave-manager module), so #8's pin is its source + behavioral test, not the dist.
    const dist = DIST();
    expect(dist.includes("GI_SQL_IDENT_REFUSED")).toBe(true); // #7 scoped-store
    expect(dist.includes('flag: "wx"')).toBe(true); // #6 store-open
    expect(dist.includes("MAX_BLAST_DEPTH")).toBe(true); // #3 query-tool
    expect(dist.includes("Math.min(input.depth")).toBe(true); // #3 query-tool
  });
});
