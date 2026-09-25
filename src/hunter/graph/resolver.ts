// PORTED FROM fork-v143 live-tree/graph-intelligence/ (extraction chain / query-engine) — verbatim; SEAM: import path rewrites to ported siblings.
import { isNodeType, type NodeType } from '../shared/ontology.ts';

export type ResolutionVerdict = 'same' | 'related' | 'unrelated';

export interface NewEntity {
  id: string;
  label: string;
  kind: string;
  file?: string | null;
  line?: number | null;
}

export interface ExistingCanonical {
  canonical_id: string;
  label: string;
  kind: string;
}

export interface ResolutionDecision {
  alias: string;
  canonicalId: string;
  verdict: ResolutionVerdict;
  reasoning: string;
  destructive: boolean;
  newEntity: NewEntity;
  existingCanonical: ExistingCanonical | null;
}

export interface ResolverDb {
  prepare(sql: string): { run(...params: unknown[]): unknown; get(...params: unknown[]): unknown; all(...params: unknown[]): unknown[] };
  exec(sql: string): void;
}

export interface ResolverHarness {
  decide?(prompt: string): Promise<string>;
  run?(opts: unknown): Promise<{ text: string }>;
}

export class ResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RESOLVER_FAILED';
  }
}

function normalizeLabel(s: string): string { return s.trim().toLowerCase(); }

function tokenize(s: string): string[] {
  return s.split(/[^a-zA-Z0-9]+/).map((t) => t.toLowerCase()).filter((t) => t.length > 0);
}

function shareSignificantToken(a: string, b: string, minLen = 5): boolean {
  const aToks = tokenize(a);
  const bToks = tokenize(b);
  for (const at of aToks) {
    if (at.length < minLen) continue;
    for (const bt of bToks) {
      if (bt.length < minLen) continue;
      if (at === bt) return true;
      if (at.includes(bt) || bt.includes(at)) {
        const shorter = at.length < bt.length ? at : bt;
        if (shorter.length >= minLen) return true;
      }
    }
  }
  const an = normalizeLabel(a);
  const bn = normalizeLabel(b);
  if (an.length >= minLen && bn.length >= minLen) {
    if (an.includes(bn) || bn.includes(an)) return true;
    for (let i = 0; i + minLen <= an.length; i++) {
      const sub = an.slice(i, i + minLen);
      if (bn.includes(sub)) return true;
    }
  }
  return false;
}

function buildPrompt2Batch(newEntities: NewEntity[], existing: ExistingCanonical[]): string {
  const newLines = newEntities.map((e) => `- alias="${e.id}" label="${e.label}" kind=${e.kind} file=${e.file ?? ''}:${e.line ?? ''}`).join('\n');
  const existingLines = existing.length > 0 ? existing.map((c) => `- canonical="${c.canonical_id}" label="${c.label}" kind=${c.kind}`).join('\n') : '- (no existing canonicals — all new)';
  return `# SRO PROMPT 2 — RESOLUTION (B2b, batch, PRE-INSERTION)

You are the SRO resolver. This is a BATCH job over NEW entities BEFORE insertion (MC-B-03 — retrofitting is harder than upfront).
For each new entity, decide against existing canonical candidates:

Verdicts:
- same → one canonical (casing/alias collapse) — e.g. IntentComputeHealth / intentComputeHealth.ts / audit-layer alias → ONE canonical
- related → distinct but linked — e.g. ThresholdHelper:40 vs TVDThresholds:38 → RELATED (not merged)
- unrelated → different entity, no merge — e.g. name collision with different shapes

Output JSON shape: { "decisions": [{ "alias": string, "canonical_id": string, "verdict": "same"|"related"|"unrelated", "reasoning": string, "destructive": boolean }] }
Destructive=true means merging would lose shape distinction and MUST be REFUSED (alias kept as separate canonical).

NEW ENTITIES (to resolve):
${newLines}

EXISTING CANONICALS:
${existingLines}

Rules:
- same requires kind compatibility (same or subtype) and normalized label equality; casing differences are same.
- related requires shared significant token (≥5 chars) but distinct identity.
- unrelated is the default when no significant overlap.
- destructive=true when same normalized label but incompatible kinds (e.g. File vs Class) — the merge is REFUSED.
`;
}

function heuristicDecide(newEntity: NewEntity, existing: ExistingCanonical[]): { canonical: ExistingCanonical | null; verdict: ResolutionVerdict; reasoning: string; destructive: boolean } {
  if (existing.length === 0) {
    return { canonical: null, verdict: 'unrelated', reasoning: `no existing canonicals — "${newEntity.label}" is new`, destructive: false };
  }
  for (const c of existing) {
    if (normalizeLabel(newEntity.label) === normalizeLabel(c.label) && normalizeLabel(newEntity.kind) === normalizeLabel(c.kind)) {
      return { canonical: c, verdict: 'same', reasoning: `casing/alias collapse: "${newEntity.label}" (${newEntity.kind}) lower-equals "${c.label}" (${c.kind})`, destructive: false };
    }
  }
  for (const c of existing) {
    // ★ F-5 FIX (2026-09-24): destructive/unrelated refusal carries canonical null — a non-null canonical with an unrelated verdict misleads consumers.
    if (normalizeLabel(newEntity.label) === normalizeLabel(c.label) && normalizeLabel(newEntity.kind) !== normalizeLabel(c.kind)) {
      return { canonical: null, verdict: 'unrelated', reasoning: `name collision with different shapes: "${newEntity.label}" kind=${newEntity.kind} vs "${c.label}" kind=${c.kind} — destructive merge REFUSED`, destructive: true };
    }
    if (normalizeLabel(newEntity.id) === normalizeLabel(c.canonical_id) && normalizeLabel(newEntity.kind) !== normalizeLabel(c.kind)) {
      return { canonical: null, verdict: 'unrelated', reasoning: `id collision with different shapes: "${newEntity.id}" vs "${c.canonical_id}"`, destructive: true };
    }
  }
  for (const c of existing) {
    if (shareSignificantToken(newEntity.label, c.label) || shareSignificantToken(newEntity.id, c.canonical_id) || shareSignificantToken(newEntity.id, c.label) || shareSignificantToken(newEntity.label, c.canonical_id)) {
      return { canonical: c, verdict: 'related', reasoning: `shared significant token between "${newEntity.label}" and "${c.label}" (kind ${newEntity.kind} vs ${c.kind}) — distinct, linked`, destructive: false };
    }
  }
  for (const c of existing) {
    const nid = normalizeLabel(newEntity.id);
    const cid = normalizeLabel(c.canonical_id);
    if (nid.includes(cid) || cid.includes(nid)) {
      if (nid.length >= 5 && cid.length >= 5) {
        return { canonical: c, verdict: 'related', reasoning: `id fragmentation: "${newEntity.id}" shares fragment with "${c.canonical_id}"`, destructive: false };
      }
    }
  }
  return { canonical: null, verdict: 'unrelated', reasoning: `no significant overlap for "${newEntity.label}" (${newEntity.kind}) against ${existing.length} canonicals`, destructive: false };
}

// ★ F-703 FIX (2026-09-24): the decide path and the run path carried
// ★ NEAR-IDENTICAL parse→match→fallback→merge pipelines — a fix to one silently
// ★ diverged the other (they already had: decide typeof-guarded the alias while
// ★ run String-coerced it, so rec.alias === 0 became the alias '0', and run
// ★ crashed on null array entries where decide skipped them). ONE shared record
// ★ resolver + ONE shared partial-merge; both harness paths call them. The strict
// ★ typeof-guard is the law on both: a non-string alias/canonical/verdict is
// ★ ABSENT, never coerced.
function extractHarnessAlias(rec: Record<string, unknown>): string {
  return typeof rec.alias === 'string' ? rec.alias.trim() : '';
}
function extractHarnessCanonicalId(rec: Record<string, unknown>, alias: string): string {
  const c = rec.canonical_id ?? rec.canonicalId ?? alias;
  return typeof c === 'string' ? c.trim() : alias;
}
function extractHarnessVerdict(rec: Record<string, unknown>): ResolutionVerdict | null {
  const v = typeof rec.verdict === 'string' ? rec.verdict.trim() : '';
  return v === 'same' || v === 'related' || v === 'unrelated' ? v : null;
}
/** Resolve ONE harness record → a decision, or null when the record is skipped
 *  (hallucinated alias, bad verdict). A dangling canonical falls back to the
 *  heuristic for that record (never a trusting accept). */
function resolveHarnessRecord(
  rec: Record<string, unknown>,
  newEntities: NewEntity[],
  existing: ExistingCanonical[],
): ResolutionDecision | null {
  const alias = extractHarnessAlias(rec);
  const verdict = extractHarnessVerdict(rec);
  if (!alias || !verdict) return null;
  // ★ F-253: a harness alias matching NO input entity is a hallucination — skip.
  const newEnt = newEntities.find((n) => n.id === alias || n.label === alias);
  if (!newEnt) return null;
  const canonicalId = extractHarnessCanonicalId(rec, alias) || alias;
  const existCanon = existing.find((c) => c.canonical_id === canonicalId) ?? null;
  // ★ F-254: a dangling canonical falls back to the heuristic for that record.
  if ((verdict === 'same' || verdict === 'related') && !existCanon) {
    const h = heuristicDecide(newEnt, existing);
    return { alias, canonicalId: h.canonical ? h.canonical.canonical_id : newEnt.id, verdict: h.verdict, reasoning: `harness canonical '${canonicalId || alias}' not found — heuristic fallback: ${h.reasoning}`, destructive: h.destructive, newEntity: newEnt, existingCanonical: h.canonical };
  }
  // ★ R15 FIX: an unrelated record with an unknown canonical kept the arbitrary harness
  //   string (canonicalId || alias) with existingCanonical null — the else DB branch then
  //   wrote that dangling id into resolutions. Unrelated canonicalizes to its own alias.
  if (!existCanon && verdict === 'unrelated') {
    const reasoning2 = typeof rec.reasoning === 'string' && rec.reasoning ? rec.reasoning : `harness verdict ${verdict}`;
    return { alias, canonicalId: newEnt.id, verdict, reasoning: reasoning2, destructive: Boolean(rec.destructive), newEntity: newEnt, existingCanonical: null };
  }
  const reasoning = typeof rec.reasoning === 'string' && rec.reasoning ? rec.reasoning : `harness verdict ${verdict}`;
  return { alias, canonicalId: canonicalId || alias, verdict, reasoning, destructive: Boolean(rec.destructive), newEntity: newEnt, existingCanonical: existCanon };
}
/** ★ F-335: the partial-match merge — resolved aliases keep harness verdicts,
 *  the rest get heuristic fallback. The merged set still covers every entity. */
function mergePartialHarness(
  decisions: ResolutionDecision[],
  newEntities: NewEntity[],
  existing: ExistingCanonical[],
): ResolutionDecision[] | null {
  // ★ F-1031 FIX (2026-09-25): the length check re-introduced the F-932 silent drop —
  //   two harness records resolving to the SAME entity satisfy length===N while some
  //   entity has NO decision, and the early return bypassed the per-entity set below.
  //   Dedupe to first-per-entity, then gate on UNIQUE coverage (set size), never length.
  const seenIds = new Set<string>();
  const uniqDecisions: ResolutionDecision[] = [];
  for (const d of decisions) {
    if (seenIds.has(d.newEntity.id)) continue;
    seenIds.add(d.newEntity.id);
    uniqDecisions.push(d);
  }
  // ★ F-1202 FIX (2026-09-25): no in-place mutation of the caller's `decisions` array
  //   (the old `length = 0; push(...)` surprised any shared/reused input). Merge into a
  //   LOCAL array and return it; the input is read-only.
  const merged: ResolutionDecision[] = [...uniqDecisions];
  const resolvedEntityIds = new Set(merged.map((d) => d.newEntity.id));
  if (resolvedEntityIds.size === newEntities.length) return merged;
  if (resolvedEntityIds.size === 0) return null;
  for (const ne of newEntities) {
    if (!resolvedEntityIds.has(ne.id)) {
      const h = heuristicDecide(ne, existing);
      merged.push({ alias: ne.id, canonicalId: h.canonical ? h.canonical.canonical_id : ne.id, verdict: h.verdict, reasoning: `harness partial — heuristic fallback for '${ne.id}': ${h.reasoning}`, destructive: h.destructive, newEntity: ne, existingCanonical: h.canonical });
    }
  }
  return merged;
}

export interface ResolveEntitiesOptions {
  db?: ResolverDb | null;
  runId?: string;
  harness?: ResolverHarness | null;
  strict?: boolean;
}

export async function resolveEntities(
  newEntities: NewEntity[],
  existing: ExistingCanonical[],
  harness: ResolverHarness | null = null,
  opts: ResolveEntitiesOptions = {},
): Promise<ResolutionDecision[]> {
  const effectiveHarness = harness ?? opts.harness ?? null;
  const db = opts.db ?? null;
  const runId = opts.runId ?? `run-${Date.now()}`;
  if (!Array.isArray(newEntities)) throw new ResolverError('RESOLVER_FAILED: newEntities must be an array');
  if (!Array.isArray(existing)) throw new ResolverError('RESOLVER_FAILED: existing must be an array');
  for (const e of newEntities) {
    if (!e || typeof e !== 'object') throw new ResolverError(`RESOLVER_FAILED: newEntity must be object, got ${typeof e}`);
    if (typeof e.id !== 'string' || e.id.trim().length === 0) throw new ResolverError(`RESOLVER_FAILED: newEntity.id must be non-empty string, got ${JSON.stringify(e.id)}`);
    if (typeof e.label !== 'string' || e.label.trim().length === 0) throw new ResolverError(`RESOLVER_FAILED: newEntity.label must be non-empty string, got ${JSON.stringify(e.label)}`);
    if (typeof e.kind !== 'string' || e.kind.trim().length === 0) throw new ResolverError(`RESOLVER_FAILED: newEntity.kind must be non-empty string, got ${JSON.stringify(e.kind)}`);
  }
  for (const c of existing) {
    if (!c || typeof c !== 'object') throw new ResolverError(`RESOLVER_FAILED: existing entry must be object, got ${typeof c}`);
    if (typeof c.canonical_id !== 'string' || c.canonical_id.trim().length === 0) throw new ResolverError(`RESOLVER_FAILED: existing canonical_id must be non-empty`);
    // ★ R15 FIX: heuristicDecide/shareSignificantToken call normalizeLabel(c.label) /
    //   normalizeLabel(c.kind) unconditionally — a missing/non-string label/kind used to
    //   escape validation and die with bare TypeError instead of ResolverError.
    if (typeof c.label !== 'string' || c.label.trim().length === 0) throw new ResolverError(`RESOLVER_FAILED: existing label must be non-empty string, got ${JSON.stringify((c as { label?: unknown }).label)}`);
    if (typeof c.kind !== 'string' || c.kind.trim().length === 0) throw new ResolverError(`RESOLVER_FAILED: existing kind must be non-empty string, got ${JSON.stringify((c as { kind?: unknown }).kind)}`);
  }
  const prompt = buildPrompt2Batch(newEntities, existing);
  let harnessDecisions: ResolutionDecision[] | null = null;
  if (effectiveHarness && typeof effectiveHarness.decide === 'function') {
    try {
      const raw = await effectiveHarness.decide(prompt);
      if (typeof raw === 'string' && raw.trim().length > 0) {
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch (e: unknown) { throw new ResolverError(`RESOLVER_FAILED: harness returned non-JSON — ${e instanceof Error ? e.message : String(e)}`); }
        const obj = parsed as Record<string, unknown>;
        const arr: unknown[] = Array.isArray(obj.decisions) ? obj.decisions as unknown[] : Array.isArray(parsed) ? parsed as unknown[] : [];
        const decisions: ResolutionDecision[] = [];
        // ★ F-703 FIX (2026-09-24): the 20-line inline parse→match→fallback block
        // ★ is GONE — both harness paths resolve records through
        // ★ resolveHarnessRecord (F-253 skip, F-254 fallback inside) and merge
        // ★ through mergePartialHarness (F-335). One pipeline, no divergence.
        for (const d of arr) {
          if (!d || typeof d !== 'object') continue;
          const decided = resolveHarnessRecord(d as Record<string, unknown>, newEntities, existing);
          if (decided) decisions.push(decided);
        }
        const merged = mergePartialHarness(decisions, newEntities, existing);
        if (merged) harnessDecisions = merged;
      }
    } catch (e: unknown) {
      if (e instanceof ResolverError) throw e;
      throw new ResolverError(`RESOLVER_FAILED: harness decide threw — ${e instanceof Error ? e.message : String(e)}`);
    }
  } else if (effectiveHarness && typeof effectiveHarness.run === 'function') {
    try {
      const res = await effectiveHarness.run({ prompt, newEntities, existing }) as { text?: string };
      if (res && typeof res.text === 'string' && res.text.trim().length > 0) {
        try {
          const parsed = JSON.parse(res.text);
          const obj = parsed as Record<string, unknown>;
          if (Array.isArray(obj.decisions)) {
            const decisions: ResolutionDecision[] = [];
            // ★ F-703 FIX (2026-09-24): same shared pipeline as the decide path —
            // ★ the String() coercions are GONE (a non-string alias is absent,
            // ★ never '0'/'true'), null array entries are SKIPPED (the old cast
            // ★ crashed them into a whole-path RESOLVER_FAILED), and the F-336
            // ★ id-OR-label predicate lives in ONE place.
            for (const d of obj.decisions as unknown[]) {
              if (!d || typeof d !== 'object') continue;
              const decided = resolveHarnessRecord(d as Record<string, unknown>, newEntities, existing);
              if (decided) decisions.push(decided);
            }
            const merged = mergePartialHarness(decisions, newEntities, existing);
            if (merged) harnessDecisions = merged;
          }
        } catch (parseErr: unknown) {
          throw new ResolverError(`RESOLVER_FAILED: harness run returned non-JSON — ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
        }
      }
    } catch (e: unknown) {
      if (e instanceof ResolverError) throw e;
      throw new ResolverError(`RESOLVER_FAILED: harness run threw — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const decisions: ResolutionDecision[] = harnessDecisions ?? newEntities.map((ne) => {
    const h = heuristicDecide(ne, existing);
    const canonicalId = h.canonical ? h.canonical.canonical_id : ne.id;
    const verdict: ResolutionVerdict = h.verdict;
    return {
      alias: ne.id,
      canonicalId,
      verdict,
      reasoning: h.reasoning,
      destructive: h.destructive,
      newEntity: ne,
      existingCanonical: h.canonical,
    };
  });
  if (db) {
    // ★ F-4 FIX (2026-09-24): atomic resolutions commit — one BEGIN/COMMIT
    // around the loop; a mid-loop failure rolls back instead of half-writing.
    // ★ R15 FIX: BEGIN used to sit OUTSIDE the try — a BEGIN failure (locked DB,
    //   nested transaction, I/O error) escaped as a raw driver error instead of
    //   a named failure sharing the rollback/error contract. BEGIN rides inside now.
    try {
      db.exec('BEGIN');
      for (const d of decisions) {
        if (d.verdict === 'unrelated' && d.destructive) {
          try {
            db.prepare('INSERT OR REPLACE INTO resolutions (alias, canonical_id, verdict, reasoning, created_run) VALUES (?,?,?,?,?)').run(d.alias, d.alias, d.verdict, d.reasoning, runId);
          } catch (e: unknown) {
            throw new ResolverError(`RESOLVER_FAILED: resolutions write failed for alias=${d.alias} — ${e instanceof Error ? e.message : String(e)}`);
          }
          continue;
        }
        if (d.verdict === 'same') {
          const target = d.existingCanonical ? d.existingCanonical.canonical_id : d.canonicalId;
          try {
            db.prepare('INSERT OR REPLACE INTO resolutions (alias, canonical_id, verdict, reasoning, created_run) VALUES (?,?,?,?,?)').run(d.alias, target, d.verdict, d.reasoning, runId);
          } catch (e: unknown) {
            throw new ResolverError(`RESOLVER_FAILED: resolutions write failed for alias=${d.alias} → ${target} — ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          try {
            db.prepare('INSERT OR REPLACE INTO resolutions (alias, canonical_id, verdict, reasoning, created_run) VALUES (?,?,?,?,?)').run(d.alias, d.canonicalId, d.verdict, d.reasoning, runId);
          } catch (e: unknown) {
            throw new ResolverError(`RESOLVER_FAILED: resolutions write failed for alias=${d.alias} — ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
      db.exec('COMMIT');
    } catch (e: unknown) {
      // ★ F-255 FIX (2026-09-24): a failed ROLLBACK leaves the DB partially committed — the old warn-only rethrew just the write error, hiding the suspect store. The rollback failure is folded into the thrown error (warn kept for the log trail).
      try { db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        const rbMsg = rbErr instanceof Error ? rbErr.message : String(rbErr);
        const origMsg = e instanceof Error ? e.message : String(e);
        console.warn(`[resolver] ROLLBACK failed after resolutions write error: ${rbMsg} (original: ${origMsg})`);
        throw new ResolverError(`RESOLVER_FAILED: resolutions write failed AND ROLLBACK failed (DB state suspect \u2014 verify store before reuse) \u2014 rollback: ${rbMsg}; original: ${origMsg}`);
      }
      // ★ W3-R17 FIX (2026-09-25, run-17 HIGH): BEGIN (:340) and COMMIT (:365) ride inside
      //   this try but outside the per-row ResolverError wrappers — a raw driver throw from
      //   either (lock contention, I/O failure, disk full) used to escape via `throw e` as an
      //   unnamed error, breaking the ResolverError contract every other path honors. Extend
      //   the SAME contract (the R15 BEGIN-inside-try shape above — no second pattern): a
      //   ResolverError rethrows untouched, anything else is wrapped loud. F-255 still owns
      //   the ROLLBACK-failure fold; this owns the BEGIN/COMMIT wrap.
      if (e instanceof ResolverError) throw e;
      throw new ResolverError(`RESOLVER_FAILED: resolutions transaction failed — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return decisions;
}

export function buildPrompt2Demand(newEntities: NewEntity[], existing: ExistingCanonical[]): string {
  if (!Array.isArray(newEntities) || newEntities.length === 0) throw new ResolverError('RESOLVER_FAILED: newEntities must be non-empty array for Prompt 2 demand');
  return buildPrompt2Batch(newEntities, existing);
}

export { shareSignificantToken };
