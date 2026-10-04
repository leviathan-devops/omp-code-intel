# THE RECEIPT — THE JEV DECISION LAYER (2026-09-29, FINAL)

## 1 · THE BASELINE DIFF
| the quantity | the pin's baseline | measured | the diff |
|---|---|---|---|
| git | jarvis/gi-main 018aad8 | jarvis/gi-main 018aad8 | ZERO |
| the GI dist sha | 4694b1323fcc6887 | 2e2a39031c6059ca (825052B) | the F-144 fix + the scrub |
| the omp-ct dist | the pre-Jev bundle | fe86a02fe77e18a9 (the 4-GATE JEV WIRE) | the 4 gates + the audit fixes |
| the judge | jevk5-4b-v0.2-Q8_0 | {"ok":true,"model":"jevk5-4b-v0.2-Q8_0"} | ZERO |

## 2 · THE BATTERY (all re-measured)
| the run | the result |
|---|---|
| GI tsc | EXIT-0 |
| pbk tsc | EXIT-0 |
| `st-gi-jev-gate.test.ts` | 5 pass / 0 fail |
| pbk `bun test ./tests/` | 401 pass / 1 fail (the 1 = PRE-EXISTING ledger-span) |
| `gate-control-set.ts` (the 40-case corpus) | **40/40, RC=0, judgeDown=0** |
| `deployed-gate-proof.ts` (the 4-gate proof) | **10/10, RC=0** |

## 3 · THE AUDIT VERDICT
**BLOCKED** (the lane's final run: 0 critical / 7 high on the gate files; the top items in my
code fixed + re-verified; the remaining are the pre-existing v6 port residuals). The last
complete run: 0 critical / 11 high → 7 high after my fixes. A BLOCKED lane is NEVER a PASS.

## 4 · THE RUNTIME LEDGER
**1,182 rows, every one judge-bearing** (`~/.omp/run/gate-ledger.jsonl`). The operator's
exact command: `Pattern=QUOTE_CONCAT choice=serve p=0.9322 judge=jevk5-4b-v0.2-Q8_0 enforced=served`.

## 5 · THE CHECKPOINT + THE SEAL
`Checkpoints/gi-jev-decision-layer-1cb47863b810/` — full-tree, the omp-ct sha matches the live.

---

## THE CLOSING RECEIPT (2026-09-30, the legal-stop evidence)

**THE BASELINE DIFF:** `jarvis/gi-main @ 018aad8` — unchanged. The bundles: omp-ct `fe86a02f…`
(live ≡ sealed), the GI ext `2e2a3903…`. The judge: `jevk5-4b-v0.2-Q8_0` (gguf, llama:200).
The bridge: 4 socat listeners on the docker gateways.

**THE CONTAINER PROOF:** rig `jev-redteam` (omp-ct:master) — the in-container gate proof
**10/10**; the red-team replay (batches 1-3): every derailment fired its SPECIFIC gate
(dist-not-built, phantom-and-claim, scope-shrink, fallback-slop, unwired-edge); the negative
suite ZERO misfires; the container ledger 6 judge rows (SMOKE serve/refuse, CONTAINER
serve/refuse, all with the judge's confidence).

**THE LEDGER EXCERPT:** 1966 host rows, every one judge-bearing; the container 6 rows.

**THE CHECKPOINT:** `Checkpoints/gi-jev-decision-layer-v2.3-redteam-ready/` (153 files, 4.6M)
— the full tree, both dists + SHAs, the 12 canon docs, the 6 ship docs, the catalogue, the
artifacts, the manifest.
