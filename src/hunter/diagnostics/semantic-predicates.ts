// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/diagnostics/semantic-predicates.ts — verbatim bytes; SEAM: shared/knowledge-graph imports rewritten to the ported siblings (../shared/db.ts, ../profile/*).
// semantic predicates — EDGE-ANCHORED traversal (ST-12, CLEANUP_RESTORE_DPL1_SPEC.md §13.2).
// THE PATTERN per predicate: (a) THE ANCHOR — candidate files resolve through the
// graph edges (resolveEdgeAnchor over whoCalls/imports/chain/awaits — lexicon/templates.ts),
// never nodes() as a file list; (b) THE WINDOW — the regex/text match runs ONLY inside
// the edge-resolved files (the regex is the DETECTOR inside the resolved scope — the ISE
// law: the detector detects, the edge traversal decides); (c) THE EVIDENCE — every
// finding's evidence carries the edge citation (from→to kind) + the matched window.
// THE CONTENTMAP RULE: the hoisted contentMap feeds the window reads, but NO finding
// exists for a file the edges did not anchor — an empty anchor set returns ZERO
// findings (no anchor = no scan), so DELETE FROM graph_edges vanishes every finding here.
import { z } from 'zod';
import { SEVERITIES, type Severity } from '../shared/db.ts';
import type { CheckContext, CompiledPredicate, Finding, PredicateTemplate } from '../lexicon/templates.ts';
import { compileTemplate, edgeEvidence, firstCite, resolveEdgeAnchor, type AnchorSpec, type EdgeAnchor } from '../lexicon/templates.ts';
import type { EvidenceTriad } from '../triad.ts';
import { isEvidenceTriad } from '../triad.ts';
const CARD_FIELDS = { verbatimQuote: z.string(), anchor: z.string(), severity: z.enum(SEVERITIES) } as const;
type TriadFinding = Finding & { triad: EvidenceTriad };
// THE SEVERITY MAPPING TABLE (the R18 named-vocab form — the db's short
// severity tokens to the evidence-triad's family vocabulary)
const SEVERITY_MAP: Readonly<Record<string, EvidenceTriad['pattern']['familySeverity']>> = { CRIT: 'CRITICAL', HIGH: 'HIGH', MED: 'MEDIUM' };
function mapSeverity(dbSev: Severity): EvidenceTriad['pattern']['familySeverity'] { return SEVERITY_MAP[dbSev] ?? 'LOW'; }
function makeTriad(file: string, line: number, memberId: string, severity: Severity): EvidenceTriad {
  const triad: EvidenceTriad = { pattern: { memberId, familySeverity: mapSeverity(severity) }, state: { machineId: 'semantic-battery', from: 'IDLE', to: 'VIOLATED' }, evidence: { file, line } };
  if (!isEvidenceTriad(triad)) throw new Error('FINDING_NO_TRIPLET');
  return triad;
}
function bindSeverity(b: Record<string, unknown>): Severity {
  const v = b['severity'];
  if (typeof v === 'string' && (SEVERITIES as readonly string[]).includes(v)) return v as Severity;
  return 'HIGH';
}
// THE EVIDENCE FORMAT (ST-12.1): [bug] member at file:line — snippet | edge from -[kind]-> to (efile:eline) | triad=member.
// The edge leg is MANDATORY — a finding without a traversed edge is theater.
function evEdge(mid: string, file: string, line: number, snippet: string, bug: string, anchor: EdgeAnchor): string {
  const cite = firstCite(anchor.cites, file);
  if (!cite) throw new Error(`FINDING_NO_ANCHOR: ${mid} at ${file}:${line} — no traversed edge (callers must pre-check firstCite)`);
  const edgeLeg = edgeEvidence(cite);
  return `[${bug}] ${mid} at ${file}:${line} — ${snippet.slice(0, 180)} | ${edgeLeg} | triad=${mid}`;
}
// THE WINDOW READ: the hoisted contentMap first, the lockdown source read as the
// fallback. An unreadable source is the honest silent skip (never a throw — the
// adversarial unreadable-source test pins this).
function windowText(ctx: CheckContext, file: string): string | undefined {
  const hoisted = ctx.contentMap?.get(file);
  if (hoisted !== undefined) return hoisted;
  try {
    return ctx.source.read(file);
  } catch (e: unknown) {
    console.error(`[semantic-predicates] source read failed for ${file}: ${String(e)}`);
    return undefined;
  }
}
// THE ANCHOR GATE: resolve candidates through the edges; an empty anchor set is
// the loud honest zero (no anchor = no scan — the vanishing control's mechanism).
function anchored(ctx: CheckContext, spec: AnchorSpec): EdgeAnchor | null {
  let anchor: EdgeAnchor;
  try {
    anchor = resolveEdgeAnchor(ctx.graph, spec);
  } catch (e: unknown) {
    console.error(`[semantic-predicates] edge anchor failed: ${String(e)}`);
    return null;
  }
  if (anchor.files.size === 0) return null;
  return anchor;
}

export const PROCESS_CWD_PERSISTENCE_MESSAGE = 'process.cwd()-resolved persistence path';
export const PROCESS_CWD_PERSISTENCE_REMEDIATION = 'anchor to project root via injected baseDir';
// P1 ANCHOR: files importing the path/fs modules (imports edges) OR callers of the
// persistence-lexicon symbols (whoCalls on the writeFile/mkdirSync/join family).
const P1_SPEC: AnchorSpec = {
  callSymbols: ['writeFile', 'writeFileSync', 'appendFile', 'appendFileSync', 'mkdir', 'mkdirSync', 'join', 'resolve', 'createWriteStream', 'rmSync', 'existsSync', 'cwd'],
  importMatchers: ['node:path', 'node:fs', 'path', 'fs'],
  defMatchers: [],
};
export const P1: PredicateTemplate = {
  id: 'semantic.process-cwd-persistence', family: 'PROCESS', parameters: z.object({ ...CARD_FIELDS }),
  check(ctx) {
    const findings: Finding[] = []; const sev = bindSeverity(ctx.bindings);
    const anchor = anchored(ctx, P1_SPEC);
    if (anchor === null) return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file); if (text === undefined) continue;
      if (!firstCite(anchor.cites, file)) continue;
      if (!text.includes('process.cwd()')) continue;
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) if ((lines[i] ?? '').includes('process.cwd()')) {
        const win = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 12)).join('\n');
        // ★ F-840 FIX (2026-09-24): second alternative mirrored the first — it missed appendFile(Sync)?, createWriteStream, resolve, so `.trident`+appendFile/resolve windows were false negatives while the forward direction fired.
        if (/(writeFile(Sync)?|appendFile(Sync)?|mkdir(Sync)?|createWriteStream|(?:path\.)?join|(?:path\.)?resolve).*\.trident|\.trident.*(writeFile(Sync)?|appendFile(Sync)?|mkdir(Sync)?|createWriteStream|(?:path\.)?join|(?:path\.)?resolve)/.test(win)) {
          const triad = makeTriad(file, i + 1, 'semantic.process-cwd-persistence', sev);
          findings.push({ ruleId: 'semantic.process-cwd-persistence', severity: sev, file, line: i + 1, evidence: evEdge('semantic.process-cwd-persistence', file, i + 1, lines[i]!.trim(), 'HT-BUG-3b/15', anchor), verdict: 'VIOLATION', triad } as TriadFinding);
        }
      }
    }
    return findings;
  },
};
export const DUAL_STORE_LIFECYCLE_MESSAGE = 'lifecycle writes side-channel store';
export const DUAL_STORE_LIFECYCLE_REMEDIATION = 'write terminal phase via writeStateAtomic';
// P2 ANCHOR: callers of the lifecycle symbols (setAbortFlag/abort/writeState family via whoCalls).
const P2_SPEC: AnchorSpec = {
  callSymbols: ['setAbortFlag', 'abort', 'writeState', 'writeStateAtomic', 'clearPoller', 'setPhase'],
  importMatchers: [],
  defMatchers: [],
};
export const P2: PredicateTemplate = {
  id: 'semantic.dual-store-lifecycle-write', family: 'PROCESS', parameters: z.object({ ...CARD_FIELDS }),
  check(ctx) {
    const findings: Finding[] = []; const sev = bindSeverity(ctx.bindings);
    const anchor = anchored(ctx, P2_SPEC);
    if (anchor === null) return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file); if (text === undefined) continue;
      if (!firstCite(anchor.cites, file)) continue;
      if (!text.includes('setAbortFlag')) continue;
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) if ((lines[i] ?? '').includes('setAbortFlag')) {
        // F-1602: exclude trigger line — setAbortFlag contains abort, making /abort/i trivially true.
        const winWithoutTrigger = lines.slice(Math.max(0, i - 15), i).join('\n') + '\n' + lines.slice(i + 1, Math.min(lines.length, i + 15)).join('\n');
        if (/abort/i.test(winWithoutTrigger) && !/writeStateAtomic|phase.*FAILED/.test(winWithoutTrigger)) {
          const triad = makeTriad(file, i + 1, 'semantic.dual-store-lifecycle-write', sev);
          findings.push({ ruleId: 'semantic.dual-store-lifecycle-write', severity: sev, file, line: i + 1, evidence: evEdge('semantic.dual-store-lifecycle-write', file, i + 1, lines[i]!.trim(), 'HT-BUG-2', anchor), verdict: 'VIOLATION', triad } as TriadFinding);
        }
      }
    }
    return findings;
  },
};
export const UNWIRED_ENFORCEMENT_MESSAGE = 'exported gate has zero callers';
export const UNWIRED_ENFORCEMENT_REMEDIATION = 'wire gate into hook';
// P3 ANCHOR: files reached through enforcement-call edges (whoCalls on the
// enforce/gate/guard family) or importing enforcement modules, plus defining
// nodes named enforce*/gate*/guard* with edge participation. Candidates stay the
// gate-named NODES (the zero-caller question needs nodes), but scoped to
// anchor.files — no anchor = no scan (the vanishing control holds for P3 too).
const P3_SPEC: AnchorSpec = {
  callSymbols: ['enforce', 'enforceStateGate', 'guard', 'gate'],
  importMatchers: ['enforce', 'gate', 'guard', 'firewall'],
  defMatchers: [/(enforce|gate|guard|STATE_GATE)/i],
};
export const P3: PredicateTemplate = {
  id: 'semantic.unwired-enforcement', family: 'WIRING', parameters: z.object({ ...CARD_FIELDS }),
  check(ctx) {
    const findings: Finding[] = []; const sev = bindSeverity(ctx.bindings);
    // ★ F-363 FIX (2026-09-24): edge-anchored scope — the old loop scanned every
    //   function/method/class node in the graph and hand-built an 'edge NONE' leg,
    //   reaching files no edge traversal would ever admit. Candidates are now gated
    //   on anchor.files (empty anchor = zero findings); the zero-caller verdict still
    //   comes from whoCalls, and the evidence cites the traversed edge via evEdge.
    const anchor = anchored(ctx, P3_SPEC);
    if (anchor === null) return findings;
    // ★ F-1200 FIX (2026-09-25): whoCalls(name) is name-keyed — two nodes sharing a
    // ★ name (e.g. `enforce` in files A+B) resolve to the same target, so B's zero-caller
    // ★ verdict read A's callers (false negative via name collision). Prefer the adapter's
    // ★ node-ID-keyed unwired() set; whoCalls stays only as the fallback when unwired() throws.
    let deadIds: Set<string> | null = null;
    try {
      deadIds = new Set(ctx.graph.unwired().map((d) => d.id));
    } catch { deadIds = null; }
    for (const node of ctx.graph.nodes()) {
      if (node.kind !== 'function' && node.kind !== 'method' && node.kind !== 'class') continue;
      if (!/(enforce|gate|guard|STATE_GATE)/i.test(node.name)) continue;
      const file = node.file ?? ''; if (!file) continue;
      if (!anchor.files.has(file)) continue;
      if (!firstCite(anchor.cites, file)) continue;
      const nid = (node as unknown as { id?: string }).id;
      if (deadIds !== null) {
        if (nid === undefined || !deadIds.has(nid)) continue;
      } else {
        let callers: { file: string; line: number; caller: string }[];
        try {
          callers = ctx.graph.whoCalls(node.name);
        } catch (e: unknown) {
          console.error(`[semantic-predicates] P3 whoCalls failed for ${node.name}: ${String(e)}`);
          continue;
        }
        if (callers.length !== 0) continue;
      }
      const text = windowText(ctx, file); if (text === undefined) continue;
      if (!/(enforcer|gate|firewall)/i.test(file) && !/(enforcer|gate)/i.test(text.slice(0, 2000))) continue;
      const triad = makeTriad(file, node.line ?? 1, 'semantic.unwired-enforcement', sev);
      const evidence = evEdge('semantic.unwired-enforcement', file, node.line ?? 1, `${node.name} — ${deadIds !== null ? `unwired() lists id ${nid ?? node.name}` : `whoCalls("${node.name}")=[]`} over the calls edges (no inbound caller in the edge store)`, 'wired-dead', anchor);
      findings.push({ ruleId: 'semantic.unwired-enforcement', severity: sev, file, line: node.line ?? 1, evidence, verdict: 'VIOLATION', triad } as TriadFinding);
    }
    return findings;
  },
};
export const ERROR_ONLY_GUARD_MESSAGE = 'guard covers only error/aborted';
export const ERROR_ONLY_GUARD_REMEDIATION = 'add Array.isArray(message.content) guard';
// P4 ANCHOR: callers of the stopReason/error-field consumers (whoCalls on the
// stopReason symbol) + defining nodes named stopReason* with edge participation.
const P4_SPEC: AnchorSpec = {
  callSymbols: ['stopReason'],
  importMatchers: [],
  defMatchers: [/stopReason/i],
};
export const P4: PredicateTemplate = {
  id: 'semantic.error-only-guard-gap', family: 'CONTRACT', parameters: z.object({ ...CARD_FIELDS }),
  check(ctx) {
    const findings: Finding[] = []; const sev = bindSeverity(ctx.bindings);
    const anchor = anchored(ctx, P4_SPEC);
    if (anchor === null) return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file); if (text === undefined) continue;
      if (!firstCite(anchor.cites, file)) continue;
      if (!text.includes('stopReason')) continue;
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) if (/stopReason.*error|stopReason.*aborted/i.test(lines[i] ?? '')) {
        const win = lines.slice(Math.max(0, i - 8), Math.min(lines.length, i + 16)).join('\n');
        if (!/Array\.isArray.*message\.content|AETHER_MALFORMED/.test(win)) {
          const triad = makeTriad(file, i + 1, 'semantic.error-only-guard-gap', sev);
          findings.push({ ruleId: 'semantic.error-only-guard-gap', severity: sev, file, line: i + 1, evidence: evEdge('semantic.error-only-guard-gap', file, i + 1, lines[i]!.trim(), 'HT-BUG-8', anchor), verdict: 'VIOLATION', triad } as TriadFinding);
        }
      }
    }
    return findings;
  },
};
export const DIAGNOSTICS_JAIL_MESSAGE = 'phase allowlist lacks read exemptions';
export const DIAGNOSTICS_JAIL_REMEDIATION = 'add DIAGNOSTIC_TOOLS exemption';
// P5 ANCHOR: files importing the diagnostics registry (imports edges against the
// enforcer/diagnostics module matchers) + callers of the enforcement symbols.
const P5_SPEC: AnchorSpec = {
  callSymbols: ['enforce', 'enforceStateGate'],
  importMatchers: ['diagnostic', 'audit', 'enforce', 'guardian', 'poseidon', 'hook', 'phase'],
  defMatchers: [/PHASE_REQUIRED_TOOLS/i],
};
export const P5: PredicateTemplate = {
  id: 'semantic.diagnostics-jail', family: 'PROCESS', parameters: z.object({ ...CARD_FIELDS }),
  check(ctx) {
    const findings: Finding[] = []; const sev = bindSeverity(ctx.bindings);
    const anchor = anchored(ctx, P5_SPEC);
    if (anchor === null) return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file); if (text === undefined) continue;
      if (!firstCite(anchor.cites, file)) continue;
      if (!/PHASE_REQUIRED_TOOLS/i.test(text)) continue;
      if (/DIAGNOSTIC_TOOLS/i.test(text)) continue;
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) if (/PHASE_REQUIRED_TOOLS/i.test(lines[i] ?? '')) {
        const win = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 30)).join('\n');
        // ★ F-47 FIX (2026-09-24): bare `read` matched ready/readme/readline/
        // ★ breadth — any PHASE_REQUIRED_TOOLS file mentioning 'ready' escaped the
        // ★ finding. The exemption is the word `read` (\bread\b), not the substring.
        if (!/DIAGNOSTIC_TOOLS|AUDIT_TOOLS|\bread\b/.test(win)) {
          const triad = makeTriad(file, i + 1, 'semantic.diagnostics-jail', sev);
          findings.push({ ruleId: 'semantic.diagnostics-jail', severity: sev, file, line: i + 1, evidence: evEdge('semantic.diagnostics-jail', file, i + 1, lines[i]!.trim(), 'HT-BUG-21', anchor), verdict: 'VIOLATION', triad } as TriadFinding);
        }
      }
    }
    return findings;
  },
};
export const UNSCOPED_WALKER_MESSAGE = 'walker exclude omits Checkpoints';
export const UNSCOPED_WALKER_REMEDIATION = 'add EXCLUDED_DIRS with Checkpoints .trident dist';
// P6 ANCHOR: files whose modules define the walker symbols (def nodes with edge
// participation) + callers of the readdirSync/scanTsFiles walker family.
const P6_SPEC: AnchorSpec = {
  callSymbols: ['readdirSync', 'readdir', 'scanTsFiles', 'walkFiles', 'globSync'],
  importMatchers: ['node:fs', 'fs'],
  defMatchers: [/scanTsFiles|walker|walkFiles/i],
};
export const P6: PredicateTemplate = {
  id: 'semantic.unscoped-walker', family: 'PROCESS', parameters: z.object({ ...CARD_FIELDS }),
  check(ctx) {
    const findings: Finding[] = []; const sev = bindSeverity(ctx.bindings);
    const anchor = anchored(ctx, P6_SPEC);
    if (anchor === null) return findings;
    for (const file of anchor.files) {
      const text = windowText(ctx, file); if (text === undefined) continue;
      if (!firstCite(anchor.cites, file)) continue;
      if (!/scanTsFiles|readdirSync/i.test(text)) continue;
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) if (/scanTsFiles|readdirSync/i.test(lines[i] ?? '')) {
        const win = lines.slice(Math.max(0, i - 20), Math.min(lines.length, i + 30)).join('\n');
        const hasEx = /exclude|EXCLUDED_DIRS/i.test(win);
        if (!hasEx) {
          const triad = makeTriad(file, i + 1, 'semantic.unscoped-walker', sev);
          findings.push({ ruleId: 'semantic.unscoped-walker', severity: sev, file, line: i + 1, evidence: evEdge('semantic.unscoped-walker', file, i + 1, lines[i]!.trim(), 'HT-BUG-20', anchor), verdict: 'VIOLATION', triad } as TriadFinding);
        // ★ F-948 NOTE (2026-09-24): NOT-A-BUG — `||` is the correct require-BOTH shape: the
        //   remediation (UNSCOPED_WALKER_REMEDIATION) demands Checkpoints AND .trident, so the
        //   exclusion is incomplete when EITHER is absent (!A || !B). `&&` would flag only when
        //   both are missing, letting a half-scoped walker pass. PROOF (truth table): win with
        //   Checkpoints but no .trident → hasEx true, !A false, !B true → FIRES (correct:
        //   half-scoped); win with both → !A false, !B false → silent (correct).
        // ★ F-1050 FIX (2026-09-25): the remediation (UNSCOPED_WALKER_REMEDIATION) demands Checkpoints AND .trident AND dist — the old two-term || let a walker excluding Checkpoints+.trident but NOT dist pass silent (SILENT miss). Third term closes it.
        } else if (!/Checkpoints/i.test(win) || !/\.trident/i.test(win) || !/\bdist\b/i.test(win)) {
          const triad = makeTriad(file, i + 1, 'semantic.unscoped-walker', sev);
          findings.push({ ruleId: 'semantic.unscoped-walker', severity: sev, file, line: i + 1, evidence: evEdge('semantic.unscoped-walker', file, i + 1, lines[i]!.trim() + ' missing Checkpoints/.trident/dist', 'HT-BUG-20', anchor), verdict: 'VIOLATION', triad } as TriadFinding);
        }
      }
    }
    return findings;
  },
};

export const SEMANTIC_TEMPLATES: Readonly<Record<string, PredicateTemplate>> = {
  'semantic.process-cwd-persistence': P1,
  'semantic.dual-store-lifecycle-write': P2,
  'semantic.unwired-enforcement': P3,
  'semantic.error-only-guard-gap': P4,
  'semantic.diagnostics-jail': P5,
  'semantic.unscoped-walker': P6,
};
export const SEMANTIC_PREDICATE_IDS = Object.keys(SEMANTIC_TEMPLATES);
// ★ F-28 NOTE (2026-09-24): rawBindings and card are INTENTIONALLY the same shape —
// ★ every semantic template's `parameters` schema IS z.object({...CARD_FIELDS}), so the
// ★ zod parse validates exactly the card fields, and compileTemplate splits them internally
// ★ (validated → bindings, card → row meta). NOT-A-BUG: no bypass, no confusion.
export function buildSemanticBattery(batteryVersion = 'semantic-v1'): CompiledPredicate[] {
  const out: CompiledPredicate[] = [];
  for (const [id, tmpl] of Object.entries(SEMANTIC_TEMPLATES)) out.push(compileTemplate(tmpl, { verbatimQuote: tmpl.id, anchor: `semantic-predicates.ts:${id}`, severity: 'HIGH' as Severity }, { verbatimQuote: tmpl.id, anchor: `semantic-predicates.ts:${id}`, severity: 'HIGH' as Severity }, batteryVersion));
  return out;
}
