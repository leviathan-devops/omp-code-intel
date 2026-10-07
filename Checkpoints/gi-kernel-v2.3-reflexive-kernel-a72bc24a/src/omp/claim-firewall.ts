// src/omp/claim-firewall.ts — ★ L2 THE CLAIM FIREWALL (GI-Kernel-V2.2 W5c).
//
// THE MISSING BLOCKING HALF (spec §1 E5): `grep -rln "claim.firewall|ClaimFirewall" src/`
// was EMPTY — the 4-layer stack (L0 TTSR · L1 ABIDE · L2 CLAIM FW · L3 PROMPT) was built
// as 2 layers, so the model could declare its own turn closed.
//
// THE ONE LAW: "THE RUNTIME HOLDS THE GATE; THE MODEL CANNOT CLOSE ITS OWN TURN."
// THE POLARITY LAW (binding, spec §9.4): ABIDE fail-OPEN · CLAIM FIREWALL fail-CLOSED.
// "Do not unify those polarities."
//
// THE PIPELINE (pure, synchronous, no I/O — every stage unit-testable):
//   DETECT  detectClaimAtoms(text): done-shaped assertions ("tests pass", "N/N green",
//           "verified", "done", "shipped", a count) → the claim ATOMS.
//   BIND    bindClaimAtoms(atoms, turnToolResults): every atom → a THIS-TURN tool-result
//           span. NO span → FABRICATED by code alone (no Jev needed — the span IS the
//           proof). Span present → SUPPORTED; an optional Jev Choice (opts.judge, wired
//           to jevk5 in production) may refine supports|contradicts.
//   DECIDE  adjudicateClaim(...): FAIL-CLOSED — a claim atom with NO bound span → REJECTED
//           ({ verdict: "FABRICATED", action: "REJECT" }).
//
// THE SURFACE: attachClaimFirewall(pi) rides the OMP tool-result wire (collecting THIS-TURN
// spans, never blocking) + the stop/turn-end surface (the same pi.on throw-to-cancel surface
// the graph gate uses). On FABRICATED it throws GI_FABRICATED_CLAIM with the remedy — the
// turn cannot close. ABIDE's fail-open repair path is never touched here.

/** A claim atom — one done-shaped assertion extracted from the model's message. */
export interface ClaimAtom {
  text: string; // e.g. "523 tests pass"
  kind: "count" | "state" | "completion" | "path";
  charRange: [number, number];
}

/** The binding — the atom's evidence, or its absence. */
export interface ClaimBinding {
  atom: ClaimAtom;
  /** The THIS-TURN tool-result span that backs the atom; null ⇒ FABRICATED. */
  span: string | null;
  verdict: "SUPPORTED" | "CONTRADICTED" | "FABRICATED" | "UNCERTIFIABLE";
  /** The tool-result excerpt, or the reason for FABRICATED. */
  evidence: string;
}

export type ClaimVerdict = "FABRICATED" | "SUPPORTED";

export interface AdjudicateResult {
  verdict: ClaimVerdict;
  /** REJECT ↔ FABRICATED · PASS ↔ SUPPORTED — the turn disposition for the stop-hook surface. */
  action: "REJECT" | "PASS";
  reasons: string[];
  bindings: ClaimBinding[];
}

/** ★ THE POLARITY LAW, as importable constants (cf. src/omp/enforcement.ts E1 fail-OPEN / E2 fail-CLOSED). */
export const ABIDE_POLARITY = "fail-open" as const;
export const CLAIM_FIREWALL_POLARITY = "fail-closed" as const;

/** The remedy every refusal carries — the turn can close once its claims are bound. */
export const CLAIM_FIREWALL_REMEDY =
  "bind every done-shaped claim atom to a THIS-TURN tool-result span " +
  "(run the tests/build in this turn and quote the tool output) — " +
  "an unbound completion claim is REJECTED fail-closed";

/** The optional Jev Choice: over BOUND spans only (a span's absence never reaches the judge). */
export type ClaimJudge = (atom: ClaimAtom, span: string) => "supports" | "contradicts";

// ── DETECT (pure) ─────────────────────────────────────────────────────────────

interface AtomPattern {
  kind: ClaimAtom["kind"];
  re: RegExp;
}

const ATOM_PATTERNS: readonly AtomPattern[] = [
  { kind: "count", re: /\b\d+\s*\/\s*\d+\s*(?:tests?|pass\w*|green)?\b/i },
  { kind: "count", re: /\b\d+\s+tests?\s+(?:pass\w*|green|ok)\b/i },
  { kind: "count", re: /\ball\s+\d+\s+tests?\s+pass\w*\b/i },
  { kind: "state", re: /\btests?\s+pass\w*\b/i },
  { kind: "state", re: /\bverified\b/i },
  { kind: "state", re: /\b(?:tests?|suite|build|battery)\s+green\b/i },
  { kind: "state", re: /\bgreen\s+(?:suite|build|tests?|battery)\b/i },
  { kind: "completion", re: /\bdone\b/i },
  { kind: "completion", re: /\bshipped\b/i },
  { kind: "completion", re: /\bcomplet(?:e[sd]?|ion)\b/i },
  { kind: "path", re: /\b(?:report|artifact|ledger)\s+(?:written|landed|at|to)\s+\S+/i },
];

/**
 * ★ THE ATOM-DETECTOR (pure, unit-testable). Extracts every done-shaped assertion
 * from the model's text. Overlapping matches collapse to the first (longest-first
 * by pattern order is NOT assumed — first start wins, later overlaps drop).
 */
export function detectClaimAtoms(text: string): ClaimAtom[] {
  const found: ClaimAtom[] = [];
  if (typeof text !== "string" || text.length === 0) return found;
  for (const p of ATOM_PATTERNS) {
    const flags = p.re.flags.includes("g") ? p.re.flags : p.re.flags + "g";
    const g = new RegExp(p.re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = g.exec(text)) !== null) {
      if (m[0].length === 0) {
        g.lastIndex += 1;
        continue;
      }
      const start = m.index;
      found.push({ text: m[0], kind: p.kind, charRange: [start, start + m[0].length] });
    }
  }
  found.sort((a, b) => a.charRange[0] - b.charRange[0]);
  const atoms: ClaimAtom[] = [];
  let lastEnd = -1;
  for (const a of found) {
    if (a.charRange[0] < lastEnd) continue;
    atoms.push(a);
    lastEnd = a.charRange[1];
  }
  return atoms;
}

// ── BIND (pure) ───────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "that", "this", "with", "have", "from", "they", "will", "would", "there",
  "their", "what", "about", "which", "when", "your", "were", "been", "for",
]);

function contentTokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

function digitTokens(s: string): string[] {
  return s.match(/\d+/g) ?? [];
}

// ★ A-1 (the audit's binder hole): a POSITIVE claim must not bind to a span that NEGATES it.
//   The old binder used `span.includes(n)` — a SUBSTRING test with no polarity — so
//   "523 tests pass" bound to the span "523 tests FAILED". THE FIX: a word-boundary number
//   match PLUS the number's LOCAL VERDICT (the first pass/fail signal in the window AFTER it).
const ATOM_POSITIVE = /\b(?:pass\w*|green|ok|okay|verified|done|complete\w*|shipped)\b/i;
const LOCAL_PASS = /\b(?:pass(?:ed|es|ing)?|green|ok|okay)\b/i;
const LOCAL_FAIL = /\b(?:fail(?:ed|s|ing)?|error(?:s|ed)?|broken)\b/i;

/** The FIRST verdict signal in the ~40 chars AFTER the number, or "unknown"/"absent". */
function localVerdict(span: string, num: string): "pass" | "fail" | "unknown" | "absent" {
  const m = new RegExp(`\\b${num}\\b`).exec(span);
  if (m === null) return "absent";
  const after = span.slice(m.index + m[0].length, m.index + m[0].length + 40);
  const p = LOCAL_PASS.exec(after);
  const f = LOCAL_FAIL.exec(after);
  if (p !== null && (f === null || p.index <= f.index)) return "pass";
  if (f !== null) return "fail";
  return "unknown";
}

/**
 * ★ THE BINDER (pure, unit-testable). Every atom → a THIS-TURN tool-result span.
 * A numeric atom binds on its number (e.g. "523" must appear in some span); a
 * non-numeric atom binds on a shared content token. NO span → FABRICATED by code
 * alone — the span IS the proof, so no Jev call is needed for the common case.
 */
export function bindClaimAtoms(atoms: ClaimAtom[], turnToolResults: string[]): ClaimBinding[] {
  const spans = (turnToolResults ?? []).filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );
  return atoms.map((atom) => {
    const nums = digitTokens(atom.text);
    const hit = spans.find((span) => {
      if (nums.length > 0) {
        // ★ A-1: word-boundary + ALL numbers present + the LOCAL VERDICT must not negate a
        //   positive atom. "523 tests pass" over the span "523 tests failed" → REJECTED.
        const allPresent = nums.every((n) => new RegExp(`\\b${n}\\b`).test(span));
        if (!allPresent) return false;
        if (ATOM_POSITIVE.test(atom.text)) {
          const verdicts = nums.map((n) => localVerdict(span, n));
          if (verdicts.some((v) => v === "fail")) return false; // the polarity flip
          if (verdicts.some((v) => v === "pass")) return true; // the number's context agrees
        }
        return true;
      }
      // A-1 (all-token): a non-numeric atom binds only if EVERY content token is present.
      const low = span.toLowerCase();
      const toks = contentTokens(atom.text);
      return toks.length === 0 ? false : toks.every((t) => low.includes(t));
    });
    if (hit === undefined) {
      return {
        atom,
        span: null,
        verdict: "FABRICATED" as const,
        evidence:
          `no THIS-TURN tool-result span binds atom "${atom.text}" ` +
          `(kind=${atom.kind}) — the span IS the proof`,
      };
    }
    return {
      atom,
      span: hit,
      verdict: "SUPPORTED" as const,
      evidence: hit.slice(0, 200),
    };
  });
}

// ── DECIDE (pure, FAIL-CLOSED) ────────────────────────────────────────────────

/**
 * ★ THE GATE — FAIL-CLOSED. A claim atom with NO bound span → REJECTED
 * ({ verdict: "FABRICATED", action: "REJECT" }). Text with no done-shaped atoms
 * passes vacuous (nothing to bind). An optional Jev Choice (opts.judge — jevk5 in
 * production) refines BOUND spans only: supports keeps SUPPORTED, contradicts flips
 * the atom to CONTRADICTED and rejects the turn; a judge throw fails CLOSED.
 */
export function adjudicateClaim(
  claim: { text: string; turnToolResults: string[] },
  opts?: { judge?: ClaimJudge },
): AdjudicateResult {
  const text = typeof claim.text === "string" ? claim.text : "";
  const atoms = detectClaimAtoms(text);
  if (atoms.length === 0) {
    return {
      verdict: "SUPPORTED",
      action: "PASS",
      reasons: ["no done-shaped claim atoms — nothing to bind"],
      bindings: [],
    };
  }
  const bindings = bindClaimAtoms(atoms, claim.turnToolResults ?? []);
  const reasons: string[] = [];
  let fabricated = false;
  for (const b of bindings) {
    if (b.verdict === "FABRICATED") {
      fabricated = true;
      reasons.push(
        `FABRICATED: atom "${b.atom.text}" (kind=${b.atom.kind}) has NO bound THIS-TURN tool-result span`,
      );
      continue;
    }
    if (opts?.judge !== undefined && b.span !== null) {
      let j: "supports" | "contradicts";
      try {
        j = opts.judge(b.atom, b.span);
      } catch (e) {
        fabricated = true;
        b.verdict = "UNCERTIFIABLE";
        b.evidence = `the judge failed on atom "${b.atom.text}" (fail-closed): ${e instanceof Error ? e.message : String(e)}`;
        reasons.push(`FABRICATED (fail-closed): the judge failed on atom "${b.atom.text}"`);
        continue;
      }
      if (j === "contradicts") {
        fabricated = true;
        b.verdict = "CONTRADICTED";
        b.evidence = `the judge contradicts atom "${b.atom.text}" on its bound span`;
        reasons.push(`FABRICATED: the judge contradicts atom "${b.atom.text}"`);
        continue;
      }
    }
    reasons.push(`SUPPORTED: atom "${b.atom.text}" bound to a THIS-TURN tool-result span`);
  }
  if (fabricated) {
    return { verdict: "FABRICATED", action: "REJECT", reasons, bindings };
  }
  return { verdict: "SUPPORTED", action: "PASS", reasons, bindings };
}

// ── THE HOOK WIRING (the runtime surface) ─────────────────────────────────────

type OnCapable = {
  on: (ev: string, h: (event: Record<string, unknown>, ctx: unknown) => unknown) => void;
};

/** Stop-shaped surfaces: the turn can close here, so the gate listens here. */
const TURN_END_SURFACES = ["stop", "turn_end", "turn-end", "session_stop", "session_end"] as const;

function sidOf(event: Record<string, unknown>): string {
  const direct = event["sessionId"] ?? event["sessionID"];
  if (typeof direct === "string" && direct.length > 0) return direct;
  return "turn-default";
}

function resultTextOf(event: Record<string, unknown>): string {
  const parts: string[] = [];
  const c = event["content"];
  if (Array.isArray(c)) {
    for (const b of c) {
      if (typeof b === "string") parts.push(b);
      else if (b !== null && typeof b === "object" && "text" in b) {
        parts.push(String((b as { text: unknown }).text));
      }
    }
  }
  for (const k of ["text", "output"] as const) {
    const v = event[k];
    if (typeof v === "string" && v.length > 0) parts.push(v);
  }
  const d = event["details"];
  if (d !== null && typeof d === "object") {
    try {
      parts.push(JSON.stringify(d));
    } catch {
      // a details shape that will not serialize never blocks collection
    }
  }
  return parts.join("\n");
}

function closingTextOf(event: Record<string, unknown>): string {
  for (const k of ["closingText", "text", "message", "lastMessage"] as const) {
    const v = event[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  const c = event["content"];
  if (typeof c === "string" && c.trim().length > 0) return c;
  if (Array.isArray(c)) {
    const t = c
      .map((b) =>
        typeof b === "string"
          ? b
          : b !== null && typeof b === "object" && "text" in b
            ? String((b as { text: unknown }).text)
            : "",
      )
      .join("\n")
      .trim();
    if (t.length > 0) return t;
  }
  return "";
}

/**
 * ★ THE WIRE-UP. Collects THIS-TURN tool-result spans on the tool_result wire
 * (never blocks — collection cannot throw past the handler) and adjudicates the
 * assistant's closing text on the stop/turn-end surface. On FABRICATED it throws
 * GI_FABRICATED_CLAIM with the remedy — the same throw-to-cancel surface the graph
 * gate uses — so the turn cannot close on an unbound claim. ABIDE's fail-open
 * repair path is untouched: this handler never advises, only rejects unbound closes.
 */
export function attachClaimFirewall(pi: OnCapable): void {
  const turnSpans = new Map<string, string[]>();
  pi.on("tool_result", (event: Record<string, unknown>) => {
    try {
      const t = resultTextOf(event);
      if (t.trim().length > 0) {
        const sid = sidOf(event);
        const q = turnSpans.get(sid) ?? [];
        q.push(t.slice(0, 4000));
        while (q.length > 50) q.shift();
        turnSpans.set(sid, q);
      }
    } catch {
      // collection never blocks a tool result
    }
    return undefined;
  });
  const onTurnEnd = (event: Record<string, unknown>): unknown => {
    const closing = closingTextOf(event);
    if (closing.trim().length === 0) return undefined;
    const sid = sidOf(event);
    const spans = turnSpans.get(sid) ?? [];
    const r = adjudicateClaim({ text: closing, turnToolResults: spans });
    turnSpans.delete(sid);
    if (r.verdict === "FABRICATED") {
      throw new Error(
        `GI_FABRICATED_CLAIM: the turn's completion claim is UNBOUND ` +
          `(${r.reasons.join(" | ").slice(0, 400)}). ${CLAIM_FIREWALL_REMEDY}`,
      );
    }
    return undefined;
  };
  for (const surf of TURN_END_SURFACES) {
    try {
      pi.on(surf, onTurnEnd);
    } catch {
      // a harness without this surface — the tool_result wire still holds the spans
    }
  }
}
