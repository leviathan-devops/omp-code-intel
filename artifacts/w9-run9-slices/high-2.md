# HIGH slice 2 — 1 findings across 1 files

## src/hunter/firewall/lexicon-types.ts
- **src/hunter/firewall/lexicon-types.ts:94-97** (bug)
  Type safety gap: `verdict` and `state` are independently typed properties, so nothing prevents constructing a `BashLockdownDecision` where `verdict: 'ALLOW_READ'` but `state: 'BLOCKED'`. Since `state` is documented as an alias of `verdict` (the spec's pseudocode `d.state`), this divergence would be semantically invalid but type-correct. The same issue exists in `ReportScopeDecision`. Consider using a discriminated-union pattern or a factory function that enforces consistency, rather than exposing two independently-settable properties that must always carry the same value.
  ```existing
  export interface BashLockdownDecision extends LexiconDecision {
  verdict: 'ALLOW_READ' | 'BLOCKED';
  state: 'ALLOW_READ' | 'BLOCKED';
}
  ```
  ```suggested
  // Option A: Use a mapped type that forces state = verdict
export type BashLockdownDecision = LexiconDecision & {
  verdict: 'ALLOW_READ' | 'BLOCKED';
} & { state: LexiconDecision['verdict'] };

// Option B (preferred): A factory that constructs the object with guaranteed consistency
export function createBashLockdownDecision(
  verdict: 'ALLOW_READ' | 'BLOCKED',
  rest: Omit<BashLockdownDecision,
  ```
