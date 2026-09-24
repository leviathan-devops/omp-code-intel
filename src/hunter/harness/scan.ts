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
  const root = path.resolve(profile.project.root);
  const corpus = profile.rules.corpus.map((entry) => {
    const abs = path.isAbsolute(entry) ? path.normalize(entry) : path.resolve(root, entry);
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      throw new Error(`HUNT_INVALID_CORPUS: entry=${entry} escapes the project root (${root}) — corpus entries must stay under the root.`);
    }
    return abs;
  });
  return {
    ...profile,
    rules: { ...profile.rules, corpus },
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
      const bindingsAny = (normalized as unknown as { rules?: { bindings?: Record<string, unknown> } }).rules?.bindings ?? {};
      const rawFixtures: unknown = (bindingsAny as Record<string, unknown>).calibrationFixtures;
      const isRecord = typeof rawFixtures === 'object' && rawFixtures !== null;
      const fireField: unknown = isRecord ? (rawFixtures as Record<string, unknown>).fire : undefined;
      const goldenField: unknown = isRecord ? (rawFixtures as Record<string, unknown>).golden : undefined;
      const fixtures: { fire: FireFixture[]; golden: GoldenFixture[] } = {
        fire: (Array.isArray(fireField) ? fireField : []) as FireFixture[],
        golden: (Array.isArray(goldenField) ? goldenField : []) as GoldenFixture[],
      };
      const hasFixtures = fixtures.fire.length > 0 || fixtures.golden.length > 0;
      if (hasFixtures) {
        const cal = await runCalibration(normalized, fixtures, { battery, dryRun: true });
        if (cal.excluded.length > 0) {
          liveBattery = cal.liveBattery;
          console.warn(`[scan] D17 calibration: ${cal.excluded.length} FLAGGED → EXCLUDED; ${cal.coverageNote}`);
        }
      }
    } catch (calErr: unknown) {
      console.warn(`[scan] D17 calibration gate failed (non-fatal, battery unchanged): ${calErr instanceof Error ? calErr.message : String(calErr)}`);
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
