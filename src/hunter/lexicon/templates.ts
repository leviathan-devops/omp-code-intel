// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/lexicon/templates.ts — verbatim bytes; SEAM: db import rewritten to ../shared/db-canon.ts (the ported slice).
// src/subagents/trident-bug-hunter/lexicon/templates.ts
// THE PREDICATE TEMPLATE LIBRARY (W4, spec §3.7 lines 1007-1133). The machine's
// transferable intelligence: the corpus's prose rules compile into deterministic
// predicates through the 5 typed families (WIRING/CONTRACT/PROVENANCE/DOMAIN/
// PROCESS). The templates are the machine's CONSTANT; the profile's bindings are
// the VARIABLE (D10). W5's diagnostics engine dispatches on the family; the
// calibration mutation-tests the checks; W10's Plutus deployment instantiates
// the P1-P22 battery through them (K3.1). The auditor's 6th family (CONFORMANCE)
// is W9's — it lands with the auditor wave, never here.
//
// THE A3 HOSTILE-CORPUS LAW holds in the SIGNATURE: every check is a pure
// function `(ctx: CheckContext) => Finding[]` over the INJECTED graph/source
// reads. There is NO exec/run/spawn hook anywhere in the lexicon — a check,
// even fed the 'run everything' fake rule, is STRUCTURALLY unable to execute
// anything (the hostile text rides only in `bindings` as DATA — G22.1).
// THE DETERMINISM LAW (K20.3): the checks are pure functions of the context —
// no timestamps, no randomness, no global state, no I/O beyond the injected
// reads. The same graph + the same bindings ALWAYS yield the same findings.
//
// DESIGN DIVERGENCES (recorded honestly): (1) the spec's §3.7 CheckContext
// (lines 1018-1023) carries `readSource`/`battery`/`history`; the W4 wave
// directive mandates `{graph, source: {read}, bindings}` — this file carries the
// W4 wave's shape (the battery/history belong to W5's engine context, not the
// predicate context). (2) the spec's `PredicateFamily` includes 'CONFORMANCE'
// (line 1016) — this file exports the 5 W4 families; CONFORMANCE is W9's.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { SEVERITIES, type Severity, type FindingVerdict } from '../shared/db-canon.ts';
import type { AwaitEdge, CallSite, ChainStep, GraphAdapter, GraphNode, ImportEdge } from '../graph/interface.ts';

// ---------------------------------------------------------------------------
// The typed shapes (spec §3.7 lines 1016-1046 — the W4-wave family set)
// ---------------------------------------------------------------------------

/** The 5 W4 predicate families. W5 dispatches on the EXACT union. */
export type PredicateFamily = 'WIRING' | 'CONTRACT' | 'PROVENANCE' | 'DOMAIN' | 'PROCESS';

export const PREDICATE_FAMILIES: readonly PredicateFamily[] = [
  'WIRING', 'CONTRACT', 'PROVENANCE', 'DOMAIN', 'PROCESS',
];

/** THE check context — the ONLY surface a check reads. The graph adapter + the
 *  lockdown-compliant source read + the validated bindings. No exec/run hook. */
export interface CheckContext {
  graph: GraphAdapter;
  source: { read(file: string, range?: [number, number]): string };
  bindings: Record<string, unknown>;
  /** the W14/W15 hoisted content map (additive — the audit Batch-B R23 passes it; the hunter sets it when available). */
  contentMap?: Map<string, string>;
}

/** A predicate finding — the MPSE-triplet shape aligned to the db.ts finding
 *  canon: the severity is CRIT|HIGH|MED|WARN (db.ts:66), the verdict is
 *  VIOLATION|PASS (db.ts:78), the evidence is MANDATORY (no triplet = no
 *  finding, O9.1 — the db rejects an empty evidence string). */
export interface Finding {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  range?: [number, number];
  evidence: string;
  verdict: FindingVerdict;
  week?: string;
}

/** The compiled battery row (spec §3.7 lines 1032-1040 + the W4 wave's
 *  batteryVersion field). The check is DETERMINISTIC — the decision layer. */
export interface CompiledPredicate {
  id: string;
  family: PredicateFamily;
  template: string;                  // the template id (e.g. 'provenance.traces-to-source')
  bindings: Record<string, unknown>; // the validated bound parameters (the D13 card data rides here)
  verbatimQuote: string;             // the D13 law — the rule's exact words from the corpus
  anchor: string;                    // the rule's file:line in the corpus
  severity: Severity;
  batteryVersion: string;
  check(ctx: CheckContext): Finding[];
}

/** A typed template: the zod schema validates the bound params; the check is
 *  the deterministic decision layer over the graph/source reads (the A3 law). */
export interface PredicateTemplate {
  id: string;
  family: PredicateFamily;
  parameters: z.ZodType;             // validates the bound params — an invalid binding is a loud named error
  check(ctx: CheckContext): Finding[];
}

// ---------------------------------------------------------------------------
// The named-error vocabulary (O32.1) — the loud fail-state contract
// ---------------------------------------------------------------------------

/** The base lexicon error: every failure NAMES its code in the message. */
export class LexiconError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = code;
    this.code = code;
  }
}

export function templateBindingInvalid(templateId: string, detail: string): LexiconError {
  return new LexiconError(
    'TEMPLATE_BINDING_INVALID',
    `TEMPLATE_BINDING_INVALID: template=${templateId} detail=${detail} (the bound params failed the template's zod schema — an invalid binding is a loud named error, never a coerced default)`,
  );
}

export function templateMissing(templateId: string): LexiconError {
  return new LexiconError(
    'TEMPLATE_MISSING',
    `TEMPLATE_MISSING: template=${templateId} (the stored check_code names a template absent from the library — the battery cannot be reinstated)`,
  );
}

// ---------------------------------------------------------------------------
// The shared primitives (the content-addressing + the deterministic helpers)
// ---------------------------------------------------------------------------

/** sha256 — the content-addressing primitive behind the battery version + the
 *  predicate ids. Deterministic by construction: the same bytes → the same hex. */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function readPath(obj: Record<string, unknown>, dotted: string): unknown {
  let cur: unknown = obj;
  for (const part of dotted.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    // ★ F-333 FIX (2026-09-24): OWN-PROPERTY ONLY. A bare `obj[part]` walks the
    //   prototype chain — a polluted Object.prototype (or an Object.create'd node.data)
    //   could surface an INHERITED value as if it were a binding. The predicate's
    //   bindings are the template's INPUT, so the read is a trust boundary.
    if (!Object.hasOwn(cur, part)) return undefined;
    // ★ F-412 FIX (2026-09-24): `constructor`/`__proto__`/`prototype` can be OWN
    // ★ properties (JSON.parse creates own `__proto__`), so the F-333 hasOwn guard
    // ★ alone does not stop a crafted bindings object from walking into
    // ★ Function.prototype. Blocklisted before the read — no binding legitimately
    // ★ names these keys.
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

// THE CALIBRATED OPERATOR SWITCH (the ISE law — name the calibration): the
// 4 operators are the NAMED comparison bands over the bindings-supplied
// `threshold` — the threshold's calibration source is the profile's
// `rules.bindings` (the operator's curated numeric ceilings, validated by W5's
// calibration mutation gate). No magic number lives here: every comparison is
// against a binding, never a hardcoded constant.
//
// THE R16 TYPE_CERTAINTY note: `bindings` is Record<string, unknown> (the zod
// schema validated the SHAPE at compile, but the read is still `unknown` at the
// check's runtime). The typed reads below go through the R16-guarded accessors
// — each assertion is earned by a typeof/Array.isArray guard in the same block,
// never a bare cast on an unvalidated read.
function compareOperator(op: 'lt' | 'lte' | 'gt' | 'gte', value: number, threshold: number): boolean {
  switch (op) {
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    default: return value > threshold;
  }
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the severity binding (z.enum-validated
 *  at compile, typeof-guarded at runtime). A non-string binding is the named
 *  loud error, never a silent cast — the check claims only validated input. */
function bindSeverity(bindings: Record<string, unknown>): Severity {
  const sev = bindings['severity'];
  // ★ F-26 FIX (2026-09-24): validate against the SEVERITIES canon — the old cast accepted
  //   ANY string ('HIGH ' with a trailing space, 'CRITICAL'), which the strict Severity
  //   union forbids and which a downstream severity-weight lookup would silently mis-rank.
  if (typeof sev === 'string' && (SEVERITIES as readonly string[]).includes(sev)) {
    return sev as Severity;
  }
  throw templateBindingInvalid('severity', `the severity binding must be one of ${SEVERITIES.join('|')}`);
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — a string[] binding (default []). */
// ★ F-701 FIX (2026-09-24): Array.isArray confirms the SHAPE but the old `as string[]`
  // cast smuggled non-string elements into downstream .includes() calls (validated but not
  // VERIFIED). Non-strings are dropped - a named-shape guarantee. RIPWIRE_MISSING (index
  // scope-confined to session cwd); consumers verified by grep: 4 same-file sites (388/393/423/424).
function bindStringArray(bindings: Record<string, unknown>, key: string): string[] {
  const v = bindings[key];
  if (Array.isArray(v)) {
    return v.filter((el): el is string => typeof el === 'string');
  }
  return [];
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the stages binding (z.array-validated
 *  at compile, Array.isArray-guarded at runtime). */
function bindStages(bindings: Record<string, unknown>): { id: string; entry: string }[] {
  const v = bindings['stages'];
  if (Array.isArray(v)) {
    return v as { id: string; entry: string }[];
  }
  return [];
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the operator binding: narrowed by the
 *  literal-union check (no cast at all — the comparison narrows the unknown). */
function bindOperator(bindings: Record<string, unknown>): 'lt' | 'lte' | 'gt' | 'gte' {
  const v = bindings['operator'];
  if (typeof v === 'string' && (v === 'lt' || v === 'lte' || v === 'gt' || v === 'gte')) {
    return v;
  }
  return 'gt';
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the number binding (typeof-guarded). */
function bindNumber(bindings: Record<string, unknown>, key: string): number | undefined {
  const v = bindings[key];
  if (typeof v === 'number') {
    return v;
  }
  return undefined;
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the range binding (Array.isArray-
 *  guarded; the z.tuple schema validated the shape at compile). */
function bindRange(bindings: Record<string, unknown>): [number, number] | undefined {
  const v = bindings['range'];
  if (Array.isArray(v)) {
    return v as [number, number];
  }
  return undefined;
}

/** The content-addressed predicate id: the template + the anchor + the bound
 *  params → the same inputs ALWAYS produce the same id (K20.3 determinism). */
/** ★ F-149 FIX (2026-09-24): key-order-stable JSON — {a:1,b:2} and {b:2,a:1} address the same predicate id (K20.3 determinism survives binding construction order; matches JSON.stringify drop-nil semantics). */
function stableBindingsJson(v: unknown): string {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : stableBindingsJson(x))).join(',')}]`;
  const obj = v as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of Object.keys(obj).sort()) {
    const val = obj[k];
    if (val === undefined) continue;
    parts.push(`${JSON.stringify(k)}:${stableBindingsJson(val)}`);
  }
  return `{${parts.join(',')}}`;
}
function contentAddress(templateId: string, bindings: Record<string, unknown>, anchor: string): string {
  return `${templateId}:${sha256(`${anchor}|${stableBindingsJson(bindings)}`).slice(0, 12)}`;
}

/** The D13 card fields EVERY template's schema carries — the quote, the anchor
 *  and the severity ride through the compile as the rule's provenance (D13).
 *  The severity canon is the db.ts SEVERITIES constant (db.ts:66). */
const CARD_FIELDS = {
  verbatimQuote: z.string(),
  anchor: z.string(),
  severity: z.enum(SEVERITIES),
} as const;

/**
 * Bind a template to the validated params + the D13 card meta → a compiled
 * predicate. The check closes over the template's check + the VALIDATED
 * bindings (the zod parse runs here — an invalid binding throws the loud
 * named TEMPLATE_BINDING_INVALID, never a coerced default).
 */
export function compileTemplate(
  template: PredicateTemplate,
  rawBindings: Record<string, unknown>,
  card: { verbatimQuote: string; anchor: string; severity: Severity },
  batteryVersion: string,
): CompiledPredicate {
  let validated: Record<string, unknown>;
  try {
    validated = template.parameters.parse(rawBindings) as Record<string, unknown>;
  } catch (e: unknown) {
    throw templateBindingInvalid(template.id, `the bound params failed the template's zod schema: ${String(e)}`);
  }
  return {
    id: contentAddress(template.id, validated, card.anchor),
    family: template.family,
    template: template.id,
    bindings: validated,
    verbatimQuote: card.verbatimQuote,
    anchor: card.anchor,
    severity: card.severity,
    batteryVersion,
    check: (ctx: CheckContext) => template.check({ ...ctx, bindings: validated }),
  };
}

// ---------------------------------------------------------------------------
// THE 5 FAMILIES (spec §3.7 lines 1049-1056) — the deterministic checks
// ---------------------------------------------------------------------------

// --- WIRING (the codebase-health family) — reads the unwired() / whoCalls()
//     graph queries. A 0-inbound-caller export is the dead-machinery class.

const WIRING_DEAD_MODULE: PredicateTemplate = {
  id: 'wiring.no-dead-module',
  family: 'WIRING',
  parameters: z.object({ ...CARD_FIELDS }),
  check(ctx) {
    const findings: Finding[] = [];
    const sev = bindSeverity(ctx.bindings);
    // the unwired() adapter query = the 0-inbound-callers DeadNode class (graph/interface.ts:106)
    for (const dead of ctx.graph.unwired()) {
      findings.push({
        ruleId: 'wiring.no-dead-module',
        severity: sev,
        file: dead.file,
        line: dead.line,
        evidence: `dead module ${dead.name} (${dead.file}:${dead.line}) has zero inbound callers — the unwired() graph read lists it`,
        verdict: 'VIOLATION',
      });
    }
    return findings;
  },
};

const WIRING_EXPORT_IMPORTER: PredicateTemplate = {
  id: 'wiring.every-export-has-an-importer',
  family: 'WIRING',
  parameters: z.object({ ...CARD_FIELDS }),
  check(ctx) {
    const findings: Finding[] = [];
    const sev = bindSeverity(ctx.bindings);
    // THE EXPORT-ONLY LAW (2026-09-12 — the self-hunt's 384/393 false-positive
    // fix): the predicate's claim is "EXPORT X has zero importers" — it MUST
    // verify the export keyword at the declaration line before firing. The old
    // form iterated every class/function/method node and asserted "export" in
    // the evidence for constructors, class members, and private helpers.
    // CONSTRUCTORS AND METHODS ARE NEVER MODULE EXPORTS — excluded outright.
    // The export keyword is verified from the source line (per-file cache);
    // an unreadable file is UNVERIFIED → silent (evidence-or-silence).
    const exportLinesByFile = new Map<string, Set<number>>();
    const isExportedDecl = (file: string | null | undefined, line: number | null | undefined): boolean => {
      if (!file || typeof line !== 'number' || line <= 0) return false;
      let lines = exportLinesByFile.get(file);
      if (!lines) {
        lines = new Set<number>();
        try {
          // ★ F-125 FIX (2026-09-24): the INJECTED source, never the raw fs read —
          //   the file's own A3 hostile-corpus law + K20.3 determinism mandate ctx.source.
          const src = ctx.source.read(file).split('\n');
          for (let i = 0; i < src.length; i++) if (/^\s*export\s/.test(src[i])) lines.add(i + 1);
        } catch { /* unreadable → unverified → the check stays silent for this file */ }
        exportLinesByFile.set(file, lines);
      }
      return lines.has(line);
    };
    for (const node of ctx.graph.nodes()) {
      if (node.kind !== 'class' && node.kind !== 'function') continue;
      if (!isExportedDecl(node.file, node.line ?? null)) continue;
      const callers = ctx.graph.whoCalls(node.name);
      if (callers.length === 0 && node.file) {
        findings.push({
          ruleId: 'wiring.every-export-has-an-importer',
          severity: sev,
          file: node.file,
          line: node.line ?? 0,
          evidence: `export ${node.name} (${node.file}:${node.line ?? '?'}) has zero call sites — whoCalls('${node.name}') returned []`,
          verdict: 'VIOLATION',
        });
      }
    }
    return findings;
  },
};

// --- CONTRACT (the architecture family) — the declared interface vs the code.

const CONTRACT_MUST_IMPLEMENT: PredicateTemplate = {
  id: 'contract.must-implement',
  family: 'CONTRACT',
  parameters: z.object({
    ...CARD_FIELDS,
    declaredInterface: z.string().default(''),
    requiredMembers: z.array(z.string()).default([]),
  }),
  check(ctx) {
    const findings: Finding[] = [];
    const sev = bindSeverity(ctx.bindings);
    const declaredInterface = String(ctx.bindings['declaredInterface'] ?? '');
    const requiredMembers = bindStringArray(ctx.bindings, 'requiredMembers');
    // nothing declared → nothing to verify → the honest silent (the check claims only what it can measure)
    if (!declaredInterface || requiredMembers.length === 0) return findings;
    for (const node of ctx.graph.nodes('class')) {
      if (node.name !== declaredInterface && node.data?.['interface'] !== declaredInterface) continue;
      const members = node.data !== undefined && node.data !== null ? bindStringArray(node.data, 'members') : [];
      const missing = requiredMembers.filter((m) => !members.includes(m));
      if (missing.length > 0) {
        findings.push({
          ruleId: 'contract.must-implement',
          severity: sev,
          file: node.file ?? '',
          line: node.line ?? 0,
          evidence: `class ${node.name} (${node.file}:${node.line ?? '?'}) declares members ${JSON.stringify(members)} — missing the declared members ${missing.join(', ')}`,
          verdict: 'VIOLATION',
        });
      }
    }
    return findings;
  },
};

// --- PROVENANCE (the truth family) — the lineage duality + the D13 self-check.

const PROVENANCE_TRACES_TO_SOURCE: PredicateTemplate = {
  id: 'provenance.traces-to-source',
  family: 'PROVENANCE',
  parameters: z.object({
    ...CARD_FIELDS,
    targetKinds: z.array(z.string()).default([]),
    requiredTraces: z.array(z.string()).default([]),
  }),
  check(ctx) {
    const findings: Finding[] = [];
    const sev = bindSeverity(ctx.bindings);
    const targetKinds = bindStringArray(ctx.bindings, 'targetKinds');
    const requiredTraces = bindStringArray(ctx.bindings, 'requiredTraces');
    // the spec's §3.7 pseudocode (lines 1061-1080): every target node must carry a
    // traces-to edge from each required trace — the graph chain read, never an execution
    for (const targetKind of targetKinds) {
      for (const node of ctx.graph.nodes(targetKind as never)) {
        const incoming = ctx.graph.chain(node.id);
        const present = requiredTraces.some((r) =>
          incoming.some((step) => step.to === node.id && step.kind === 'traces-to' && step.from.includes(r)),
        );
        if (!present) {
          findings.push({
            ruleId: 'provenance.traces-to-source',
            severity: sev,
            file: node.file ?? '',
            line: node.line ?? 0,
            evidence: `${node.name} lacks a traces-to edge from ${requiredTraces.join('/')} — incoming edges: ${incoming.map((s) => `${s.kind}@${s.from}`).join(', ') || 'NONE'}`,
            verdict: 'VIOLATION',
          });
        }
      }
    }
    return findings;
  },
};

const PROVENANCE_QUOTED_NOT_SYNTHESIZED: PredicateTemplate = {
  id: 'provenance.quoted-not-synthesized',
  family: 'PROVENANCE',
  parameters: z.object({
    ...CARD_FIELDS,
    file: z.string().default(''),
    quote: z.string().default(''),
    range: z.tuple([z.number(), z.number()]).optional(),
  }),
  check(ctx) {
    const findings: Finding[] = [];
    const sev = bindSeverity(ctx.bindings);
    const file = String(ctx.bindings['file'] ?? '');
    const quote = String(ctx.bindings['quote'] ?? '');
    // the D13 self-enforcement (the P16 instantiation): the machine asserts only
    // what it can quote — the verbatim text must be present in the source read.
    // No file/quote bound → nothing to verify → the honest silent.
    if (!file || !quote) return findings;
    const range = bindRange(ctx.bindings);
    const text = ctx.source.read(file, range);
    if (!text.includes(quote)) {
      findings.push({
        ruleId: 'provenance.quoted-not-synthesized',
        severity: sev,
        file,
        line: range?.[0] ?? 0,
        evidence: `the verbatim quote '${quote.slice(0, 80)}...' is absent from ${file} — doctrine is QUOTED, never synthesized (D13)`,
        verdict: 'VIOLATION',
      });
    }
    return findings;
  },
};

// --- DOMAIN (the project-rules family) — the bindings-driven numeric thresholds
//     (the price-anchoring ceilings, the divergence caps — P4/P6/P7-P15 class).

const DOMAIN_NUMERIC_THRESHOLD: PredicateTemplate = {
  id: 'domain.numeric-threshold',
  family: 'DOMAIN',
  parameters: z.object({
    ...CARD_FIELDS,
    symbol: z.string().default(''),
    valuePath: z.string().default(''),
    operator: z.enum(['lt', 'lte', 'gt', 'gte']).default('gt'),
    threshold: z.number().optional(),
  }),
  check(ctx) {
    const findings: Finding[] = [];
    const sev = bindSeverity(ctx.bindings);
    const symbol = String(ctx.bindings['symbol'] ?? '');
    const valuePath = String(ctx.bindings['valuePath'] ?? '');
    const operator = bindOperator(ctx.bindings);
    const threshold = bindNumber(ctx.bindings, 'threshold');
    // unmeasurable (no symbol/path/threshold bound) → the honest silent — the
    // check claims only what it can measure from the graph/source reads
    // ★ F-552 FIX (2026-09-24): a non-finite threshold (NaN/Infinity) passes typeof==='number'
    //   and makes every comparison unsatisfiable — the same silent suppression F-444 closed for
    //   values. Unmeasurable → the honest silent, like a missing binding.
    if (!symbol || !valuePath || typeof threshold !== 'number' || !Number.isFinite(threshold)) return findings;
    for (const node of ctx.graph.nodes()) {
      if (node.name !== symbol) continue;
      const value = readPath(node.data ?? {}, valuePath);
      // ★ F-444 FIX (2026-09-24): `typeof NaN === 'number'` is TRUE, and every comparison
      //   against NaN is false — so a NaN (or ±Infinity) from node.data SILENTLY SUPPRESSED
      //   the violation. A non-finite value is not a measurable value: skip it explicitly.
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (compareOperator(operator, value, threshold)) {
        findings.push({
          ruleId: 'domain.numeric-threshold',
          severity: sev,
          file: node.file ?? '',
          line: node.line ?? 0,
          evidence: `${node.name}.${valuePath} = ${value} violates the declared ${operator} ${threshold} ceiling (bindings: ${JSON.stringify(ctx.bindings)})`,
          verdict: 'VIOLATION',
        });
      }
    }
    return findings;
  },
};

// --- PROCESS (the engineering family) — the declared stage sequence vs the call graph.

const PROCESS_GATES_OUTPUTS: PredicateTemplate = {
  id: 'process.gates-measure-outputs-not-logic',
  family: 'PROCESS',
  parameters: z.object({
    ...CARD_FIELDS,
    stages: z.array(z.object({ id: z.string(), entry: z.string() })).default([]),
  }),
  check(ctx) {
    const findings: Finding[] = [];
    const sev = bindSeverity(ctx.bindings);
    const stages = bindStages(ctx.bindings);
    // the declared pipeline order vs the call graph (the P18 instantiation): each
    // stage's entry must be reachable from the previous stage's entry in the
    // graph's awaits/caller reads — a declared sequence that is not wired is a violation
    for (let i = 0; i + 1 < stages.length; i++) {
      const cur = stages[i];
      const next = stages[i + 1];
      const outgoing = ctx.graph.awaits(cur.entry);
      const callers = ctx.graph.whoCalls(next.entry);
      const connected = outgoing.some((e) => e.to.includes(next.entry)) || callers.some((c) => c.caller === cur.entry);
      if (!connected) {
        findings.push({
          ruleId: 'process.gates-measure-outputs-not-logic',
          severity: sev,
          file: cur.entry,
          line: 0,
          evidence: `stage ${cur.id} (entry ${cur.entry}) has no graph edge reaching stage ${next.id} (entry ${next.entry}) — the declared sequence is not wired in the call graph`,
          verdict: 'VIOLATION',
        });
      }
    }
    return findings;
  },
};

/** THE EDGE-ANCHOR SPEC (ST-12, the ISE law: the lexicon/regex is the
 *  DETECTOR, never the decision layer; the edge traversal is the decision).
 *  A semantic predicate declares WHERE its candidates come from in graph terms;
 *  resolveEdgeAnchor executes that declaration against the adapter's verbs. */
export interface AnchorSpec {
  /** Bare callee names resolved via whoCalls (e.g. 'join', 'setAbortFlag'). */
  callSymbols: string[];
  /** Substring matchers over imports-edge targets (e.g. 'node:path'). */
  importMatchers: string[];
  /** Name matchers for DEFINING nodes that must ALSO show edge participation. */
  defMatchers: RegExp[];
}

/** One traversed edge cited as the finding's decision evidence. */
export interface EdgeCitation {
  from: string;
  to: string;
  kind: string;
  file: string;
  line: number;
}

/** The anchored candidate set: files admitted ONLY through traversed edges. */
export interface EdgeAnchor {
  files: Set<string>;
  cites: Map<string, EdgeCitation[]>;
}

function safeWhoCalls(graph: GraphAdapter, sym: string): CallSite[] {
  try {
    return graph.whoCalls(sym) ?? [];
  } catch {
    return [];
  }
}

function safeImports(graph: GraphAdapter, module: string): ImportEdge[] {
  try {
    return graph.imports(module) ?? [];
  } catch {
    return [];
  }
}

function safeChain(graph: GraphAdapter, id: string): ChainStep[] {
  try {
    return graph.chain(id) ?? [];
  } catch {
    return [];
  }
}

function safeAwaits(graph: GraphAdapter, sym: string): AwaitEdge[] {
  try {
    return graph.awaits(sym) ?? [];
  } catch {
    return [];
  }
}

function safeNodes(graph: GraphAdapter): GraphNode[] {
  try {
    return graph.nodes() ?? [];
  } catch {
    return [];
  }
}

/** Resolve the candidate files STRICTLY through graph edges (whoCalls /
 *  imports / chain / awaits). A file the edges never mention is NEVER a
 *  candidate — an empty edge store yields ZERO candidates (the vanishing
 *  control passes BY CONSTRUCTION). Verb throws (unbuilt adapter) degrade to
 *  the empty contribution, never a loud abort: the engine's ENGINE_GRAPH_EMPTY
 *  owns the loud empty-graph fail, not the predicate. */
export function resolveEdgeAnchor(graph: GraphAdapter, spec: AnchorSpec): EdgeAnchor {
  const files = new Set<string>();
  const cites = new Map<string, EdgeCitation[]>();
  const add = (file: string, c: EdgeCitation): void => {
    if (!file) return;
    files.add(file);
    const arr = cites.get(file) ?? [];
    arr.push(c);
    cites.set(file, arr);
  };
  for (const sym of spec.callSymbols) {
    for (const cs of safeWhoCalls(graph, sym)) {
      add(cs.file, { from: cs.caller, to: sym, kind: 'calls', file: cs.file, line: cs.line });
    }
  }
  // THE CORBELL-SHAPE FIX (2026-09-07): the corbell substrate emits
  // module/method/function/class kinds (mapped from service/method/flow by
  // the adapter's edge-kind map), NEVER 'file'. The old filter (n.kind !==
  // 'file') made the imports matching STRUCTURALLY DEAD on the corbell
  // substrate — the anchor gate returned empty for every predicate and the
  // vanishing control passed for the wrong reason (the empty anchor = no
  // findings, but not because the edges were consulted). THE FIX: the
  // imports matching now runs on EVERY node that carries a file attribute —
  // the corbell mapped nodes DO carry .file (the adapter resolves it from
  // the workspace.db row :516-527). The imports edges are matched by the
  // node's keys (id/name/file) against the importMatchers — the same
  // logic, the correct node universe.
  for (const n of safeNodes(graph)) {
    const keys: string[] = [];
    if (n.id) keys.push(n.id);
    if (n.name && n.name !== n.id) keys.push(n.name);
    if (n.file && n.file !== n.name && n.file !== n.id) keys.push(n.file);
    if (keys.length === 0) continue;
    for (const key of keys) {
      for (const e of safeImports(graph, key)) {
        const target = String(e.to);
        if (spec.importMatchers.some((m) => target.includes(m))) {
          add(e.file || n.file || '', { from: String(e.from), to: String(e.to), kind: 'imports', file: e.file, line: e.line });
        }
      }
    }
  }
  for (const n of safeNodes(graph)) {
    if (n.kind !== 'function' && n.kind !== 'method' && n.kind !== 'class') continue;
    if (!spec.defMatchers.some((rx) => rx.test(n.name))) continue;
    const inbound = safeWhoCalls(graph, n.name);
    const steps = safeChain(graph, n.id);
    const aw = safeAwaits(graph, n.name);
    if (inbound.length === 0 && steps.length === 0 && aw.length === 0) continue;
    const file = n.file ?? '';
    if (inbound.length > 0) {
      const c0 = inbound[0] as CallSite;
      add(file, { from: c0.caller, to: n.name, kind: 'calls', file: c0.file, line: c0.line });
    } else if (steps.length > 0) {
      const s0 = steps[0] as ChainStep;
      add(file, { from: String(s0.from), to: String(s0.to), kind: String(s0.kind), file: s0.file, line: s0.line });
    } else {
      const a0 = aw[0] as AwaitEdge;
      add(file, { from: String(a0.from), to: String(a0.to), kind: 'awaits', file: a0.file, line: a0.line });
    }
  }
  return { files, cites };
}

/** Render one edge citation for the evidence string (the ST-12.1 assertion
 *  surface: /edge|calls|imports|from.*to/i). */
export function edgeEvidence(c: EdgeCitation): string {
  return `edge ${c.from} -[${c.kind}]-> ${c.to} (${c.file}:${c.line})`;
}

/** First citation for a file (the primary anchor leg of the evidence triad). */
export function firstCite(cites: Map<string, EdgeCitation[]>, file: string): EdgeCitation | undefined {
  return cites.get(file)?.[0];
}

/** THE template library — the compiler + the compiled-store rehydration look
 *  the templates up here by id. The library is the machine's constant. */
export const TEMPLATE_LIBRARY: Readonly<Record<string, PredicateTemplate>> = {
  'wiring.no-dead-module': WIRING_DEAD_MODULE,
  'wiring.every-export-has-an-importer': WIRING_EXPORT_IMPORTER,
  'contract.must-implement': CONTRACT_MUST_IMPLEMENT,
  'provenance.traces-to-source': PROVENANCE_TRACES_TO_SOURCE,
  'provenance.quoted-not-synthesized': PROVENANCE_QUOTED_NOT_SYNTHESIZED,
  'domain.numeric-threshold': DOMAIN_NUMERIC_THRESHOLD,
  'process.gates-measure-outputs-not-logic': PROCESS_GATES_OUTPUTS,
};
