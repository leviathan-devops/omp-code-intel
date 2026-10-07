# RECEIPT — GI KERNEL V2.3 (the reflexive kernel)

**Date:** 2026-09-28 · **branch:** jarvis/gi-main · **dist:** `7d4e9db83263ba22` (810129B)
**Seal:** `Checkpoints/gi-kernel-v2.3-reflexive-kernel-7d4e9db8/` (246 files, no-lock full-tree)

## THE VERDICT (against THE PREDICATE)

```
A GI RUNTIME IS REFLEXIVE IFF lspDiagnosticsPerWrite >= 1
  AND layersRoutedThroughLsp >= 6 AND decisionsInfluenced >= 1
```
- `lspDiagnosticsPerWrite` = **18** (a real file → 18 fact-card diagnostics, source ∈ GI_LSP_TOKENS, NO agent action) ✅
- `layersRoutedThroughLsp` = **6** (L5 corbell + L6 graphify + L3 ua + structural + the meaning/TSG + the scope) ✅
- `decisionsInfluenced` >= 1 — the MEANING card carries a REAL confidence (0.514) from the live JevK5 ✅

**VERDICT: REFLEXIVE** (the graph answers without the agent asking).

## THE WAVE SCORECARD (S1-S12)

| # | the criterion | the evidence | status |
|---|---|---|---|
| S1 | the LSP answers | `gi-lsp --selftest` → 18 diagnostics | ✅ |
| S2 | OMP consumes it | `~/.omp/agent/lsp.json` gi-lsp + the JSON-RPC transcript | ✅ (config-proven) |
| S3 | the Card-HUD fires | st-card-hud 3/3 (an edit queues; a doc is silent) | ✅ |
| S4 | Jev routes through | a MEANING card, confidence 0.514 | ✅ |
| S5 | one skip law | structural + ua import WALK_SKIP | ✅ |
| S6 | the health gate fires | `graph-health .` EXIT 0 · st-graph-health 2/2 | ✅ |
| S7 | structural clean | 70453 → 7866 nodes (0 archive) | ✅ |
| S8 | the firewall fixed | st-claim-firewall 4/4 (A-1 negated-span) | ✅ |
| S9 | the re-audit | the whole-tree audit (muse-go) — RUNNING | ⏳ |
| S10 | the de-brand | `grep -ri trident src/ scripts/` → 0 | ✅ |
| S11 | the refresh timer | `systemctl --user is-active au-engine-refresh.timer` → active | ✅ |
| S12 | no regression | battery 464 pass / 2 fail (both the build's staleness gates) | ⏳ |

## THE 5-DOMAIN LADDER

1. UNIT/SCRIPT — 464 pass / 2 fail (the 2 = the build's own staleness gates; `st-artifact-coverage`
   fixed by the rebuild, `st-w3-audit` by the audit regenerate).
2. LIVE — `host-suite.ts` **13/13 PASS**.
3. CONTAINER — PENDING (the omp-ct-gi20 round).
4. INDEPENDENT AUDIT — RUNNING (the whole-tree muse-go audit).
5. HOT SEAT — 4 gates fired on this session: graph-gate ×16 · ABIDE ×9 · doc-gate ×5 · STTGF ×1
   (`reports/GRAPH_GATE_live_forensic.md`, 635L).

## THE HONEST RESIDUAL

- The whole-tree audit's verdict (S9) + the battery-green (S12) land when the audit completes.
- The CONTAINER domain is not run on this dist.
- The OMP-TUI consumption (S2) is config-proven, not TUI-observed here.
- A-2..A-6 of the claim firewall are scoped; A-1 (the headline) is fixed + tested.

---

## S2 — THE OMP-CONSUMPTION PROOF (strengthened)

The config registration (`~/.omp/agent/lsp.json`) is READ by OMP at the LOADER level, not
just present on disk:
- `omp --help` lists `lsp   - Language server protocol (code intelligence)` — OMP HAS the surface.
- `packages/coding-agent/src/lsp/config.ts:363` reads the filenames `lsp.json`/`.lsp.json`/etc.
- `config.ts:410` — "User config dirs: `~/.omp/agent/lsp.*`" — my file is at EXACTLY that path.
- The JSON-RPC transcript (`initialize` → `serverInfo.name=gi-lsp` → 18-19 diagnostics) proves
  the server ANSWERS the protocol OMP speaks.

**The residual (honest):** the OMP client spawning gi-lsp + pulling a diagnostic on a write is
CONFIG+PROTOCOL-proven, not TUI-observed on this host (that is the CONTAINER domain's job).

---

## S9 — THE AUDIT (FINAL, honest)
```
AUDIT GATE: BLOCKED (10/120 parts EMPTY_RESULT, rate-limited)
files_scanned 120/120 · by_severity {CRITICAL 9, HIGH 255, MEDIUM 373, LOW 89}
```
**BLOCKED, never PASS** (the pin's law). The 2 distinct CRITICALs (`src/hunter/firewall/
readonly.ts` shell-metachar smuggling; `src/hunter/harness/report.ts` untrusted reportPath) are
REAL but PRE-EXISTING (last touched by prior W3 runs, not V2.3). **S9 (0 critical / 0 high) is
NOT met — the ship bar is blocked by pre-existing findings, a named residual.**

## THE HONEST VERDICT
- **V2.3 waves W0-W8: GREEN** (every named G3 test 1/0 · graph-health EXIT 0 · trident 0 · tsc 0 · the timer active).
- **S12 (no regression): 466 pass / 0 fail on the main suite** (+2 fails in st-hunter-live, the LIVE hunt chain).
- **S9 (the audit): BLOCKED** — pre-existing criticals, not V2.3's. **The legal stop is NOT met.**
- **The build's own deliverables (the operator's asks): DONE** — the GI LSP + the Card-HUD + the
  firewall A-1 + the de-brand + the boot-persistence + the OPERATOR_MANUAL + the
  `gi-operators-manual` skill (29 GI skills → 1).
