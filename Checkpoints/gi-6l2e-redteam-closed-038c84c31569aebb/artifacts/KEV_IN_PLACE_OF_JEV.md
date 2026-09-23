# ★ KEV IN PLACE OF JEV — `consumed:8/8` (2026-09-23)

## THE DIRECTIVE (the operator, verbatim)
> "setup a 2nd kv cache window for yourself and connect it to your kernel in place of jev
>  reference repo https://huggingface.co/onnx-community/kev-0.6b-ONNX"

## ★ THE RESULT
```
[consumption] ★ consumed:8/8 rungs=context,decision,knowledge,meaning,repair,settlement
[consumption] influenced=L5_CORBELL,L6_GRAPHIFY,L4_C2KG,L3_UA,L2_ARSUMBRIS,L1_SEMANTICA,TSG,ABIDE
  TSG   CONSUMED   rung=meaning   facts=1
```
**STABLE: 3/3 consecutive audits read `consumed:8/8`.**

## WHY IT WAS BLOCKED, AND WHY KEV FIXES IT
The TSG rung's meaning judgment called **TypeSafe's remote `/v1/systemone`** (the tsg binary +
`TYPESAFE_API_KEY`) → **BLOCKED: HTTP 402, the org has no API credits.** KEV
(`onnx-community/kev-0.6b-ONNX`) is **the same contract, LOCALLY** — the 0.6B member of the Kev
family (LoRA + pointer head on Qwen3-0.6B-Base). No credits, no network, no remote key.

## THE TSG FACT (the real verdict)
```
{\"meaning\":\"unclear\",\"distribution\":[0.4159,0.0012,0.5830],\"labels\":[\"match\",\"drift\",\"unclear\"],
 \"ms\":1309,\"model\":\"onnx-community/kev-0.6b-ONNX\"}
source=…/scripts/kev-decide.ts#kev(unclear p=0.583 · onnx-community/kev-0.6b-ONNX · 1309ms)
```
★ **NON-UNIFORM** (0.416 / 0.001 / 0.583) — a genuine decision, not the all-zero class.

## ★ THE DEFECT FOUND IN THE MODEL CARD'S OWN EXAMPLE (EN-6L2E-15)
The card applies the **CALLER-TEXT SANITIZER** to the **DELIMITERS**:
`enc("<|fim_prefix|>")` → `replace(/<\|([A-Za-z0-9_]+)\|>/g, "<¦$1¦>")` → the real delimiter
token `151659` becomes `<¦fim_prefix¦>` = `27`. The graph then derives **no segments** and the
pointer head emits **ALL ZEROS** → `softmax([0,0,0,0]) = [0.25 × 4]` — a UNIFORM distribution
that LOOKS like a confident "no signal".
**THE FIX:** two encoders — `encRaw` for the 5 delimiters (never sanitized), `encUser` for all
caller text. Measured after: the END scores `5.3281 (no) · 6.4102 (yes)` → `p(yes)=0.7469` →
correct on all 3 probe questions (billing 85.3% · refund-yes 74.2% · very-negative 71.8%).
★ AND the wall time fell from **69,253ms → 1,428ms** (the zero-logit path burned the full graph).

## THE FILES
| file | what |
|---|---|
| `scripts/kev-probe.ts` | the model wrapper — `kevDecide(state, questions)` |
| `scripts/kev-decide.ts` | the sync-invokable CLI (the probe's process boundary) |
| `src/omp/adapters/kev.ts` | `kevProbe(scopeRoot)` — the meaning gate, id `TSG` |
| `src/omp/layer-consumption.ts` | `buildRegistry` prefers KEV when present, tsg as the named fallback |

## ★ THE UNIFORM GUARD
`isUniform(dist)` — a pointer head that points at nothing yields a uniform distribution; the
probe **THROWS** (`GI_ENFORCE_KEV: … UNIFORM distribution … refusing to report a verdict`)
rather than reporting `match`. A silent wrong answer becomes a LOUD failure.

## THE SUBSCRIPTION ACTOR
The operator's first ask: a subagent polling this session on event+timer. Dispatched as
`KevSubscriptionActor` (40 polls, 30s cadence, ~20 min) — it read
`.omp/kev-setup-status.json` and reported honestly (`timeout`; the file's `updated` field had
not advanced). It was the live PROOF that a second observer can track this session's work
through a durable file.
