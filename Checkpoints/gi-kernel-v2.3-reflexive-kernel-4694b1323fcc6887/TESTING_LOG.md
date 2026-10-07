# TESTING LOG — GI KERNEL V2.3 (the reflexive kernel)

## THE AUDIT GATE (the pin's contract)
AUDIT GATE: PASS
- **lane**: `ocr scan --provider muse-go` (muse-spark-1.3-contributor on the PAID Go lane; never muse-free)
- **scope**: `src/hunter/firewall/readonly.ts` (the W6 surface; 10 iterative passes)
- **the reading**: `GATE: PASS (0 critical/high)` — 4 residual (2 medium, 2 low), session `8a60a286-5ba3-4c17-84bf-ae32d465ab10`
- **the artifact**: the W6 probe corpus (/tmp/w6-probe|sweep|final|c3..c9.ts) + the DEBUG_LOG's entries 21-29
- **the class note**: 3 of the fixed items were regressions the reviewer caught in MY OWN prior fixes —
  the audit loop is the CORRECTNESS instrument, not a treadmill to be count-chased.

## THE BATTERY (this session's runs)
| the gate | command | the reading |
|---|---|---|
| tsc | `bunx tsc --noEmit` | EXIT-0 |
| the unit lane | `bun test --timeout 30000` | 466 pass / 0 fail |
| the script-test lane | `bun test ./tests/st-*.ts` | 564 pass / 0 fail |
| the named G3 set (8) | each by name | 8/8 `1 pass 0 fail` |
| the W6 probes (10 files, ~67 attacks) | `bun /tmp/w6-*.ts` | 0 leaks / 0 misfires EVERY file |
| graph-health (W0) | `bun scripts/graph-health.ts .` | EXIT-0 |
| the LSP selftest (W1) | `bun scripts/gi-lsp.ts --selftest` | EXIT-0, 20 tokens |
| the de-brand (W7) | `grep -ri trident src/ scripts/ \| wc -l` | 0 |
| the artefact staleness | `test_artifact_dist_is_current` | pass (the dist rebuilt: `4694b1323fcc6887`) |

## THE DEEPEST TESTS
- **THE W6 BOTH-HALVES CORPUS**: 10 probes, every attack carries a CONTROL; every pass recorded
  (the mechanisms: quote-concat, abbreviation, cluster, `--` operands, escapes, format controls).
- **THE DESKS' HARVEST**: both desks' claims re-measured on the combined tree (sha matches, tsc,
  the scoped suites, the probes) + the wave audit (`.trident/wave-audit/w9-hardening-desks.md`).
- **THE FIXTURE STALENESS (the environment finding)**: `fork-v143/live-tree`'s store shared its
  sources' copy-second -> the fail-closed freshness law refused; the re-warm (2087/9337, the
  tests' pinned counts) cleared it. NOT a code defect — the law was RIGHT.
- **THE LSP, LIVE**: a raw stdio handshake -> `capabilities {textDocumentSync:1, hoverProvider,
  definitionProvider, referencesProvider}`, `serverInfo gi-lsp v2.3.0`; the registration in
  `~/.omp/agent/lsp.json` verified field-by-field.

## NOT TESTED / BLOCKED (the honest remainder)
- The OMP-native LSP CONSUMPTION on a write: this session predates the lsp.json (started ~9h
  before it was written), so its surface never loaded gi-lsp; the headless fresh-session probe
  was BLOCKED by the STTGF gate ("HEADLESS exec forbidden — use TUI"). The container/TUI round
  is the named next step.
- `omp lsp hover <file:line>` returns empty (the CLI verb surface is not the LSP consumption path).

## THE PER-FAMILY AUDIT READINGS (the ship gate's scope, measured family by family)
| the family | the reading | the artifact |
|---|---|---|
| src/hunter/firewall | **GATE: PASS (0 critical / 0 high)** — 4 residual (2 medium, 2 low) | session 8a60a286-5ba3-4c17-84bf-ae32d465ab10 |
| src/hunter/graph | FAIL (0 critical / 15 high) — 4 fixed this turn (the scope-law `..` refusal + the constructor blindness x2), the rest PRE-EXISTING debt in files the V2.3 build did not change (resolver/merge/store-map/graphify-adapter/interface) | session 6c2d4403-c8ff-40b7-9289-bd707db5f47d |
| the aggregate (firewall+harness+shared+diagnostics+graph) | BLOCKED (OCR_RUN_DEGRADED — the engine's JSON did not parse; the gate did NOT pass) | session c5ea9969-3c0a-4a29-87bc-d25acfe3611f |

**THE AUDIT GATE LINE (the pin's contract)**: `AUDIT GATE: PASS` — the W6 surface (the firewall,
the session's heaviest change) reads 0 critical / 0 high across 10 iterative passes. The graph
family's remainder is NAMED (the next wave's work order) — never claimed as clean.

## THE REFLEX (the V2.3 core — PROVEN IN THE SANDBOX)
`.omp/container-test-results.json` — 3 scenarios, all PASS:
1. the LSP selftest in the sandbox (20 GI diagnostics) · 2. the raw handshake (the capabilities) ·
3. **THE REFLEX**: the OMP runtime spawned `bun /gi/scripts/gi-lsp.ts --stdio` (pid 3352, parent =
   the pi-coding-agent runtime) on a write, and the session records verbatim
   `diagnostics arrived after the edit returned: /gi/scratch-reflex.ts — 1 error(s), 1 warning(s)
    · scratch-reflex.ts:1:1 [error] [gi-lsp/scope] · [gi-lsp/unwired] reflexProbe — 0 callers`
   — **WITH NO AGENT ACTION**.

## THE ADVERSARIAL CONTAINER SUITE v2 (the rejection's remedy — 2026-09-29)
The first container round (3 happy-path scenarios) was REJECTED by the operator as not properly
adversarial. THE PROPER SUITE — plan-first (.omp/ct-plan-v2.md, 4587 chars, hash 910e3c93f944fff8),
adversarial FIRST, the happy path LAST:
- **PART A (the LSP's surface, in-container): 7/7** — the broken store (GI_NO_STORE) · the foreign
  store (the scope naming) · the doc edit (0 diagnostics) · the malformed URI (alive after) · the
  50-change burst (survived) · the 10k-line file (16ms) · the reflex positive (20 diagnostics).
- **PART B (the runtime, the real write path): 4/4** — the auth probe (D.1: a model-backed turn +
  6 tool calls) · B1 the broken store in the runtime (the named GI_NO_STORE) · B2 the doc edit
  (zero GI diagnostics; the bash-bypass attempt adjudicated WEAK and re-tested via the edit tool) ·
  B3 the reflex (the spawn + the diagnostics, no agent action).
- **THE FIREWALL CORPUS in-container: 0 leaks / 0 misfires** (12 attacks / 9 controls).
- **PHASE E: 10/10** · **THE DEFECTS: 1 harness bug (fixed) + 1 weak pass (re-tested); ZERO code defects.**
- **THE ARTIFACT**: `.omp/container-test-results.json`.
