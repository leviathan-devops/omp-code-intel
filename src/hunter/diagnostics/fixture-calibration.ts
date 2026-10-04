// PORTED FROM the archived upstream skill tree/diagnostics/fixture-calibration.ts — verbatim bytes; SEAM: shared imports rewritten to the ported siblings.
// the archived upstream skill tree/diagnostics/fixture-calibration.ts
// THE F11.5 FIXTURE RUN PATH — the wiring that turns the fixture-profile dir
// (fixtures/fixture-profile/) into a full calibration run: the profile + the
// fire/golden fixtures → runCalibration → the CALIBRATION_vN.md record. This is
// the S7 container scenario's runtime proof ("run the calibration tool with the
// FIRE + GOLDEN fixtures" — the pass token `CALIBRATION` + `fired`/`silent`).
//
// THE LOADER CONTRACT: the fixture dir carries the SOURCE FILES (the bytes the
// read returns) + the manifest JSON per fixture (the graph's code-state — the
// nodes the compiled predicate reads, serialized the way the spec's own test
// builds them: fixtureGraph('price-anchored') with the abs(open - level) edge).
// The graph is load-bearing, never decoration (K21.2): the adapter materializes
// the manifest's nodes so the predicate's check reads the real code-state.
//
// THE CLOSED-LOOP RULE (C26): the fire fixture's ruleId/file/line must align
// with the profile's declared predicate id — the loader stamps the declared
// ruleId onto the compiled predicate (the §6.4 convention: `id: 'P6'`), so the
// mutation test is closed-loop (the predicate fires on its OWN recorded class).
//
// THE COORDINATION GAP: the fixture profile (fixtures/fixture-profile/profile.yaml)
// is the battery-p6 agent's wave deliverable — the loader consumes it via the
// profile-loader conventions WHEN PRESENT; when absent, buildFixtureProfile()
// constructs the spec's fixture-project profile object (the data the run needs)
// and the coordination gap is REPORTED, never masked, never a fabricated yaml.

import fs from 'node:fs';
import path from 'node:path';
import { requireContained } from '../shared/containment.ts';
import { loadProfile } from '../profile/loader.ts';
import { ProjectProfileSchema, type ProjectProfile } from '../profile/schema.ts';
import { TEMPLATE_LIBRARY, compileTemplate, type CompiledPredicate } from '../lexicon/templates.ts';
import type {
  GraphAdapter, GraphNode, BuildResult, CallSite, ChainStep, ImportEdge, AwaitEdge, DeadNode, GraphNodeKind,
} from '../graph/interface.ts';
import { runCalibration, type CalibrationFixtures, type CalibrationResult, type FireFixture, type GoldenFixture } from './calibration.ts';

// ---------------------------------------------------------------------------
// The manifest shapes (the on-disk fixture contract — DATA, never imports)
// ---------------------------------------------------------------------------

/** A serialized graph node — the code-state the predicate reads. */
export interface FixtureNodeManifest {
  id: string;
  kind: GraphNodeKind;
  name: string;
  file: string;
  line: number;
  lineage: GraphNode['lineage'];
  source: string;
  data?: Record<string, unknown>;
}

/** The FIRE fixture manifest: the FireFixture fields + the graph's code-state. */
export interface FireFixtureManifest {
  ruleId: string;
  file: string;
  line: number;
  description: string;
  sourceFile: string;
  graph: { nodes: FixtureNodeManifest[] };
}

/** The GOLDEN fixture manifest: the GoldenFixture fields + the graph's code-state. */
export interface GoldenFixtureManifest {
  anchor: string;
  file: string;
  description: string;
  sourceFile: string;
  graph: { nodes: FixtureNodeManifest[] };
}

/** The fixture loader's result: the profile + the fixtures assembled from disk. */
export interface FixtureLoadResult {
  profile: ProjectProfile;
  fixtures: CalibrationFixtures;
  fixtureProfileDir: string;
  profileFromDisk: boolean;   // true when profile.yaml existed (battery-p6's deliverable)
}

// ---------------------------------------------------------------------------
// The graph adapter — materializes the manifest's code-state nodes (K21.2)
// ---------------------------------------------------------------------------

/** Build a REAL GraphAdapter carrying the fixture's code-state nodes. The engine
 *  reads graph.nodes() + node.data — an empty graph would throw ENGINE_GRAPH_EMPTY
 *  (a scan over zero nodes) and a stub returning [] would corrupt the mutation
 *  semantics (MISS/SILENT that proves nothing). The edge queries return the
 *  honest empty — the fixture graph carries nodes only (no cross-module edges). */
export function graphFromManifest(nodes: FixtureNodeManifest[]): GraphAdapter {
  const materialized: GraphNode[] = nodes.map((n) => ({
    id: n.id, kind: n.kind, name: n.name, file: n.file, line: n.line,
    lineage: n.lineage, source: n.source, data: n.data,
  }));
  return {
    build: async (): Promise<BuildResult> => ({
      nodes: materialized, edges: [], durationMs: 0, adapter: 'corbell',
      lineage: { spec: 0, code: materialized.length, hybrid: 0 },
    }),
    whoCalls: (): CallSite[] => [],
    chain: (): ChainStep[] => [],
    imports: (): ImportEdge[] => [],
    awaits: (): AwaitEdge[] => [],
    unwired: (): DeadNode[] => [],
    nodes: (kind?: GraphNodeKind): GraphNode[] =>
      kind === undefined ? materialized : materialized.filter((n) => n.kind === kind),
  };
}

// ---------------------------------------------------------------------------
// THE FIXTURE LOADER — the fixture dir → CalibrationFixtures
// ---------------------------------------------------------------------------

/** THE R16 TYPE_CERTAINTY GUARDED READ — a fixture manifest is parsed + the
 *  parsed shape is typeof/!== null-guarded before the typed assertion. */
  // ★ F-27 FIX (2026-09-24): the old guard accepted ANY non-null object —
  // ★ including arrays — as T with zero shape validation. Arrays are rejected
  // ★ here; the required anchor fields are validated at each loader below.
  function asFixture<T extends object>(raw: string, label: string): T {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== undefined && parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // ★ F-306 FIX (2026-09-24): the guard accepted ANY non-array object as T — a manifest
      // ★ with graph.nodes missing/non-array reached graphFromManifest().map and died with a bare
      // ★ TypeError. The loader's expectation (graph.nodes is FixtureNodeManifest[]) is enforced
      // ★ here with the loud CALIBRATION_FIXTURE_INVALID naming the offending label.
      const g = (parsed as { graph?: unknown }).graph;
      // ★ R15 FIX: graph is REQUIRED — both loaders dereference manifest.graph.nodes
      //   unconditionally, so a manifest with no graph key used to pass the guard and
      //   die with bare TypeError instead of CALIBRATION_FIXTURE_INVALID.
      if (typeof g !== 'object' || g === null || !Array.isArray((g as { nodes?: unknown }).nodes)) {
        throw new Error(`CALIBRATION_FIXTURE_INVALID: ${label} graph.nodes must be an array`);
      }
      return parsed as T;
    }
    throw new Error(`CALIBRATION_FIXTURE_INVALID: ${label} parsed to a non-object`);
  }

/** THE R16 TYPE_CERTAINTY GUARDED READ — the declaredPredicates binding (an
 *  unknown value) is typeof/!== null-guarded before the map assertion.
 *  ★ F-700 FIX (2026-09-24): the old guard silently returned {} for ANY
 *  ★ non-object input (undefined/null/arrays) — a missing or malformed
 *  ★ declaredPredicates section compiled to a ZERO-predicate battery with no
 *  ★ warning, an empty pass proving nothing. Missing/empty is now a LOUD
 *  ★ CALIBRATION_INVALID naming the binding label. */
function bindingsMap(v: unknown, label: string): Record<string, Record<string, unknown>> {
  if (v === undefined || v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error(`CALIBRATION_INVALID: ${label} must be a mapping of ruleId → binding (got ${Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v})`);
  }
  const map = v as Record<string, Record<string, unknown>>;
  if (Object.keys(map).length === 0) {
    throw new Error(`CALIBRATION_INVALID: ${label} is an empty object — at least one binding is required`);
  }
  return map;
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the severity binding is narrowed by
 *  the literal-union check (no cast at all — the comparison narrows it). */
function severityFromBinding(v: unknown): 'CRIT' | 'HIGH' | 'MED' | 'WARN' {
  if (v === 'CRIT' || v === 'HIGH' || v === 'MED' || v === 'WARN') {
    return v;
  }
  return 'HIGH';
}

/**
 * ★ R19-HIGH FIX (2026-09-25): THE FIXTURE CONTAINMENT — ONE definition for both loaders.
 *   loadFireFixture and loadGoldenFixture each carried the same two-question check (the lexical
 *   spelling question, then requireContained's symlink question) with only the kind WORD differing
 *   — and the two legs had already been fixed in lockstep three times (F-702, F-931, R15), which is
 *   the cost of the copy: every traversal fix must be applied twice or one loader silently keeps
 *   the hole. The check has one home now; both loaders ask it.
 */
function containedFixtureSource(dir: string, sourceFile: string, kind: "fire" | "golden"): string {
  // The manifest's own SPELLING is still checked lexically (a `..` that escapes is refused on the
  // string form — the shape question, asked before any filesystem touch).
  const spelled = path.resolve(dir, sourceFile);
  const dirSpelled = path.resolve(dir);
  if (spelled !== dirSpelled && !spelled.startsWith(dirSpelled + path.sep)) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: ${kind} fixture ${dir} sourceFile '${sourceFile}' escapes the fixture directory`);
  }
  // The SYMLINK question is asked against the real path (requireContained resolves the nearest
  // existing ancestor, so a dangling link target still answers containment).
  return requireContained(
    spelled,
    dir,
    ({ real }) => { throw new Error(`CALIBRATION_FIXTURE_INVALID: ${kind} fixture ${dir} sourceFile '${sourceFile}' escapes the fixture directory (realpath ${real})`); },
  );
}

/** Read one fire fixture dir (manifest.json + the source file) → a FireFixture.
 *  ★ F-702 FIX (2026-09-24): manifest.sourceFile used to join straight into
 *  ★ readFileSync — a malicious manifest.json referencing ../../etc/passwd
 *  ★ read ARBITRARY files. The resolved source must stay inside the fixture
 *  ★ dir (the loader.ts F-18 containment law, same shape).
 *  ★ F-931 FIX (2026-09-24): `path.resolve` collapses `..` but follows NO symlinks —
 *  ★ a link planted INSIDE the dir (fixtures/fire/link → /etc) passed the startsWith
 *  ★ check while readFileSync followed it OUT (the GI_SESSION_PATH class, five runs in a
 *  ★ row). Both sides now resolve through the shared requireContained primitive
 *  ★ (nearest-existing-ancestor realpath + the caller's CALIBRATION_FIXTURE_INVALID
 *  ★ vocabulary — a shared helper that invents a generic error would erase the
 *  ★ named-error contract the health register depends on). */
export function loadFireFixture(dir: string): FireFixture {
  const manifest = asFixture<FireFixtureManifest>(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'), 'fire manifest');
  // ★ R15 FIX: a missing/non-string sourceFile used to reach path.resolve and die with
  //   bare ERR_INVALID_ARG_TYPE; "" resolved to the dir itself (later EISDIR) — neither
  //   surfaced as CALIBRATION_FIXTURE_INVALID. Validate before any filesystem touch.
  if (typeof manifest.sourceFile !== 'string' || manifest.sourceFile.length === 0) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: fire fixture ${dir} carries a missing/empty sourceFile`);
  }
  // The manifest's own SPELLING is still checked lexically (a `..` that escapes is refused
  // on the string form — the shape question, asked before any filesystem touch).
  // ★ R19: the shared check (one definition, both loaders).
  const contained = containedFixtureSource(dir, manifest.sourceFile, "fire");
  const source = fs.readFileSync(contained, 'utf8');
  if (!manifest.ruleId || !manifest.file || !manifest.line) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: fire fixture ${dir} carries an empty ruleId/file/line anchor`);
  }
  return {
    ruleId: manifest.ruleId,
    file: manifest.file,
    line: manifest.line,
    description: manifest.description,
    source,
    graph: graphFromManifest(manifest.graph.nodes),
  };
}

/** Read one golden fixture dir (manifest.json + the source file) → a GoldenFixture.
 *  ★ F-702 FIX (2026-09-24): same traversal containment as loadFireFixture —
 *  ★ the resolved source must stay inside the fixture dir.
 *  ★ F-931 FIX (2026-09-24): same symlink-blindness class as loadFireFixture above —
 *  ★ the lexical startsWith passed a planted in-dir link while the read followed it out.
 *  ★ Same two-question shape: lexical spelling check, then requireContained. */
export function loadGoldenFixture(dir: string): GoldenFixture {
  const manifest = asFixture<GoldenFixtureManifest>(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'), 'golden manifest');
  // ★ R15 FIX: same missing/empty sourceFile class as the fire loader above.
  if (typeof manifest.sourceFile !== 'string' || manifest.sourceFile.length === 0) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: golden fixture ${dir} carries a missing/empty sourceFile`);
  }
  // ★ R19: the shared check (one definition, both loaders).
  const contained = containedFixtureSource(dir, manifest.sourceFile, "golden");
  const source = fs.readFileSync(contained, 'utf8');
  if (!manifest.anchor || !manifest.file) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: golden fixture ${dir} carries an empty anchor/file`);
  }
  return {
    anchor: manifest.anchor,
    file: manifest.file,
    source,
    graph: graphFromManifest(manifest.graph.nodes),
  };
}

/** Read the fixture-profile's fixtures/{fire,golden}/ dirs into a CalibrationFixtures. */
export function loadCalibrationFixtures(fixtureProfileDir: string): CalibrationFixtures {
  const fireDir = path.join(fixtureProfileDir, 'fixtures', 'fire');
  const goldenDir = path.join(fixtureProfileDir, 'fixtures', 'golden');
  if (!fs.existsSync(fireDir) || !fs.existsSync(goldenDir)) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: the fixture dirs ${fireDir} + ${goldenDir} must exist`);
  }
  // ★ F-6 FIX (2026-09-24): the old filter matched a flat manifest.json and re-loaded
  // ★ the SAME dir — a multi-fixture layout (one subdir per fixture) silently loaded
  // ★ ZERO fixtures. Walk one level: each subdir carrying manifest.json loads as its
  // ★ own fixture; a flat manifest.json keeps working.
  const withManifest = (dir: string): string[] => {
    if (fs.existsSync(path.join(dir, 'manifest.json'))) return [dir];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => path.join(dir, e.name))
      .filter((d) => fs.existsSync(path.join(d, 'manifest.json')));
  };
  const fire = withManifest(fireDir).map((d) => loadFireFixture(d));
  const golden = withManifest(goldenDir).map((d) => loadGoldenFixture(d));
  // ★ R20-HIGH FIX (2026-09-25): an EMPTY fixture set was silently legal — the dirs exist with the
  //   right shape but carry no manifest-bearing subdirs, so `loadCalibrationFixtures` returned
  //   { fire: [], golden: [] } and calibration ran against NOTHING while reporting success. A
  //   missing side is a LOUD named failure, never a vacuous pass (the loud-fail-or-clear-pass law).
  if (fire.length === 0) throw new Error(`GI_FIXTURES_ABSENT: no fire fixture under ${fireDir} (each needs a manifest.json)`);
  if (golden.length === 0) throw new Error(`GI_FIXTURES_ABSENT: no golden fixture under ${goldenDir} (each needs a manifest.json)`);
  return { fire, golden };
}

// ---------------------------------------------------------------------------
// THE FIXTURE PROFILE (the spec's fixture-project shape — C24)
// ---------------------------------------------------------------------------

/** Build the fixture-project's ProjectProfile — the run's data input. The shape
 *  follows the spec's fixture-project contract (the S2/S5/S7 scenarios mount
 *  /workspace/fixture-profile with profile.yaml): a corbell project rooted at
 *  the fixture-profile dir, the P6 declared predicate bound to the
 *  domain.numeric-threshold template (the abs(open - level) comparator class). */
export function buildFixtureProfile(fixtureProfileDir: string): ProjectProfile {
  return ProjectProfileSchema.parse({
    profileVersion: 1,
    project: {
      name: 'fixture-profile',
      root: fixtureProfileDir,
      languages: ['typescript'],
      entryPoints: ['src/index.ts'],
      build: 'bun build',
      test: 'bun test',
    },
    graph: { substrate: 'corbell', scope: ['src'], excludes: [] },
    rules: {
      corpus: ['corpus.md'],
      bindings: {
        declaredPredicates: {
          P6: {
            template: 'domain.numeric-threshold',
            symbol: 'priceAnchor',
            valuePath: 'comparator',
            operator: 'gt',
            threshold: 1.0,
            verbatimQuote: 'NOTHING SHOULD BE PRICE ANCHORED EVER... YOU DO NOT HARDCODE FUCKING PRICES... E1 CALCULATES THE EXACT ZONES',
            anchor: 'ZONE_ANCHORED_E2_FIX_SPEC.md:6',
            severity: 'CRIT',
          },
        },
      },
    },
    pipeline: {
      stages: [
        { id: 'e2-selection', entry: 'selectE2', contract: 'the E2 designation is zone-anchored, never price-anchored' },
      ],
    },
    history: { failureLogs: [] },
    awareness: { docs: [] },
  });
}

/** Compile the fixture battery — the declared predicates with their DECLARED
 *  ruleIds stamped (the §6.4 convention: `id: 'P6'`). The compile path is the
 *  compiler's own compileDeclared with the ruleId preserved, so the mutation
 *  test is closed-loop: the fire fixture's ruleId === the battery predicate's id. */
export async function compileFixtureBattery(profile: ProjectProfile): Promise<CompiledPredicate[]> {
  // ★ F-700 FIX (2026-09-24): the label rides the call so the loud error names the binding.
  const declared = bindingsMap(profile.rules.bindings['declaredPredicates'], 'declaredPredicates');
  const battery: CompiledPredicate[] = [];
  for (const [ruleId, binding] of Object.entries(declared)) {
    const templateId = String(binding['template'] ?? '');
    const template = TEMPLATE_LIBRARY[templateId];
    if (!template) {
      throw new Error(`TEMPLATE_UNKNOWN: declaredPredicate ${ruleId} names template '${templateId}'`);
    }
    const verbatimQuote = String(binding['verbatimQuote'] ?? '');
    if (!verbatimQuote || verbatimQuote.trim() === '') {
      throw new Error(`D13_VIOLATION: declaredPredicate ${ruleId} lacks a verbatim quote — doctrine is QUOTED, never synthesized`);
    }
    const anchor = String(binding['anchor'] ?? `${ruleId}`);
    const severity = severityFromBinding(binding['severity']);
    const compiled = compileTemplate(template, binding, { verbatimQuote, anchor, severity }, 'fixture-battery');
    battery.push({ ...compiled, id: ruleId }); // stamp the declared ruleId — the closed loop
  }
  return battery;
}

// ---------------------------------------------------------------------------
// THE RUN PATH — the fixture-profile dir → the calibration record
// ---------------------------------------------------------------------------

/** Load the profile from profile.yaml when battery-p6's deliverable has landed;
 *  otherwise build the spec's fixture-project profile (the coordination gap is
 *  reported via profileFromDisk=false — never a masked gap, never a fabricated yaml). */
export function loadFixtureProfile(fixtureProfileDir: string): { profile: ProjectProfile; profileFromDisk: boolean } {
  const yamlPath = path.join(fixtureProfileDir, 'profile.yaml');
  if (fs.existsSync(yamlPath)) {
    return { profile: loadProfile(yamlPath), profileFromDisk: true };
  }
  return { profile: buildFixtureProfile(fixtureProfileDir), profileFromDisk: false };
}
/** THE RUN PATH — runCalibration(profile, fixtures) over the fixture dir,
 *  writing the CALIBRATION_vN.md record at the fixture-profile dir (or the
 *  supplied recordPath). Dry-run by default (D28 — the gate is born OFF; the
 *  verdicts are computed + surfaced, the live flip is the operator's curation).
 *  The coordination fact (the profileFromDisk flag — battery-p6's profile.yaml
 *  landed or the spec-shaped profile was constructed) rides the loader's
 *  FixtureLoadResult; the caller reports it, never hides it.
 *  ★ F-930 FIX (2026-09-24): the old `const { profile } = loadFixtureProfile(...)`
 *  ★ DISCARDED profileFromDisk, so a caller could not tell a landed profile.yaml from
 *  ★ the constructed spec-shaped profile (a SILENT gap). The return widens to
 *  ★ CalibrationResult & { profileFromDisk } (an intersection, never a calibration.ts
 *  ★ edit — that file is another slice's). No callers exist yet; the extra prop is
 *  ★ backward-compatible for readers. */
export async function runFixtureCalibration(
  fixtureProfileDir: string,
  opts: { recordPath?: string; dryRun?: boolean; battery?: CompiledPredicate[] } = {},
): Promise<CalibrationResult & { profileFromDisk: boolean }> {
  try {
    // ★ F-701b FIX (2026-09-24): `loadFixtureProfileFixtures` does not exist — the real
    //   helpers are `loadFixtureProfile` (the profile) and `loadCalibrationFixtures` (the
    //   fire/golden dirs). Composed here so the closed-loop check below has both.
    const { profile, profileFromDisk } = loadFixtureProfile(fixtureProfileDir);
    const fixtures = loadCalibrationFixtures(fixtureProfileDir);
    const battery = opts.battery ?? (await compileFixtureBattery(profile));
    // ★ F-701 FIX (2026-09-24): the CLOSED-LOOP invariant (C26) — every fire
    // ★ fixture's ruleId must name a compiled battery predicate. The battery
    // ★ stamps declared ruleIds and the fixtures assemble independently, so a
    // ★ renamed key in profile.yaml used to run the calibration against the
    // ★ WRONG (or no) predicate with no complaint. A dangling ruleId is LOUD.
    const batteryIds = new Set(battery.map((p) => p.id));
    for (const fire of fixtures.fire) {
      if (!batteryIds.has(fire.ruleId)) {
        throw new Error(
          `CLOSED_LOOP_BROKEN: fire fixture ruleId '${fire.ruleId}' matches no battery predicate id [${[...batteryIds].join(', ')}]`
        );
      }
    }
    const recordPath = opts.recordPath ?? fixtureProfileDir;
    const result = await runCalibration(profile, fixtures, {
      battery,
      dryRun: opts.dryRun ?? true,
      recordPath,
    });
    return { ...result, profileFromDisk };
  } catch (e: unknown) {
    console.warn(`[fixture-calibration] runFixtureCalibration failed: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}
