export interface Rule {
  key: string;
  re: string;
  body: string;
}

export interface CompiledRule {
  key: string;
  body: string;
  re: RegExp;
}

export interface Violation {
  key: string;
  body: string;
}

export const RULE_MARKER_PREFIX = "[mimo-intel rule ";

export function compileRules(rules: Rule[]): CompiledRule[] {
  if (!Array.isArray(rules) || rules.length === 0) return [];
  const out: CompiledRule[] = [];
  for (const r of rules) {
    try {
      out.push({ key: r.key, body: r.body, re: new RegExp(r.re) });
    } catch {
      console.warn(`[mimo-code-intel] dropped invalid ttsr rule: ${r.key}`);
    }
  }
  return out;
}

export function scan(compiled: CompiledRule[], output: string): Violation[] {
  return compiled
    .filter((c) => c.re.test(output))
    .map(({ key, body }) => ({ key, body }));
}

export function reminderLine(v: { key: string; body: string }): string {
  return `${RULE_MARKER_PREFIX}${v.key}] ${v.body}`;
}

export function persistContext(compiled: CompiledRule[]): string[] {
  return compiled.map((c) => c.body);
}

// W4-C: shared per-session violation store (moved out of index.ts so the
// advisor reuses the same consume-on-read mechanics; W2 behavior preserved:
// per-key consume, last-batch fallback for identity-less transform input).
// pushViolations APPENDS to any pending batch for the session (tool-scan and
// advisor-scan hits coexist until the next transform consumes them); a single
// push-then-take round trip is identical to the old overwrite semantics.
const violationsBySession = new Map<string, Violation[]>();
let lastSessionWithViolations: string | null = null;

export function pushViolations(sessionID: string, v: Violation[]): void {
  const prev = violationsBySession.get(sessionID) ?? [];
  violationsBySession.set(sessionID, [...prev, ...v]);
  lastSessionWithViolations = sessionID;
}

// Returns the pending batch for sessionID and deletes it (consume-on-read).
// Returns null when nothing is pending (caller treats as "unchanged").
export function takeViolations(sessionID: string): Violation[] | null {
  if (!violationsBySession.has(sessionID)) return null;
  const batch = violationsBySession.get(sessionID) ?? [];
  violationsBySession.delete(sessionID);
  if (lastSessionWithViolations === sessionID) lastSessionWithViolations = null;
  return batch;
}

// Documented no-identity fallback: the messages.transform input carries no
// session identity ({}, per the Hooks surface), so consume the most recently
// stored batch. In a multi-session server that can misattribute one reminder
// by one message (store is consumed on read); a keyed lookup runs whenever a
// sessionID IS present.
export function takeLastViolations(): Violation[] | null {
  const key = lastSessionWithViolations;
  if (key === null) return null;
  return takeViolations(key);
}
