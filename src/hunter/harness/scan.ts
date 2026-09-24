// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/harness/scan.ts:1-123.
// SEAMS: profile-schema -> ../profile/schema.ts (REAL); db DbClient ->
// ../shared/db.ts (REAL); GraphAdapter -> ../graph/interface.ts (REAL);
// CompiledPredicate -> ../lexicon/templates.ts (REAL); compileBattery ->
// ../lexicon/compiler.ts (REAL ported sibling); runBattery/RunSummary ->
// ../diagnostics/engine.ts (REAL ported sibling); calibration gate verbatim
// (../diagnostics/calibration.ts is ported — REAL sibling).
// Everything else verbatim: corpus-path normalization, HUNT_NO_COVERAGE gates,
// D17 born-dryRun calibration gate, sweep-blind refusal note, engine dispatch.
// FIX (2026-09-15): the live-compile path called path.isAbsolute/path.resolve
// with no node:path import (the stub-battery ST never exercised it — caught by
import * as fs from "node:fs";
// the live TUI hunt as "path is not defined"). Import added.
import path from 'node:path';
import type { FireFixture, GoldenFixture } from '../diagnostics/calibration.ts';
import type { ProjectProfile } from '../profile/schema.ts';
import type { DbClient } from '../shared/db.ts';
import type { GraphAdapter } from '../graph/interface.ts';
import type { CompiledPredicate } from '../lexicon/templates.ts';
import { compileBattery } from '../lexicon/compiler.ts';
import { runBattery, type RunSummary } from '../diagnostics/engine.ts';
import { runCalibration } from '../diagnostics/calibration.ts';

import { requireContained } from "../shared/containment.ts";
/** The SCAN actor's output — the compiled battery + the run summary. */
export interface ScanResult {
  battery: CompiledPredicate[];
  batteryVersion: string;
  run: RunSummary;
}

/** Resolve the profile's corpus entries to absolute paths (the W7 seam). */
export function resolveCorpusPaths(profile: ProjectProfile): ProjectProfile {
  // ★ F-64 FIX (2026-09-24): entries like ../../etc/passwd resolved OUTSIDE the project
  //   root (a path-traversal oracle). The loader enforces containment at load; the scan
  //   re-enforces it here (defense in depth — the scan also runs on loader-bypassing overrides).
  // ★ F-440 FIX (2026-09-24): SYMLINK-AWARE. F-64's containment used path.resolve +
  //   startsWith — which collapses `..` but does NOT follow symlinks, so a link planted
  //   inside the root pointing out (`root/evil -> /etc`) passed the string prefix test
  //   while every read followed it out of the tree. Resolve the REAL path (nearest
  //   existing ancestor, since a corpus entry may not exist yet) and contain on THAT.
  // ★ F-440b MIGRATION (2026-09-24): the per-site containment code is REPLACED by the shared
  //   primitive (hunter/shared/containment.ts). Runs 6/7/8 each returned criticals from this
  //   exact family at a new site — per-site patching was the wrong unit of work. One helper,
  //   called everywhere, is the class fix.
  const root = path.resolve(profile.project.root);
  const corpus = profile.rules.corpus.map((entry) => {
    const abs = path.isAbsolute(entry) ? path.normalize(entry) : path.resolve(root, entry);
    return requireContained(abs, root, (ev) => {
      throw new Error(`HUNT_INVALID_CORPUS: entry=${entry} resolves outside the project root (root=${ev.rootReal} real=${ev.real}) — corpus entries must stay under the root.`);
    });
  });
  return {
    ...profile,
    rules: { ...profile.rules, corpus },
  };
}
/** THE FIXTURE EXTRACTOR — typed, LOUD on schema drift (never a silent skip).
 *  ★ F-851 FIX (2026-09-24): the double-cast chain below yielded undefined → empty
 *  arrays → hasFixtures=false on ANY shape drift, no-opping the D17 gate fail-open.
 *  Absent calibrationFixtures is still an honest null (gate no-ops, documented); a
 *  PRESENT-but-malformed value throws SCAN_INVALID_BINDINGS, which the F-347 catch
 *  below escalates to SCAN_CALIBRATION_FAILED (fail-closed). */
function extractCalibrationFixtures(
  bindings: Record<string, unknown> | undefined,
): { fire: FireFixture[]; golden: GoldenFixture[] } | null {
  const raw: unknown = bindings?.calibrationFixtures;
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`SCAN_INVALID_BINDINGS: calibrationFixtures must be an object with fire/golden arrays, got ${Array.isArray(raw) ? 'array' : typeof raw} — refusing a silent calibration skip`);
  }
  const rec = raw as Record<string, unknown>;
  for (const key of ['fire', 'golden'] as const) {
    const v: unknown = rec[key];
    if (v !== undefined && !Array.isArray(v)) {
      throw new Error(`SCAN_INVALID_BINDINGS: calibrationFixtures.${key} must be an array, got ${typeof v} — refusing a silent calibration skip`);
    }
  }
  return {
    fire: (Array.isArray(rec.fire) ? rec.fire : []) as FireFixture[],
    golden: (Array.isArray(rec.golden) ? rec.golden : []) as GoldenFixture[],
  };
}

/** THE SCAN ACTOR — compile + run. Throws the engine's named errors
 *  (ENGINE_GRAPH_EMPTY / FINDING_CHECK_FAILED / FINDING_NO_TRIPLET /
 *  D13_VIOLATION / TEMPLATE_BINDING_INVALID ...) — the micro-loop's onError
 *  routes the fail-state INCONCLUSIVE (O3.5). */
export async function scan(
  profile: ProjectProfile,
  adapter: GraphAdapter,
  runId: string,
  db?: DbClient,
): Promise<ScanResult> {
  try {
    // THE CORPUS-PATH NORMALIZATION (the integration seam — see the header).
    const normalized = resolveCorpusPaths(profile);

    // THE COMPILER — the corpus + the templates + the bindings → the battery
    // (hash-cached against W1's compiled_predicates table when a db is present).
    const { battery, batteryVersion } = await compileBattery(normalized, db);

    // THE COVERAGE GATE (HT-BUG-16 — 2026-08-23: a hunt over 17,500 methods
    // returned 'clean' because the corpus compiled zero matchable cards). An
    // empty battery on a non-trivial target is INCONCLUSIVE, never a clean
    // pass — the false-clean class dies here at the scan boundary.
    if (battery.length === 0) {
      throw new Error(
        'HUNT_NO_COVERAGE: rulesCompiled=0 — the rule battery compiled zero actionable predicates. ' +
        'The corpus must contain machine-matchable rules (not prose contracts). state=inconclusive.',
      );
    }

    const methodsScanned = adapter.nodes().length;
    if (methodsScanned === 0) {
      throw new Error(
        'HUNT_NO_COVERAGE: methodsScanned=0 — the graph reported zero methods. ' +
        'No methods to scan is inconclusive, never a clean pass. state=inconclusive.',
      );
    }

    // THE D17 CALIBRATION GATE (spec §3.11 / FR-12 — born dryRun, FLAGGED→EXCLUDED).
    // The gate runs BEFORE the engine so FLAGGED predicates never ship; born-dryRun
    // means the gate defaults OFF and the live flip is the operator's curation — here
    // the wiring defaults dryRun:true so the records + coverageNote are computed + surfaced
    // but the FLAGGED exclusion is observable via liveBattery. If fixtures are absent
    // (no fire+golden), the gate no-ops as honest [].
    let liveBattery = battery;
    try {
      // ★ F-851 CALL (2026-09-24): typed extractor — SCAN_INVALID_BINDINGS on drift, null when absent.
      const fixtures = extractCalibrationFixtures(normalized.rules.bindings as unknown as Record<string, unknown> | undefined)
        ?? { fire: [] as FireFixture[], golden: [] as GoldenFixture[] };
      const hasFixtures = fixtures.fire.length > 0 || fixtures.golden.length > 0;
      if (hasFixtures) {
        const cal = await runCalibration(normalized, fixtures, { battery, dryRun: true });
        if (cal.excluded.length > 0) {
          liveBattery = cal.liveBattery;
          console.warn(`[scan] D17 calibration: ${cal.excluded.length} FLAGGED → EXCLUDED; ${cal.coverageNote}`);
        }
      }
    } catch (calErr: unknown) {
      // ★ F-347 FIX (2026-09-24): the old catch swallowed EVERY calibration fault — a
      //   corrupted fixture, a logic error in runCalibration, a runtime fault above —
      //   then ran the hunt on an UNVALIDATED battery (fail-open). A calibration fault
      //   is now a LOUD named error: the scan refuses instead of reporting on a
      //   battery it never validated.
      const msg = calErr instanceof Error ? calErr.message : String(calErr);
      console.warn(`[scan] D17 calibration gate failed: ${msg}`);
      throw new Error(`SCAN_CALIBRATION_FAILED: the D17 gate faulted (${msg.slice(0, 200)}) — the battery is unvalidated, refusing the run`);
    }

    // SWEEP-BLIND REFUSAL (zero-trust 2026-08-24): if the semantic layer could
    // not read ANY graph file, its silence is UNMEASURABLE — a clean pass here
    // is false (the T2 class). Loud named inconclusive, never dispatch.
    // THE ENGINE — the battery × the graph + the lockdown source → the findings.
    // The db append is runId-scoped through W5's findings-store (the append-only
    // ledger, the MPSE evidence mandatory at the write boundary).
    const run = runBattery(liveBattery, adapter, normalized, runId, db);

    // ★ F-3 FIX (2026-09-24): return the battery the RUN USED (`liveBattery`, post-calibration),
    //   never the pre-calibration `battery` — the summary must describe the run it summarizes.
    return { battery: liveBattery, batteryVersion, run };
  } catch (e: unknown) {
    console.warn(`[scan] failed: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}
