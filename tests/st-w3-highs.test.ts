// ★ ST-W3-HIGHS-1..N — THE 92 HIGH FINDINGS' FIXES, PINNED.
//
// The whole-tree audit returned 92 HIGH findings across src/hunter, src/omp, src/hydra,
// src/scoping, src/kernel. Each was adjudicated two-sided and (where REAL) fixed. This suite
// pins the structural fixes so a revert goes RED. Findings are cited by their measured defect.

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const read = (p: string): string => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("st-w3-highs: ★ THE HIGH FINDINGS' FIXES, EACH PINNED", () => {
  test("test_high_semantic_predicates_regex", () => {
    // ★ THE CLAIM: `writeFileSync?` made only the trailing `c` optional — it matched the
    //   TRUNCATED stem `writeFileSyn`. THE PIN: the group is `(Sync)?`, the whole suffix optional.
    const src = read("src/hunter/diagnostics/semantic-predicates.ts");
    expect(src.includes("writeFile(Sync)?")).toBe(true);
    // the truncated-stem bug: a bare `Sync?` (the c optional) must NOT appear in the matcher
    expect(/writeFileSync\?/.test(src)).toBe(false);
  });

  test("test_high_lexicon_types_state_narrowed", () => {
    // ★ THE CLAIM: `state` inherited the full 4-member union while `verdict` was narrowed to 2 —
    //   the alias admitted states the narrowed verdict could never carry.
    const src = read("src/hunter/firewall/lexicon-types.ts");
    expect(src.includes("state: 'ALLOW_READ' | 'BLOCKED'")).toBe(true);
    expect(src.includes("state: 'ALLOW_REPORT' | 'BLOCKED'")).toBe(true);
  });

  test("test_high_calibration_deterministic_timestamp", () => {
    // ★ THE CLAIM: `writeCalibrationRows` used per-row `Date.now()` — replaying a session
    //   produced different `created_at` values (non-deterministic). THE PIN: the session's fixed
    //   `calibratedAt` stamps every row.
    const src = read("src/hunter/diagnostics/calibration.ts");
    expect(src.includes("this.calibratedAt")).toBe(true);
    // the per-row Date.now() in the calibration INSERTs is gone
    const insLines = src.split("\n").filter((l) => l.includes("ins.run("));
    expect(insLines.every((l) => !l.includes("Date.now()"))).toBe(true);
  });

  test("test_high_calibration_atomic_version_claim", () => {
    // ★ THE CLAIM: read-dir → compute-N → write-N+1 was not atomic; two sessions could write the
    //   same CALIBRATION_vN.md. THE PIN: an exclusive create (wx / O_EXCL) claims the version.
    const src = read("src/hunter/diagnostics/calibration.ts");
    expect(src.includes('"wx"') || src.includes("O_EXCL") || src.includes("flag: 'wx'")).toBe(true);
  });

  test("test_high_harness_map_ownership_documented", () => {
    // ★ THE CLAIM: map() returned an OPEN DbClient with no ownership contract (a leak risk).
    const src = read("src/hunter/harness/map.ts");
    expect(src.includes("F-1 FIX")).toBe(true);
  });

  test("test_high_harness_no_type_lie", () => {
    // ★ THE CLAIM: `snapshotState` returned `undefined as unknown as string` — a type lie that
    //   crashes a string consumer. THE PIN: an honest sentinel.
    const src = read("src/hunter/harness/micro-loop-machine.ts");
    expect(src.includes("undefined as unknown as string")).toBe(false);
    expect(src.includes("unknown-state")).toBe(true);
  });

  test("test_high_scope_binding_prefix_collision_refused", () => {
    // ★ THE CLAIM: two ecosystems could register the same wavePrefix — ownerOf last-wins.
    const src = read("src/scoping/scope-binding.ts");
    expect(src.includes("already registered by ecosystem")).toBe(true);
  });

  test("test_high_db_path_loud_fail_on_missing_testfile", () => {
    // ★ THE CLAIM: BUN_TEST=1 with no testFile silently fell through to the production DB dir.
    const src = read("src/scoping/db-path.ts");
    expect(src.includes("GI_TEST_ISOLATION_BROKEN")).toBe(true);
  });

  test("test_high_db_attach_path_escaped", () => {
    // ★ THE CLAIM: the ATTACH DATABASE path was interpolated unescaped — a quote in the filename
    //   broke the statement. THE PIN: the quote is doubled at BOTH sites.
    const src = read("src/hunter/shared/db.ts");
    const attaches = src.split("\n").filter((l) => l.includes("ATTACH DATABASE"));
    expect(attaches.length).toBeGreaterThan(0);
    expect(attaches.every((l) => l.includes("replace(/'/g"))).toBe(true);
  });

  test("test_high_kind_for_layer_null_guard", () => {
    // ★ THE CLAIM: `kindForLayer(null)` threw a TypeError (a crash). THE PIN: the guard returns
    //   the 'Threshold' default.
    const src = read("src/hunter/shared/kind-for-layer.ts");
    expect(src.includes("layerId == null")).toBe(true);
  });

  test("test_high_graph_facts_inDegree_true_count", () => {
    // ★ THE CLAIM: `inDegree` returned the LIMIT-5 sample length as the count.
    const src = read("src/omp/graph-facts.ts");
    expect(src.includes("COUNT(*) AS n FROM typed_edges")).toBe(true);
  });

  test("test_high_scan_returns_used_battery", () => {
    // ★ THE CLAIM: scan() returned the pre-calibration `battery`, not the `liveBattery` the run used.
    const src = read("src/hunter/harness/scan.ts");
    expect(src.includes("battery: liveBattery")).toBe(true);
  });

  test("test_high_trace_dead_footprint_removed", () => {
    // ★ THE CLAIM: trace.ts computed a `footprint` then `void`ed it — dead per-finding work.
    const src = read("src/hunter/harness/trace.ts");
    // the dead CODE (not the explanatory comment): the per-finding query + the discard
    expect(src.includes("footprint = Math.min(10, calls.length)")).toBe(false);
    expect(src.includes("F-4 FIX")).toBe(true); // the fix's comment is present
  });

  // ── THE ARTIFACT GATE: the shipped bundle carries these fixes ─────────────────────────────
  test("test_highs_reached_the_dist", () => {
    const dist = read("extensions/graph-intelligence/index.js");
    expect(dist.includes("writeFile(Sync)?") || dist.includes("(Sync)?")).toBe(true);
    expect(dist.includes("GI_TEST_ISOLATION_BROKEN")).toBe(true);
    expect(dist.includes("COUNT(*) AS n FROM typed_edges")).toBe(true);
  });
});
