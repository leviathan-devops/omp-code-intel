# MEASUREMENT_PLAN — M1-M12 (the no-guesses law, made operational)

**THE LAW (operator, verbatim):** *"2) get proper measurements for everything. no guesses"*
**THE SKILL:** `derive-runtime-measurements` — the 7-step meta-process this plan executes.
**THE STATUS FIELD:** each row carries its current value or `UNMEASURED` with the reason.

| # | WHAT | HOW (the instrument) | COST | BLOCKS | CURRENT |
|---|---|---|---|---|---|
| M1 | THE PRECISION CURVE per rule | 50+ real firings → oracle outcomes → Wilson per rule → derivePolicy | ~$0.003 | W6 | **PARTIAL: 14 cases, bestT=0.40, bestF1=0.933** |
| M2 | THE COST MATRIX | ★ THE OPERATOR: "when this rule is wrong, which error costs more, and by how much" per class | 1 question | W6 | **UNMEASURED — AWAITING THE OPERATOR** |
| M3 | THE FIRE FLOOR per rule | `firesNeededForGap(p, gap)` | 0 | W6 | **DERIVED: g=0.10 → n=49; g=0.15 → n=22** |
| M4 | THE CACHE HIT RATE | `count(cached)/total` over a session | 0 | W7 | UNMEASURED — needs a wired session |
| M5 | THE PER-FIRE TOKEN COST | Jev's `usage.input_tokens` p50/p95 vs the 18KB cap | 0 | W7 | UNMEASURED — needs a wired session |
| M6 | THE LATENCY p50/p95 | `row.latencyMs` over N fires | 0 | W7 | **PARTIAL: one probe at 790ms** |
| M7 | THE CONTEXT TRIM RATE | `count(ctx.trimmed)/total` | 0 | W7 | UNMEASURED |
| M8 | THE MPSE SETTLEMENT RATE | `count(questionVersion LIKE 'mpse%')/total` | 0 | W7 | UNMEASURED |
| M9 | THE FAIL-POLARITY RATE | `count(policyName LIKE '%+fail-%')/total` | 0 | W7 | UNMEASURED |
| M10 | THE ORACLE RESOLUTION RATE | `(confirmed+refuted)/total` | 0 | W6 | UNMEASURED — needs the oracle |
| M11 | THE FALSE-NEGATIVE CLASS | ★ SAMPLE the IGNORE rows and label them — the ONLY view of what the gate silently lets through | human review | W7 | **UNMEASURED — AWAITING A SAMPLING SESSION** |
| M12 | THE STARVATION CHECK | `count(band='act')/total` — 0 means the bar is too high | 0 (the health gate) | W7 | **MEASURED: the act band fired 0 times at the seeds** |

## THE THREE THAT DECIDE EVERYTHING

```
M1 THE CURVE the instrument exists; it needs 50 firings through a wired
  path
M2   THE COST MATRIX    ★ YOURS — every derived threshold waits on it
M11 THE FALSE NEGATIVES ★ the class nobody measures, because an ignored
  fire leaves
                          no trace except an IGNORE row
```

## THE COST TO CLOSE M1-M3

```
~50 fires ≈ $0.003 + one question to the operator.
The remaining rows (M4-M10, M12) are counters over rows that already exist
  once W1 lands.
```

## THE METHOD (per row, the skill's 7 steps)

```
1 NAME IT as an answerable question ("what is the cache hit rate?" not "is
  it fast")
2 THE DENOMINATOR (hits/total FIRES, not hits/total calls)
3 THE INSTRUMENT (a counter over the ledger — code, not prose)
4 RUN ON REAL DATA + PASTE (a wired session, the raw rows)
5 CONFRONT WITH THE ASSUMPTION (the bible says 60-80% for the cache — is
  it?)
6 DERIVE, DON'T CHOOSE (the number comes from the counter)
7 RECORD + THE COST OF ERROR (a wrong cache expectation costs re-pays)
```
