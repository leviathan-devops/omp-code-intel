// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/firewall/lexicon-types.ts (121L) — T.E.B shared types: PatternFamily, MPSE, LexiconDecision, BASH_ERROR_MESSAGE, REPORT_SCOPE_ERROR, MASTER_CONTEXT_VARIANTS
// Ported 2026-09-14 (port wave W3-P1/P2). Verbatim bytes; do not edit in place without re-diffing the source.
/**
 * lexicon-types.ts — THE T.E.B SHARED TYPES (W3, the firewall dir's contract surface)
 *
 * The Lexicon bible's engineering canon (the L2 spec §7.1:3041-3081):
 * - THE PATTERNFAMILY: the typed member {id, kind, matcher, triggerCondition, severity, messageTemplate, remediationHook}
 * - THE MPSE TRIPLET: {Pattern, State, Evidence} — no triplet = no decision = no enforcement event
 * - THE DETECTION-VS-DECISION LAW (§7.1:3059): the matcher is a mechanical DETECTOR ONLY — it classifies
 *   the input; it NEVER decides the outcome. THE DECISION is the state machine's transition.
 * - THE FAIL-STATE: BLOCKED — never a silent pass (§7.1.4:3081).
 *
 * This file defines ONLY the types. The detection logic lives in readonly.ts (the bash lockdown)
 * and artifact-scope.ts (the report scope); the decision state machines live beside their detectors.
 */

/** The classification the matchers emit — a DETECTION, never a verdict. */
export interface MatchResult {
  /** The matched family id (e.g. 'BASH_EXECUTION', 'BASH_READ', 'MASTER_CONTEXT_TARGET'). */
  pattern: string;
  /** The matched token (the first verb, the metacharacter, the resolved path segment). */
  token: string;
  /** The free-text evidence (the full command or the resolved target path). */
  evidence: string;
}

/** The context the matchers may consult (the project root, the command's environment). */
export interface LexiconContext {
  /** The project root the lexicon guards (realpath'd by the caller). */
  projectRoot?: string;
  /** The resolved master-context dir when the report-scope matcher has run. */
  resolvedMasterContextDir?: string;
}

/**
 * THE PATTERNFAMILY — the typed member per the bible §1.2 (the L2 spec §7.1:3047-3057).
 * kind: 'ALLOW' families permit the action; 'BLOCK' families deny it.
 */
export interface PatternFamily {
  id: string;
  kind: 'ALLOW' | 'BLOCK';
  /**
   * THE MECHANICAL DETECTOR — Order-2+ classification only.
   * THE REGEX IS THE MECHANICAL DETECTOR ONLY — the token/verb classification.
   * THE DECISION is the state machine below (PARSED -> ALLOW_* | BLOCKED).
   * A regex that returns a verdict would be a SLOP-SIG-2 (regex-only classifier).
   */
  matcher: (input: string, ctx: LexiconContext) => MatchResult | null;
  /** The gate that arms the matcher. */
  triggerCondition: (ctx: LexiconContext) => boolean;
  severity: 'INFO' | 'HIGH' | 'CRITICAL';
  /** The named-error text, verbatim. */
  messageTemplate: string;
  /** The recovery action (the throw, the triplet record, the log). */
  // ★ F-533 FIX (2026-09-24): the hook took a lowercase {pattern,state,evidence} arg while MPSE is PascalCase — no call site could pass the triplet directly (grep: zero invocations in src/). The hook now takes MPSE itself. (Renamed from F-500: that number collides with sibling calibration/mechanical markers.)
  remediationHook?: (evidence: MPSE) => void;
}

/** THE MPSE TRIPLET — the evidence record on EVERY decision (the bible §1.2, the L2 spec §7.1:3069-3077). */
export interface MPSE {
  /** The matched family id. */
  Pattern: string;
  /** The state-machine state ('PARSED', 'PARSED->ALLOW_READ', 'PARSED->BLOCKED', ...). */
  State: string;
  /** The full command or the resolved target path + the matched token. */
  Evidence: string;
}

/** THE LEXICON DECISION — the state machine's output, carrying both the interface fields and the test aliases. */
export interface LexiconDecision {
  /** The verdict — the closed union (the state machine's ALLOW_* | BLOCKED). */
  verdict: 'ALLOW_READ' | 'ALLOW_REPORT' | 'ALLOW_FIX' | 'BLOCKED';
  /** The matched family id. */
  pattern: string;
  /** The matched token. */
  token: string;
  /** The named error text (the exact message for the BLOCKs; '' for the pure ALLOWs). */
  message: string;
  /** THE MPSE TRIPLET — recorded on EVERY decision, no exceptions. */
  mPSE: MPSE;
  // THE TEST ALIASES (the spec's 6.2 pseudocode asserts these names — §6.2:2588-2594):
  // ★ F-850 FIX (2026-09-24): CONTAIN the alias-desync class — state/triplet were
  //   independently-assignable fields, so verdict BLOCKED + state ALLOW_READ typechecked
  //   silently. readonly freezes post-construction drift (zero src/ mutations — grep-verified);
  //   makeLexiconDecision/assertLexiconDecisionConsistent below are the synced constructor
  //   + the loud mismatch guard. Build via makeLexiconDecision; assert before enforcing.
  /** Alias of verdict — the pseudocode asserts d.state. */
  readonly state: LexiconDecision['verdict'];
  /** Alias of mPSE — the pseudocode asserts d.triplet.Pattern. */
  readonly triplet: MPSE;
  /** The resolved master-context dir (the report-scope decision's create/reuse resolution). */
  resolvedDir?: string;
}
/** THE SYNCED CONSTRUCTOR — the single sanctioned way to build a decision. Sets both
 *  aliases from their sources so they cannot desync at construction. */
export function makeLexiconDecision(
  base: Pick<LexiconDecision, 'verdict' | 'pattern' | 'token' | 'message' | 'mPSE'> & { resolvedDir?: string },
): LexiconDecision {
  return Object.freeze({ ...base, state: base.verdict, triplet: Object.freeze({ ...base.mPSE }) });
}
/** THE LOUD MISMATCH GUARD — value-compares the aliases against their sources (clone-safe:
 *  JSON round-trips break reference identity, so Pattern/State/Evidence compare by value).
 *  Throws LEXICON_ALIAS_MISMATCH on any drift — call before enforcing. */
export function assertLexiconDecisionConsistent(d: LexiconDecision): void {
  if (!d || !d.triplet || !d.mPSE) throw new Error('LEXICON_ALIAS_MISMATCH: missing decision/triplet/mPSE');
  const tripletOk = d.triplet.Pattern === d.mPSE.Pattern
    && d.triplet.State === d.mPSE.State
    && d.triplet.Evidence === d.mPSE.Evidence;
  if (d.state !== d.verdict || !tripletOk) {
    throw new Error(
      `LEXICON_ALIAS_MISMATCH: state=${JSON.stringify(d.state)} vs verdict=${JSON.stringify(d.verdict)}, ` +
      `triplet=${JSON.stringify(d.triplet)} vs mPSE=${JSON.stringify(d.mPSE)} — rebuild via makeLexiconDecision`,
    );
  }
}

/** THE BASH LOCKDOWN DECISION — the readonly.ts contract (the L2 spec §7.2:3096-3101). */
// ★ F-11 FIX (2026-09-24): `state` is the verdict alias — it must narrow with
// ★ `verdict`, otherwise the inherited 4-member union admits states (e.g.
// ★ 'ALLOW_REPORT') the narrowed verdict can never carry.
export interface BashLockdownDecision extends LexiconDecision {
  verdict: 'ALLOW_READ' | 'BLOCKED';
  readonly state: 'ALLOW_READ' | 'BLOCKED';
}

/** THE REPORT SCOPE DECISION — the artifact-scope.ts contract (the L2 spec §7.3). */
// ★ F-12 FIX (2026-09-24): same alias narrowing — `state` tracks the narrowed
// ★ `verdict`, never the full 4-member base union.
export interface ReportScopeDecision extends LexiconDecision {
  verdict: 'ALLOW_REPORT' | 'BLOCKED';
  readonly state: 'ALLOW_REPORT' | 'BLOCKED';
}

/** THE EXACT BASH ERROR MESSAGE (the operator's C1.10, quoted verbatim at the spec §7.2:3103-3104). */
export const BASH_ERROR_MESSAGE: string =
  'code edits are not allowed. bash is ONLY granted for search and read capabilities.';

/** THE EXACT REPORT-SCOPE ERROR (the operator's C1.11 — a LITERAL constant, NO interpolation). */
export const REPORT_SCOPE_ERROR: string =
  'report writes are ONLY allowed to <project>/MASTER_CONTEXT/bug_hunter_report_v<N>.md';

// ---------------------------------------------------------------------------
// THE MASTER_CONTEXT VARIANTS (D18, spec §7.3:3371-3372) — THE ONE SHARED SOURCE
// ---------------------------------------------------------------------------

/** The six syntax forms of the MASTER_CONTEXT folder (D18, spec §7.3:3371-3372).
 *  THE REGEX IS THE MECHANICAL DETECTOR ONLY — the variant matching; THE
 *  DECISION is the REPORT_SCOPE_DECISION state machine (PARSED -> ALLOW_REPORT |
 *  BLOCKED). The consumers (firewall/artifact-scope.ts, tools/report-writer.ts,
 *  hooks/index.ts) IMPORT this single source — the triplication drift risk is
 *  closed (the 2026-08-12 unification): ONE definition, three imports, zero
 *  local copies. The 6 forms are the operator's named syntax variations
 *  ("lexicon detection of any syntax variations that exist so it doesnt create
 *  duplicates") — the first EXISTING variant wins, never a duplicate dir. */
export const MASTER_CONTEXT_VARIANTS: readonly string[] = [
  'MASTER_CONTEXT', 'master-context', 'master_context',
  'MasterContext', 'masterContext', 'master context',
];
