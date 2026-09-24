// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/lexicon/compiler.ts — verbatim bytes; SEAM: db->../shared/db-canon.ts, profile->../profile/schema.ts.
// src/subagents/trident-bug-hunter/lexicon/compiler.ts
// THE LEXICON COMPILER (W4, spec §3.9 lines 1212-1294). The corpus + the
// templates + the bindings → the compiled predicate battery. The compilation is
// DETERMINISTIC + CACHED by the corpus hash (K20.3): batteryVersion =
// sha256(corpus contents + the bindings). The compile is PROJECT-AGNOSTIC (O3.1):
// it consumes the profile's corpus paths + the bindings ONLY — no project
// content, no Plutus strings, no P-number literals (the Plutus corpus P1-P22 is
// W10's instantiation, never W4's content).
//
// THE FAIL-CLOSED LAW: an unreadable corpus / an unparseable card → the loud
// NAMED error (O32.1), never a silent empty battery; the EMPTY corpus (a clean
// project's zero-rule corpus) is the valid HONEST zero battery — the two states
// are distinguished by measurement, never conflated.
// THE A3 HOSTILE-CORPUS LAW: the fake 'run everything' rule compiles as DATA —
// the template library supplies the check, the hostile text fills only the
// bindings, so a check that could execute the fake command is structurally
// impossible (the check signature is a pure graph/source read).

import fs from 'node:fs';
// ★ F-146 FIX (2026-09-24): non-blocking corpus reads for the async compile paths (below).
import { readFile } from 'node:fs/promises';
import type { ProjectProfile } from '../profile/schema.ts';
import type { DbClient, Severity } from '../shared/db-canon.ts';
import { SEVERITIES } from '../shared/db-canon.ts';
import {
  TEMPLATE_LIBRARY, compileTemplate, LexiconError, sha256,
  type CompiledPredicate, type PredicateTemplate,
} from './templates.ts';
import { extractRuleCards, extractRuleCardsAsync, corpusUnreadable, type RuleCard } from './rule-card.ts';
import { writeBattery, writeRuleCards, writeCompiledCache, loadBattery } from './compiled-store.ts';

// ---------------------------------------------------------------------------
// The corpus hash + the battery version (K20.3) — the cache key the determinism
// depends on. CONTENT-based (the spec §3.9 failure modes: a file's mtime change
// without a content change must NOT poison the cache) — the corpus bytes + the
// bindings JSON are the only inputs. The spec's formula, verbatim:
// batteryVersion = sha256(corpus contents + the bindings) (spec §3.9:1241).
// THE OPERATOR'S NAMING RULING (2026-08-13 — the rehydration build, V3.1 dead):
// the raw sha256 was the anonymous class the operator rejected ("everything
// needs to be properly named with a project token so i can tell what this is
// not some random hash vals"). The sha256 SURVIVES as the fingerprint (the
// determinism core, K20.3 — the first 12 hex chars); the NAMED prefix (the
// project token + the battery name + the version) is a presentation layer over
// the same content hash — a one-byte corpus edit changes the fingerprint, so
// the cache invalidates EXACTLY as before. The name derives ONLY from the
// profile + the corpus content — never a timestamp, never an fs order — so the
// same corpus + the same bindings ALWAYS yield the SAME named version string.
// ---------------------------------------------------------------------------

/** The project token — the profile's project.name, slugified (the operator's
 *  "project token" ruling). 'Plutus_Agent' → 'plutus-agent'; 'fixture-profile'
 *  → 'fixture-profile'. */
// calib: the ARCH predicate's template key (the contract.must-implement
// library entry — the compiler's ARCH-to-template binding)
const ARCH_TEMPLATE_KEY = 'contract.must-implement';

export function projectTokenSlug(projectName: string): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug === '' ? 'project' : slug;
}

/** The battery name — the corpus's FIRST rule card (the extraction is
 *  deterministic: the same corpus bytes → the same first card): the
 *  classification + the anchor's file stem form the human-readable slug
 *  (the example's spirit 'p6-price-anchor' — the project + the rule identity). */
function batteryName(profile: ProjectProfile): string {
  return batteryNameFromCards(extractRuleCards(profile.rules.corpus));
}

/** ★ F-832 FIX (2026-09-24): the name from PRE-EXTRACTED cards — batteryVersionAsync extracts
 *  once via extractRuleCardsAsync and never touches the sync readFileSync extractor, so the
 *  F-146 non-blocking contract holds on the async path. The sync twin above keeps readFileSync
 *  for sync callers; both feed the same first-card rule, so the version string is unchanged. */
function batteryNameFromCards(cards: RuleCard[]): string {
  if (cards.length === 0) return 'rules';
  const first = cards[0];
  const stem = first.anchor.split('/').pop()?.split('.')[0] ?? 'rules';
  return `${first.classification.toLowerCase()}-${stem}`;
}

/** The corpus + the bindings → the NAMED battery version. The same corpus
 *  ALWAYS yields the same version; a corpus edit (even one byte) invalidates
 *  the battery (the fingerprint changes). The named shape:
 *  '<project>-<battery-name>-battery-v<N> (fingerprint: <hash12>)' — the
 *  example 'plutus-p6-price-anchor-battery-v1 (fingerprint: 5577e7ba)'. */
export function batteryVersion(profile: ProjectProfile): string {
  const corpusText = profile.rules.corpus
    .map((p) => {
      let text: string;
      try {
        text = fs.readFileSync(p, 'utf8');
      } catch (e: unknown) {
        throw corpusUnreadable(p, String(e));
      }
      return `${p}\n${text}`;
    })
    .join('\n');
  const hash = sha256(`${corpusText}\n${JSON.stringify(profile.rules.bindings)}`);
  return `${projectTokenSlug(profile.project.name)}-${batteryName(profile)}-battery-v1 (fingerprint: ${hash.slice(0, 12)})`;
}

/** The async twin of batteryVersion (★ F-146 FIX (2026-09-24)): the identical version string via non-blocking reads — the async compile paths below must not block the event loop on corpus I/O. The sync export stays for sync callers. */
export async function batteryVersionAsync(profile: ProjectProfile): Promise<string> {
  // ★ F-832 (cont.): ZERO sync I/O on the async path — the corpus texts feed the hash and the
  //   async cards feed the name, overlapped in one Promise.all (one wall-time pass, no event-loop
  //   block). extractRuleCardsAsync shares the cardsFromLines core with the sync twin (K20.3),
  //   so the version string is byte-identical to batteryVersion.
  const [texts, cards] = await Promise.all([
    Promise.all(profile.rules.corpus.map(async (p) => {
      let text: string;
      try {
        text = await readFile(p, 'utf8');
      } catch (e: unknown) {
        throw corpusUnreadable(p, String(e));
      }
      return `${p}\n${text}`;
    })),
    extractRuleCardsAsync(profile.rules.corpus),
  ]);
  const corpusText = texts.join('\n');
  const hash = sha256(`${corpusText}\n${JSON.stringify(profile.rules.bindings)}`);
  return `${projectTokenSlug(profile.project.name)}-${batteryNameFromCards(cards)}-battery-v1 (fingerprint: ${hash.slice(0, 12)})`;
}

// ---------------------------------------------------------------------------
// The template selection (spec §3.9:1228 — the family by the classification)
// ---------------------------------------------------------------------------

/** The classification → template mapping (the deterministic default selection).
 *  The profile's bindings for the selected template fill the parameters. */
export function selectTemplate(card: RuleCard): PredicateTemplate {
  // ★ F-7 FIX (2026-09-24): loud guard on every lookup — a missing library entry throws at the selection site, never an obscure undefined downstream.
  const need = (key: string): PredicateTemplate => {
    const t = TEMPLATE_LIBRARY[key];
    if (!t) throw new LexiconError('TEMPLATE_MISSING', `TEMPLATE_MISSING: no predicate template for key '${key}' (classification=${card.classification})`);
    return t;
  };
  switch (card.classification) {
    case 'ARCH': return need(ARCH_TEMPLATE_KEY);
    case 'LOGIC': return need('provenance.traces-to-source');
    case 'PROCESS': return need('process.gates-measure-outputs-not-logic');
    case 'DOMAIN': return need('domain.numeric-threshold');
    // ★ F-258 FIX (2026-09-24): unknown classifications used to SILENTLY compile against the PROCESS template — a corrupted/new value shipped a wrong-but-valid-looking battery. Fail LOUD with the value named.
    default: throw new LexiconError('CLASSIFICATION_UNKNOWN', `CLASSIFICATION_UNKNOWN: card anchor=${card.anchor} carries classification '${String((card as { classification?: unknown }).classification)}' \u2014 no template binding exists (expected ARCH|LOGIC|PROCESS|DOMAIN)`);
  }
}

// ---------------------------------------------------------------------------
// The pure compile core — the corpus cards + the declared bindings → the battery
// ---------------------------------------------------------------------------

/** The D13 mechanical gate + the card→predicate binding (spec §3.9:1229-1231):
 *  a quote-less card throws D13_VIOLATION (doctrine is QUOTED, never synthesized);
 *  the profile's bindings for the template id + the card's D13 data fill the
 *  template's zod schema (an invalid binding → the loud TEMPLATE_BINDING error). */
function compileCards(cards: RuleCard[], profile: ProjectProfile, version: string): CompiledPredicate[] {
  const battery: CompiledPredicate[] = [];
  for (const card of cards) {
    if (!card.verbatimQuote || card.verbatimQuote.trim() === '') {
      throw new LexiconError(
        'D13_VIOLATION',
        `D13_VIOLATION: card anchor=${card.anchor} — doctrine is QUOTED, never synthesized; the remedy: record the verbatim rule text or curate the PROPOSED card`,
      );
    }
    const template = selectTemplate(card);
    const bindings = {
      ...(profile.rules.bindings[template.id] ?? {}),
      verbatimQuote: card.verbatimQuote,
      anchor: card.anchor,
      severity: card.severity,
    };
    battery.push(compileTemplate(template, bindings, card, version));
  }
  return battery;
}

/** The declared-predicate path (spec §3.9:1233-1235) — the profile's direct
 *  bindings (the P1-P22 class) compile OUTSIDE the corpus extraction. Every
 *  declared predicate carries the D13 quote + the anchor + the severity. */
function compileDeclared(profile: ProjectProfile, version: string): CompiledPredicate[] {
  const declared = profile.rules.bindings['declaredPredicates'];
  if (!declared || typeof declared !== 'object') return [];
  const battery: CompiledPredicate[] = [];
  for (const [ruleId, raw] of Object.entries(declared as Record<string, unknown>)) {
    const binding = (raw ?? {}) as Record<string, unknown>;
    const templateId = String(binding['template'] ?? '');
    const template = TEMPLATE_LIBRARY[templateId];
    if (!template) {
      throw new LexiconError(
        'TEMPLATE_UNKNOWN',
        `TEMPLATE_UNKNOWN: declaredPredicate ${ruleId} names template '${templateId}' which is not in the library`,
      );
    }
    // ★ F-904 FIX (2026-09-24): String() coerced truthy non-strings (42 → '42', true → 'true', {} → '[object Object]') past D13 with no quoted doctrine. Only a real non-blank string satisfies D13; the corpus path is already string-typed by the parser.
    const rawQuote = binding['verbatimQuote'];
    if (typeof rawQuote !== 'string' || rawQuote.trim() === '') {
      throw new LexiconError(
        'D13_VIOLATION',
        `D13_VIOLATION: declaredPredicate ${ruleId} lacks a verbatim quote — doctrine is QUOTED, never synthesized`,
      );
    }
    const verbatimQuote = rawQuote;
    const anchor = String(binding['anchor'] ?? `${ruleId}`);
    const severity = severityFromBinding(binding['severity']);
    battery.push(compileTemplate(template, binding, { verbatimQuote, anchor, severity }, version));
  }
  return battery;
}

// ---------------------------------------------------------------------------
// THE COMPILE API
// ---------------------------------------------------------------------------

/** The primary compile: the corpus + the templates + the bindings → the
 *  compiled battery. DETERMINISTIC (K20.3) — the same corpus always produces
 *  the same ids + the same version; a corpus edit invalidates the battery. */
export async function compile(profile: ProjectProfile): Promise<CompiledPredicate[]> {
  // ★ F-259 FIX (2026-09-24): compile() carried its own copy of the extract\u2192compileCards\u2192compileDeclared pipeline — a fix to one copy silently diverged the other. It delegates to compileBattery()'s uncached path: ONE pipeline, determinism by construction.
  const { battery } = await compileBattery(profile);
  return battery;
}

export interface CompileResult {
  battery: CompiledPredicate[];
  batteryVersion: string;
  fromCache: boolean;
}

/** The cached + persisted compile (spec §3.9:1220-1238): the corpus-hash cache
 *  lookup against W1's compiled_predicates table (the battery_version is the
 *  cache key the schema supports — db.ts:257-268); on a miss the battery is
 *  compiled + persisted (the rule cards under the corpus_hash + the battery rows
 *  INSERT OR REPLACE). A corpus edit changes the hash → a cache miss → re-compile. */
export async function compileBattery(profile: ProjectProfile, db?: DbClient): Promise<CompileResult> {
  const version = await batteryVersionAsync(profile);
  if (db) {
    const row = db.prepare('SELECT COUNT(*) AS c FROM compiled_predicates WHERE battery_version = ?').get(version);
    if (Number(row?.['c'] ?? 0) > 0) {
      return { battery: loadBattery(db, version), batteryVersion: version, fromCache: true };
    }
  }
  // ★ F-704 FIX (2026-09-24): the async extractor — the sync readFileSync path
  // ★ blocked the event loop inside this async compile (the F-146 fix's purpose
  // ★ defeated). batteryName (sync, batteryVersion callers) keeps the sync twin.
  const cards = await extractRuleCardsAsync(profile.rules.corpus);
  const battery = [...compileCards(cards, profile, version), ...compileDeclared(profile, version)];
  if (db) {
    // ★ F-147 FIX (2026-09-24): no half-cache — writeRuleCards and writeBattery each commit internally (no nesting), so a writeBattery failure after writeRuleCards succeeded cleans up the orphaned cards and throws named.
    // ★ F-897 FIX (2026-09-25, run-13 CRITICAL): ONE TRANSACTION over both cache writes. The
    //   two-transaction shape left orphaned rule_cards on a crash BETWEEN them (F-147's
    //   compensation only covered a writeBattery THROW). writeCompiledCache owns the txn; the
    //   per-writer functions remain for their standalone callers.
    writeCompiledCache(db, battery, cards, version);
  }
  return { battery, batteryVersion: version, fromCache: false };
}


/** THE R16 TYPE_CERTAINTY GUARDED READ — the severity binding is narrowed by
 *  the SEVERITIES membership check (the assertion is earned by the validation). */
function severityFromBinding(v: unknown): Severity {
  if (typeof v === 'string' && (SEVERITIES as readonly string[]).includes(v)) {
    return v as Severity;
  }
  return 'HIGH';
}
