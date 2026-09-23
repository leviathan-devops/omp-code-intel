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
