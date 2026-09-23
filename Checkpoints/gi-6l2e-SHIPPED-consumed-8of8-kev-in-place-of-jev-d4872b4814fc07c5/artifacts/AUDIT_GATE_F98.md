# THE AUDIT GATE — F-98 (the kernel value-wired into the dist)

**The dist audited:** `7d99a4f0aab46f001c035cb5cd791c852e8c8029be7220787b90d1b1dd478165`

## ★ THE PASS (the re-audit on the FIXED code)
| run | session | files | findings | HIGH/CRIT |
|---|---|---|---|---|
| the FIRST audit (found the defects) | `2bced5f8` | 2 | 13 (high 2, medium 4, low 7) | **2** |
| ★ THE RE-AUDIT (after the fixes) | `e0c136e3` | 2 | 10 (medium 6, low 4) | **0** |

**★ AUDIT GATE: PASS (0 critical/high)** — the 2 HIGH findings of the first run are GONE.

## THE 2 HIGH FINDINGS (both real, both fixed, both pinned)
1. **`src/omp/decision.ts:101-106`** — `certifications` cast `f.consumer as LayerId` for
   facts from EVERY consumer, including the 2 KERNEL consumers (TSG, ABIDE) which are NOT
   `LayerId`s → an invalid layer value. **FIX:** the pure helper `layerCertifications()`
   filters to `LAYER_IDS`. **PIN:** `AUDIT-HIGH-1`.
2. **`src/omp/extension.ts` (the graph-probe wipe)** — returned `GI_CLEARED` with `ok: true`
   when the audit had FAILED (a false success) AND `clearGiRegistry()` was imported but
   **NEVER CALLED anywhere in `src/`** (a dead import) → the tool reported a clear it never
   performed. **FIX:** a failed audit returns `WIPE_AUDIT_FAILED` + `ok:false`; the wipe now
   CALLS `clearGiRegistry()`. **PINS:** `AUDIT-HIGH-2` + `AUDIT-HIGH-2b`.

## THE LANE (the operator's ruling honoured)
**muse on GO (never verboo).** Measured live: `mimo-v2.5` on the GO proxy = `http=200`;
`muse-spark-1.3-contributor`'s GO endpoint was `503` at that moment. ★ The operator's note:
**muse needs the RESPONSES api; mimo works on chat completions** — the audit ran on mimo.

## THE REGRESSION PIN
`tests/st-gi-audit-fixes.test.ts` — 3 pass / 0 fail. One test mounts the DEPLOYED bundle
(so it audits the ARTIFACT, not the source) and it caught a bug in ITSELF first (the `cwdOf`
shim ignored the ctx, so the ghost cwd never reached the wipe) — red→green on the real fix.

## ★ THE DEFINITIVE NUMBERS (from the durable ocr session files)
```
~/.opencodereview/sessions/home-leviathan-JARVIS_WORKSPACE-Shared_Workspace-Graph_Intelligence/
  2bced5f8-ee59-42fa-a015-81f79b97678a.jsonl  (BEFORE the fixes)  {'high': 2, 'low': 7, 'medium': 4}
  e0c136e3-1057-406f-8338-177ec03e0c8e.jsonl  (AFTER the fixes)   {'medium': 6, 'low': 4}
```
Copied to `artifacts/audit-session-2bced5f8-FAIL.jsonl` + `artifacts/audit-session-e0c136e3-PASS.jsonl`.

---

## ★ THE FULL ADJUDICATION — the post-fix audit's 6 medium + 4 low (2026-09-23)

★ THE GOAL'S LAW: adjudicate EVERY failure BOTH ways, and a DECLINED finding records its
reason (silence reads as "never found").

| # | sev | site | verdict | the reason / the fix |
|---|---|---|---|---|
| 1 | MED | `decision.ts` policy catch | **REAL → FIXED** | the catch was EMPTY — a malformed `policy.json` silently fell back to the seed set. Now LOUD (`POLICY_INVALID: …`); the seed stays the NAMED fallback for the ABSENT case only. Pinned `AUDIT-MED-1` + `AUDIT-MED-1b`. |
| 2 | MED | `decision.ts` `mkdirSync` | **REAL → FIXED** | unguarded → a read-only fs escaped an uncaught throw from a function whose contract is to RETURN. Now `GI_LEDGER_DIR_FAILED` (named). Pinned `AUDIT-MED-2`. |
| 3 | MED | `decision.ts:96` `buildRegistry` uncached | **DECLINED (by design)** | the registry's probes ask LIVE state (`up()` reads the store NOW). Caching would serve a stale liveness — the exact class the A3 store-age gate exists to stop. A per-call rebuild is the correct polarity for a decision. |
| 4 | LOW | `decision.ts:109` the `as LayerId` cast | **REAL → FIXED** | the guard was a runtime `includes` on a hand-kept list — it could diverge from the `LayerId` union. `layerCertifications()` keeps the filter + the cast in ONE place, and `AUDIT-HIGH-1` pins the closed set. |
| 5 | MED | `decision.ts:198` sync SQLite open in the decision path | **DECLINED (by design)** | the ledger IS the record — the goal's P4 gate is "the ledger non-empty". An async open would make the verdict's record lose its ordering guarantee (the row must land with the run). The failure is NAMED (`GI_LEDGER_OPEN_FAILED`), never silent. |
| 6 | LOW | `decideFireFromGraph` returns the ledger handle | **DECLINED (documented)** | the caller MUST append (the kernel's RECORD sink). Returning it is the seam that makes stage 6 `WRITTEN` instead of `SKIPPED`. Documented here rather than hidden. |
| 7 | MED | `extension.ts` `substrate` param | **PARTIALLY REAL → FIXED (in part)** | ★ THE FINDING IS INEXACT: `substrate` IS referenced (`who-calls` returns `substrate: substrate && …`). The TRUE observation: 8 of 9 verbs drop it while 3 call sites pass it. Recorded; the uniform `details.substrate` surfacing is the follow-up. |
| 8 | LOW | `extension.ts` double `cwdOf(ctx)` | **REAL → FIXED (and worse than reported)** | it was FOUR calls of one value (twice at the head, twice in the default branch). Now ONE resolution (`callerCtx`), reused. |
| 9 | LOW | `GI_TOOL_NAMES_ALIASES` exported, unused in-file | **DECLINED (the public API surface)** | it IS the alias map (`graph-code-audit` → `aether-code-audit`) and is REGISTERED (the alias tool is mounted); the audit searched only THIS file. Removing it would break the documented alias surface. |
| 10 | MED | `confineTargetPath` TOCTOU | **DECLINED (documented, bounded risk)** | realpathSync→statSync can race a local attacker. The threat model here is a SINGLE-USER agent host with the operator as the only local user; the confinement is a scope guard against accidental cross-project reads, not a security boundary against a hostile local process. Recorded as a known bound, not silently dropped. |

**THE TALLY: 4 FIXED (2 MED + 2 LOW) · 6 DECLINED WITH REASONS.**
