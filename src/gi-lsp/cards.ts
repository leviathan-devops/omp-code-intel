// GI KERNEL V2.3 — FR-3 · THE CARD RENDERER (the fact cards the LSP + the HUD share).
//
// ★ ONE SERVER, TWO CONSUMERS: the LSP emits these as Diagnostics; the Card-HUD (W5)
//   emits the SAME cards on tool_call. A card is built from a MEASURED store row — never
//   a guess. A card that asserts a count it did not measure is the FABRICATION anti-pattern.
//
// THE 5 SHAPES: CALLERS · UNWIRED · CONFLICT · MEANING · SCOPE.
import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import { whoCallsInDb, type WhoCallsRow } from "../omp/typed-write.ts";
import type { LayerFact } from "../omp/layer-registry.ts";

// ★ WHY A `Database`, NOT A PATH: the project-scope stores (the *-checkout/) do NOT satisfy
//   openTypedStore's session-store path contract (assertSessionStorePath), so the path-based
//   whoCalls would refuse them. The `*InDb` core takes an already-opened Database — the LSP
//   opens the PROJECT store directly and calls it.
function meta(db: Database, key: string): string | null {
  try {
    const row = db.query("SELECT value FROM gi_meta WHERE key = ?").get(key) as { value: string } | null;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** The diagnostic sources — an LSP consumer filters by these. A card's `source` ∈ this set. */
export const GI_LSP_TOKENS = [
  "gi-lsp/callers",
  "gi-lsp/unwired",
  "gi-lsp/conflict",
  "gi-lsp/meaning",
  "gi-lsp/scope",
] as const;
export type GiLspToken = (typeof GI_LSP_TOKENS)[number];

export type CardShape = "CALLERS" | "UNWIRED" | "CONFLICT" | "MEANING" | "SCOPE";

export interface FactCard {
  shape: CardShape;
  title: string;
  /** the evidence rows — each a real `file:line` or a measured value. NEVER empty. */
  rows: string[];
  /** LSP severity: 1 Error · 2 Warning · 3 Information · 4 Hint. Cards are INFORMATIONAL. */
  severity: 1 | 2 | 3 | 4;
  source: GiLspToken;
  /** the count this card measured (for `shown=N total=M`); -1 when not a counted shape. */
  total: number;
}

/** A symbol declared in a file (the card subject). */
interface Decl {
  name: string;
  line: number;
}

/** The declarations in a source file (a light TS scan — exported + top-level names). */
export function declarationsIn(src: string): Decl[] {
  const out: Decl[] = [];
  const seen = new Set<string>();
  // ★ W9-AUDIT FIX (2026-09-28): the scan covered only the plain forms — `export default`,
  //   `abstract`, and generator (`function*`) declarations were MISSED (the audit's HIGH).
  const rx = /^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(?:function\s*\*?|const|let|var|class|interface|type|enum)[ \t]+([A-Za-z_$][\w$]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(src)) !== null) {
    const name = m[1]!;
    if (seen.has(name)) continue;
    seen.add(name);
    const line = src.slice(0, m.index).split("\n").length;
    out.push({ name, line });
  }
  return out;
}

/** Is this file a CODE file (the HUD/LSP only card code, never docs)? */
export function isCodeFile(relFile: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs|py)$/.test(relFile);
}

/**
 * CALLERS — a symbol's inbound edges (who-calls). Every row is a real caller file:line.
 * Returns null when the symbol has 0 callers (that is UNWIRED's job).
 */
export function callersCard(db: Database, symbol: string): FactCard | null {
  let q: { rows: number; callers: WhoCallsRow[] };
  try {
    q = whoCallsInDb(db, symbol);
  } catch {
    return null;
  }
  if (q.callers.length === 0) return null;
  const shown = q.callers.slice(0, 12);
  const rows = shown.map((c) => `${c.caller} (${c.file || "?"}:${c.line})`);
  return {
    shape: "CALLERS",
    title: `${symbol} — ${q.callers.length} caller${q.callers.length === 1 ? "" : "s"}`,
    rows,
    severity: 3,
    source: "gi-lsp/callers",
    total: q.callers.length,
  };
}

/**
 * UNWIRED — a symbol with ZERO inbound callers (the F-95 dead-machinery class). Fires ONLY
 * on an explicit 0-caller reading, never on a store error (that would be a false positive).
 */
export function unwiredCard(db: Database, symbol: string): FactCard | null {
  let q: { rows: number; callers: WhoCallsRow[] };
  try {
    q = whoCallsInDb(db, symbol);
  } catch {
    return null; // a store error is NOT evidence of unwiring — silence, never a false positive
  }
  if (q.callers.length !== 0) return null;
  return {
    shape: "UNWIRED",
    title: `${symbol} — 0 callers`,
    rows: [`no inbound edges in the graph store`],
    severity: 2,
    source: "gi-lsp/unwired",
    total: 0,
  };
}

/**
 * SCOPE — the store was built for a DIFFERENT root than the file's project. An answer from
 * a foreign store is the most dangerous kind (confidently about another tree) → loud.
 */
export function scopeCard(db: Database, projectRoot: string): FactCard | null {
  const stored = meta(db, "build_root");
  if (!stored) return null;
  // ★ W9-AUDIT FIX (2026-09-28): realpathSync is GUARDED — a missing/deleted/no-permission
  //   root threw and broke the LSP (the audit's HIGH; the LSP must fail-OPEN).
  let a: string;
  try { a = fs.realpathSync(projectRoot); } catch { a = path.resolve(projectRoot); }
  let b: string;
  try { b = fs.existsSync(stored) ? fs.realpathSync(stored) : stored; } catch { b = stored; }
  if (a === b) return null;
  return {
    shape: "SCOPE",
    title: "GI store scope mismatch",
    rows: [`store build_root: ${b}`, `this file's root: ${a}`],
    severity: 1,
    source: "gi-lsp/scope",
    total: -1,
  };
}

/**
 * CONFLICT — two substrates (L5 corbell vs L6 graphify) DISAGREE on a symbol's caller set.
 * A conflict is a real finding (the twin stores drifted); its absence is SILENCE, not OK.
 */
export function conflictCard(
  corbellDb: Database,
  graphifyDb: Database,
  symbol: string,
): FactCard | null {
  const read = (db: Database): WhoCallsRow[] | null => {
    try {
      return whoCallsInDb(db, symbol).callers;
    } catch {
      return null;
    }
  };
  const a = read(corbellDb);
  const b = read(graphifyDb);
  if (a === null || b === null) return null; // one substrate absent → no basis to conflict
  const key = (c: WhoCallsRow): string => `${c.file}:${c.line}`;
  const sa = new Set(a.map(key));
  const sb = new Set(b.map(key));
  const onlyA = [...sa].filter((k) => !sb.has(k));
  const onlyB = [...sb].filter((k) => !sa.has(k));
  if (onlyA.length === 0 && onlyB.length === 0) return null;
  return {
    shape: "CONFLICT",
    title: `${symbol} — L5/L6 disagree`,
    rows: [
      `corbell-only: ${onlyA.length}`,
      `graphify-only: ${onlyB.length}`,
      ...onlyA.slice(0, 3).map((k) => `L5: ${k}`),
      ...onlyB.slice(0, 3).map((k) => `L6: ${k}`),
    ],
    severity: 2,
    source: "gi-lsp/conflict",
    total: onlyA.length + onlyB.length,
  };
}

/**
 * ★ THE MEANING JUDGE — the exact shape the LIVE JevK5 adapter already has:
 * `jevk5Probe(root).facts` (ConsumerProbe.facts, src/omp/adapters/jevk5.ts). It THROWS
 * (`GI_JEVK5_DOWN: …`) when the GPU judge is down — that throw is a MISSING-JUDGE state,
 * never "no meaning". `meaningCard` swallows it and returns null (FR-5 fail-OPEN, C7).
 */
export type MeaningJudge = (symbol: string) => LayerFact[];

/** The meaning value the TSG rung carries (mirrors jevk5.ts's fact `value`). Narrowed by
 *  inspection — never asserted from an unchecked shape. */
interface MeaningValue {
  meaning: string;
  confidence: number;
  noul: number;
  model: string;
}

/** Narrow a `LayerFact.value` to a MeaningValue, or null when it carries no FINITE
 *  confidence. A fact without a measured number yields NO card — never a fabricated one
 *  (the FABRICATION anti-pattern: a card asserting what it did not measure). */
function meaningValue(v: unknown): MeaningValue | null {
  if (typeof v !== "object" || v === null) return null;
  const rec = v as Record<string, unknown>;
  const confidence = typeof rec["confidence"] === "number" ? rec["confidence"] : NaN;
  const noul = typeof rec["noul"] === "number" ? rec["noul"] : confidence;
  if (!Number.isFinite(confidence) || !Number.isFinite(noul)) return null;
  const meaning =
    typeof rec["meaning"] === "string" ? rec["meaning"] : noul >= 0.5 ? "match" : "drift";
  const model = typeof rec["model"] === "string" ? rec["model"] : "unreported-model";
  return { meaning, confidence, noul, model };
}

/**
 * MEANING — the JevK5 (TSG rung) reading of a symbol, routed into the LSP as a card.
 * The `rows` carry the MEASURED confidence (never a guess) + the judge's own evidence
 * string, so the number is traceable to the model that produced it.
 *
 * ★ FAIL-OPEN (FR-5 / C7): a DOWN judge (a throw from `facts()`) is SILENCE — null, never
 *   a throw, never a 0.0 confidence. The LSP must degrade, never break the editor.
 *   `total: -1` — MEANING is not a counted shape; it fabricates no count.
 */
export function meaningCard(db: Database, symbol: string, judge: MeaningJudge): FactCard | null {
  let facts: LayerFact[];
  try {
    facts = judge(symbol);
  } catch {
    return null; // ★ the judge is DOWN (GI_JEVK5_DOWN) → silence, never a throw
  }
  if (!Array.isArray(facts) || facts.length === 0) return null; // WIRED-BUT-SILENT ≠ a verdict
  const fact = facts[0]!;
  const v = meaningValue(fact.value);
  if (v === null) return null; // no measured confidence → no card
  const storeRoot = meta(db, "build_root");
  const conf = v.confidence.toFixed(3);
  return {
    shape: "MEANING",
    title: `${symbol} — meaning ${v.meaning} (confidence ${conf})`,
    rows: [
      `confidence ${conf} · noul ${v.noul.toFixed(3)} · ${v.meaning}`,
      `judge ${v.model}`,
      `store ${storeRoot ?? "(unprovenanced)"}`,
      `evidence ${fact.source}`,
    ],
    severity: 3,
    source: "gi-lsp/meaning",
    total: -1,
  };
}

/** The cards for one file: SCOPE (file-level) + CALLERS/UNWIRED (per declaration). */
export function fileCards(opts: {
  db: Database;
  projectRoot: string;
  relFile: string;
  src: string;
  maxCards?: number;
  /** ★ FR-5 (W4): the JevK5 judge. When present, the file's primary symbol yields a MEANING
   *  card (the TSG rung routed through the LSP/HUD). ABSENT → no meaning call (fail-open). */
  judge?: MeaningJudge;
  /** ★ F2 FIX (2026-10-07, the red-team audit): the SECOND substrate store (corbell vs
   *  graphify). When provided, the file's primary symbol yields a CONFLICT card if the two
   *  substrates DISAGREE — the 5th shape was previously DEAD CODE (never wired). ABSENT →
   *  no conflict call (a single-store caller cannot diff). */
  altDb?: Database;
}): FactCard[] {
  const { db, projectRoot, relFile, src, judge, altDb } = opts;
  const maxCards = opts.maxCards ?? 20;
  if (!isCodeFile(relFile)) return []; // a doc edit is SILENT (the C5 negative)
  const cards: FactCard[] = [];
  const scope = scopeCard(db, projectRoot);
  if (scope) cards.push(scope);
  const decls = declarationsIn(src);
  // ★ W4 THE JEV ROUTE — a MEANING card for the file's PRIMARY symbol (the judge is the LIVE
  //   jevk5Probe; a DOWN judge → meaningCard returns null, fail-open — never a throw).
  if (judge !== undefined) {
    for (const d of decls.slice(0, 1)) {
      const m = meaningCard(db, d.name, judge);
      if (m) { cards.push(m); break; }
    }
  }
  // ★ F2 FIX: the CONFLICT card (L5 corbell vs L6 graphify disagree on a symbol's callers) is
  //   emitted ONLY when the caller supplies BOTH substrate stores — the reachability the
  //   earlier code lacked (it was defined and never called).
  if (altDb !== undefined) {
    for (const d of decls.slice(0, 1)) {
      const cf = conflictCard(db, altDb, d.name);
      if (cf) { cards.push(cf); break; }
    }
  }
  for (const d of decls) {
    const c = callersCard(db, d.name);
    if (c) cards.push(c);
    else {
      // ★ W9-AUDIT FIX (2026-09-28): the UNWIRED shape was NEVER emitted by fileCards — a
      //   0-caller symbol went silent (the audit's HIGH; FR-3's 5 shapes include UNWIRED).
      const u = unwiredCard(db, d.name);
      if (u) cards.push(u);
    }
    if (cards.length >= maxCards) break;
  }
  return cards;
}

/** The `shown=N total=M` suffix the HUD/CLI prints (an honest truncation marker). */
export function shownTotal(cards: FactCard[]): string {
  const total = cards.reduce((s, c) => s + (c.total > 0 ? c.total : 0), 0);
  const shown = cards.reduce((s, c) => s + (c.total > 0 ? Math.min(c.rows.length, c.total) : 0), 0);
  return `shown=${shown} total=${total}`;
}

/** The relative path of an absolute file under a root, or the basename when outside it. */
export function relTo(root: string, abs: string): string {
  const r = root.endsWith(path.sep) ? root : root + path.sep;
  return abs.startsWith(r) ? abs.slice(r.length) : path.basename(abs);
}
