// PORTED FROM fork-v143 live-tree/graph-intelligence/ (extraction chain / query-engine) — verbatim; SEAM: import path rewrites to ported siblings.
import type { TypedTriple } from './mechanical.ts';
import { PREDICATE_SET, type Predicate } from '../shared/ontology.ts';

export interface MergedTriple extends TypedTriple {
  source: 'mechanical' | 'semantic' | 'both';
  conflict: boolean;
  conflictReason: string | null;
  anchorFile: string | null;
  anchorLine: number | null;
  /** ★ F-822b FIX (2026-09-24): the dedup Set the F-822 fix introduced was read off the type
   *  before it was DECLARED — TS2339 at every site. It is part of the row's conflict
   *  bookkeeping, so it belongs on the interface. */
  seenContradictions?: Set<string>;
}

export class MergeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MERGE_FAILED';
  }
}

function normalizeCanonical(id: string): string {
  return id.trim().toLowerCase();
}

function tripleKey(triple: TypedTriple): string {
  return `${normalizeCanonical(triple.subject)}|${triple.predicate}|${normalizeCanonical(triple.object)}`;
}

function subjectObjectKey(triple: TypedTriple): string {
  return `${normalizeCanonical(triple.subject)}|${normalizeCanonical(triple.object)}`;
}

function buildMechanicalIndex(mechanical: TypedTriple[]): {
  byKey: Map<string, TypedTriple>;
  byPair: Map<string, TypedTriple[]>;
  bySubject: Map<string, TypedTriple[]>;
  byObject: Map<string, TypedTriple[]>;
  subjects: Set<string>;
  objects: Set<string>;
} {
  const byKey = new Map<string, TypedTriple[]>();
  const byPair = new Map<string, TypedTriple[]>();
  const bySubject = new Map<string, TypedTriple[]>();
  const byObject = new Map<string, TypedTriple[]>();
  const subjects = new Set<string>();
  const objects = new Set<string>();
  for (const t of mechanical) {
    const k = tripleKey(t);
    const p = subjectObjectKey(t);
    const sn = normalizeCanonical(t.subject);
    const on = normalizeCanonical(t.object);
    subjects.add(sn);
    objects.add(on);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(t);
    if (!byPair.has(p)) byPair.set(p, []);
    byPair.get(p)!.push(t);
    if (!bySubject.has(sn)) bySubject.set(sn, []);
    bySubject.get(sn)!.push(t);
    if (!byObject.has(on)) byObject.set(on, []);
    byObject.get(on)!.push(t);
  }
  // Collapse to single representative per key (take first — mechanical triples with same key are deduped by file:line)
  const singleByKey = new Map<string, TypedTriple>();
  for (const [k, arr] of byKey.entries()) singleByKey.set(k, arr[0]);
  return { byKey: singleByKey, byPair, bySubject, byObject, subjects, objects };
}

export interface MergeOptions {
  flagContradictions?: boolean;
}

export function mergePasses(mechanical: TypedTriple[], semantic: TypedTriple[], opts: MergeOptions = {}): MergedTriple[] {
  if (!Array.isArray(mechanical)) throw new MergeError('MERGE_FAILED: mechanical must be an array');
  if (!Array.isArray(semantic)) throw new MergeError('MERGE_FAILED: semantic must be an array');
  const flagContradictions = opts.flagContradictions !== false;

  for (const t of [...mechanical, ...semantic]) {
    if (!t || typeof t !== 'object') throw new MergeError(`MERGE_FAILED: triple must be object, got ${typeof t}`);
    if (typeof t.subject !== 'string' || t.subject.trim().length === 0) throw new MergeError(`MERGE_FAILED: triple missing subject: ${JSON.stringify(t).slice(0, 200)}`);
    if (typeof t.object !== 'string' || t.object.trim().length === 0) throw new MergeError(`MERGE_FAILED: triple missing object: ${JSON.stringify(t).slice(0, 200)}`);
    if (typeof t.predicate !== 'string' || t.predicate.trim().length === 0) throw new MergeError(`MERGE_FAILED: triple missing predicate: ${JSON.stringify(t).slice(0, 200)}`);
    // ★ F-28 FIX (2026-09-24): validate the predicate against the PREDICATE_SET canon — the
    //   old string check let an ARBITRARY predicate through to the typed store.
    if (!PREDICATE_SET.has(t.predicate)) throw new MergeError(`MERGE_FAILED: unknown predicate '${t.predicate}' (the canon: ${[...PREDICATE_SET].join('|')})`);
    if (typeof t.evidence !== 'string' || t.evidence.trim().length === 0) throw new MergeError(`MERGE_FAILED: triple missing evidence (MC-B-02): ${JSON.stringify(t).slice(0, 200)}`);
  }

  const index = buildMechanicalIndex(mechanical);
  const merged: MergedTriple[] = [];
  const seenMechanicalKeys = new Set<string>();
  // ★ F-3 FIX (2026-09-24): index the emitted rows by key — the retro-flag
  // below was a linear merged.find per semantic triple (O(n*m)).
  const mergedByKey = new Map<string, MergedTriple>();

  for (const m of mechanical) {
    const k = tripleKey(m);
    if (seenMechanicalKeys.has(k)) continue;
    seenMechanicalKeys.add(k);
    const row: MergedTriple = {
      ...m,
      evidence: m.evidence.trim().slice(0, 500),
      confidence: 1.0,
      source: 'mechanical',
      conflict: false,
      conflictReason: null,
      anchorFile: m.file ?? null,
      anchorLine: m.line ?? null,
    };
    merged.push(row);
    mergedByKey.set(k, row);
  }

  // ★ F-400 FIX (2026-09-24): semantic dedup by key — the mechanical loop above
  //   skips repeats via seenMechanicalKeys, but this loop pushed every semantic
  //   triple, so two sources extracting the same subject|predicate|object emitted
  //   duplicate output rows (and double retro-flags). First wins, like mechanical.
  const seenSemanticKeys = new Set<string>();
  for (const s of semantic) {
    const k = tripleKey(s);
    if (seenSemanticKeys.has(k)) continue;
    seenSemanticKeys.add(k);
    const pair = subjectObjectKey(s);
    const mechExact = index.byKey.get(k);
    const mechPairGroup = index.byPair.get(pair) ?? [];

    if (mechExact) {
      const anchor = mechExact;
      // ★ R15H5 FIX (2026-09-25): the old form pushed a SECOND row with the same
      //   tripleKey as the mechanical row already emitted (and indexed in
      //   mergedByKey) — identical triples were doubled and counts skewed
      //   downstream. Upgrade the emitted row in place: source='both', the
      //   semantic evidence/confidence, the mechanical file:line anchor.
      const existing = mergedByKey.get(k);
      if (existing) {
        existing.source = 'both';
        existing.evidence = s.evidence.trim().slice(0, 500);
        existing.confidence = s.confidence;
        existing.file = anchor.file || s.file;
        existing.line = anchor.line || s.line;
        existing.subjectKind = s.subjectKind ?? anchor.subjectKind;
        existing.objectKind = s.objectKind ?? anchor.objectKind;
        existing.anchorFile = anchor.file ?? null;
        existing.anchorLine = anchor.line ?? null;
        continue;
      }
      merged.push({
        subject: s.subject.trim(),
        predicate: s.predicate as Predicate,
        object: s.object.trim(),
        evidence: s.evidence.trim().slice(0, 500),
        confidence: s.confidence,
        file: anchor.file || s.file,
        line: anchor.line || s.line,
        subjectKind: s.subjectKind ?? anchor.subjectKind,
        objectKind: s.objectKind ?? anchor.objectKind,
        source: 'both',
        conflict: false,
        conflictReason: null,
        anchorFile: anchor.file ?? null,
        anchorLine: anchor.line ?? null,
      });
      continue;
    }

    if (flagContradictions && mechPairGroup.length > 0) {
      const mechPredicates = mechPairGroup.map((x) => x.predicate).join(',');
      const anchor = mechPairGroup[0];
      const inheritedFile = anchor.file;
      const inheritedLine = anchor.line;
      // CONFLICT: same subject/object pair but different predicate — both kept + flagged (L8 contradiction class, never silently resolved)
      for (const mech of mechPairGroup) {
        // ★ F-3 FIX (2026-09-24): O(1) retro-flag via the emitted-row index.
        // ★ F-345 FIX (2026-09-24): conflictReason ACCUMULATES — S2's iteration used to
        //   overwrite S1's reason on the same mechanical row (only the last semantic
        //   predicate survived). First contradiction sets the base; later ones append,
        //   deduped so re-scans never grow the string.
        const existing = mergedByKey.get(tripleKey(mech));
        if (existing && !existing.conflict) {
          existing.conflict = true;
          existing.conflictReason = `CONTRADICTION: mechanical predicate=${mech.predicate} vs semantic predicate=${s.predicate} for ${s.subject}->${s.object} (both preserved, flagged as L8 contradiction)`;
        } else if (existing?.conflict) {
          // ★ F-822 FIX (2026-09-24): string.includes() for dedup is fragile — an object name
          //   that is a prefix of another produces a false-positive match (e.g. 'contain' is a
          //   prefix-substring of 'container', so 'container->x' is contained inside
          //   'contain->x'). Use a Set keyed by the exact composite instead.
          const dedupKey = `${s.predicate}|${s.subject}|${s.object}`;
          if (!existing.seenContradictions) existing.seenContradictions = new Set<string>();
          if (!existing.seenContradictions.has(dedupKey)) {
            existing.seenContradictions.add(dedupKey);
            const add = `; ALSO vs semantic predicate=${s.predicate} for ${s.subject}->${s.object}`;
            existing.conflictReason = `${existing.conflictReason}${add}`;
          }
        }
      }
      // ★ F-1240 FIX (2026-09-25): inherit subjectKind/objectKind from anchor like the exact-match path — semantic rows lacking kinds no longer emit undefined where mechExact would inherit.
      merged.push({
        subject: s.subject.trim(),
        predicate: s.predicate as Predicate,
        object: s.object.trim(),
        evidence: s.evidence.trim().slice(0, 500),
        confidence: s.confidence,
        file: inheritedFile || s.file,
        line: inheritedLine || s.line,
        subjectKind: s.subjectKind ?? anchor.subjectKind,
        objectKind: s.objectKind ?? anchor.objectKind,
        source: 'semantic',
        conflict: true,
        conflictReason: `CONTRADICTION: mechanical predicate(s)=[${mechPredicates}] vs semantic predicate=${s.predicate} for ${s.subject}->${s.object} — Pass A exactness anchors, Pass B semantics kept, flagged never silently resolved`,
        anchorFile: anchor.file ?? null,
        anchorLine: anchor.line ?? null,
      });
      continue;
    }

    // Check subject or object resolves to A node → inherit file:line anchor
    const subjNorm = normalizeCanonical(s.subject);
    const objNorm = normalizeCanonical(s.object);
    const subjectResolves = index.subjects.has(subjNorm) || index.objects.has(subjNorm);
    const objectResolves = index.subjects.has(objNorm) || index.objects.has(objNorm);
    let anchorFile: string | null = null;
    let anchorLine: number | null = null;
    if (subjectResolves || objectResolves) {
      // ★ F-3 FIX (2026-09-24): anchor lookup rides the indices — the old loop
      // scanned every mechanical triple per semantic triple (O(n*m)).
      const candidates: TypedTriple[] = [];
      for (const hit of index.bySubject.get(subjNorm) ?? []) candidates.push(hit);
      for (const hit of index.byObject.get(subjNorm) ?? []) if (!candidates.includes(hit)) candidates.push(hit);
      for (const hit of index.bySubject.get(objNorm) ?? []) if (!candidates.includes(hit)) candidates.push(hit);
      for (const hit of index.byObject.get(objNorm) ?? []) if (!candidates.includes(hit)) candidates.push(hit);
      if (candidates.length > 0) {
        anchorFile = candidates[0].file ?? null;
        anchorLine = candidates[0].line ?? null;
      }
    }

    const resolvedFile = (subjectResolves || objectResolves) && anchorFile ? anchorFile : s.file;
    const resolvedLine = (subjectResolves || objectResolves) && anchorLine ? anchorLine : s.line;

    merged.push({
      subject: s.subject.trim(),
      predicate: s.predicate as Predicate,
      object: s.object.trim(),
      evidence: s.evidence.trim().slice(0, 500),
      confidence: s.confidence,
      file: resolvedFile,
      line: resolvedLine,
      subjectKind: s.subjectKind,
      objectKind: s.objectKind,
      source: 'semantic',
      conflict: false,
      conflictReason: null,
      anchorFile: anchorFile,
      anchorLine: anchorLine,
    });
  }

  return merged;
}

export function flagContradictions(triples: MergedTriple[]): MergedTriple[] {
  return triples.filter((t) => t.conflict);
}
