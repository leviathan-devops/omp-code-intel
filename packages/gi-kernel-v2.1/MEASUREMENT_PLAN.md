# MEASUREMENT_PLAN — M1-M12 (the no-guesses law, made operational)

**THE LAW (operator, verbatim):** *"2) get proper measurements for everything. no guesses"*
**THE SKILL:** `derive-runtime-measurements` — the 7-step meta-process this plan executes.
**THE STATUS FIELD:** each row carries its current value or `UNMEASURED` with the reason.

| # | WHAT | HOW (the instrument) | COST | BLOCKS | CURRENT |
|---|---|---|---|---|---|
| M1 | ★ THE PER-CLASS CURVE (a POOLED number hid three different classes — see W6_CALIBRATION_FINDING.md) | 50+ real firings → oracle outcomes → Wilson per rule → derivePolicy | ~$0.003 | W6 | **MEASURED THROUGH THE WIRED PATH (2026-09-21): 14 paired cases fired LIVE (8 real / 6 fp), 14 rows written AND stored. bestT=0.35 → F1=0.889, P=0.800, R=1.000. Per rule: theatrical 3C/2R · dumb 3C/2R · destructive 2C/2R. Instrument: `packages/gi-kernel-v2.1/tools/measure-campaign.ts` → `campaign-report.json`**  ★★ TWO RUNS, DIFFERENT CORPORA, DIFFERENT ANSWERS — AND THE DISAGREEMENT IS THE FINDING: the W7 campaign (14 cases) gave bestT=0.35, F1=0.889, P=0.800; the W6 run (48 cases, systematic pairs) gave a POOLED precision of 0.500 that HID three different classes (two separable, one inverted). ★ MEASURED PRECISION IS CORPUS-DEPENDENT, so NEITHER number is 'the' precision — and the SMALLER corpus produced the more flattering one. A precision must be reported PER CLASS, with its corpus named. |
| M2 | THE COST MATRIX | ★ THE OPERATOR: "when this rule is wrong, which error costs more, and by how much" per class | 1 question | W6 | **UNMEASURED — AWAITING THE OPERATOR. ★ ITS CONSEQUENCE IS NOW MEASURED: the shipped posture (block 4x) puts the bar at 0.80, and at 0.75 the `dumb` seed fires on only 2 of 8 REAL violations (R=0.250). The measured optimum is t≈0.35–0.40 (F1=0.889, R=1.000). The matrix does not change what is TRUE; it chooses which error the operator prefers to pay for.**  **★★ AND THE W6 RUN SHOWS THE MATRIX IS NECESSARY BUT NOT SUFFICIENT: it moves the CUT along the curve, and on a NON-DISCRIMINATING class NO cut helps. PER CLASS, MEASURED (48 live fires): destructive REAL[0.77-0.78] vs FP[0.15-0.17] → SEPARABLE, any t in (0.17,0.77) perfect · dumb REAL[0.51-0.53] vs FP[0.42-0.45] → SEPARABLE, any t in (0.45,0.51) · theatrical REAL[0.38-0.48] vs FP[0.40-0.52] → ★ INVERTED, NO threshold works. See W6_CALIBRATION_FINDING.md.** |
| M3 | THE FIRE FLOOR per rule | `firesNeededForGap(p, gap)` | 0 | W6 | **DERIVED: g=0.10 → n=49; g=0.15 → n=22** |
| M4 | THE CACHE HIT RATE | `count(cached)/total` over a session | 0 | W7 | **FLOOR MEASURED: 0 hits / 14 fires. A FLOOR, not the rate — the campaign is ONE process with 14 DISTINCT states, so the cache had nothing to hit. The real rate needs a session where the same state recurs.** |
| M5 | THE PER-FIRE TOKEN COST | Jev's `usage.input_tokens` p50/p95 vs the 18KB cap | 0 | W7 | UNMEASURED — the campaign records latency, not usage; the judge does not surface `usage` on its answer path. Closing this needs a JevJudge change (an instrumentation gap, NAMED not hidden).  ★★ NOW MEASURABLE (EN-074): `buildState` carries `context_meta.serializedBytes` and `estTokens` on EVERY fire and `overTarget` against the SOFT TARGET (STATE_BYTE_CAP = 18,000 bytes ≈ 4,500 tokens). M5 reads those fields instead of estimating. MEASURED so far: a small fire is under target; a MAXIMAL stream (500 records + a 5,000-char evidence) serializes to 22,914 bytes ≈ 5,729 tokens with overTarget=TRUE — REPORTED, never trimmed away. ★ AND THE RULING: the <5000-token figure is a SOFT TARGET, not a hard cap — a target you may not discard substance to reach. |
| M6 | THE LATENCY p50/p95 | `row.latencyMs` over N fires | 0 | W7 | **MEASURED (n=14, live): p50=331ms · p95=748ms on run 1; p50=328ms · p95=1351ms on the immediate re-run. ★ THE VARIANCE IS THE FINDING: the p50 is stable to 3ms while the p95 nearly DOUBLED between two runs five minutes apart. A p95 from one run is not a constant, and a latency budget must be set against the worst observed, not the first observed. Compare the prior single probe at 790ms — it sat between the two runs' p95s, which is exactly why one probe is not a measurement.** |
| M7 | THE CONTEXT TRIM RATE | `count(ctx.trimmed)/total` | 0 | W7 | **MEASURED: 0 trimmed / 14, 29 slots total (~2 slots per fire). The 18KB cap never bit — these contexts are small. The cap's REAL test is a live session whose stream is large; this corpus does not exercise it.** |
| M8 | THE MPSE SETTLEMENT RATE | `count(questionVersion LIKE 'mpse%')/total` | 0 | W7 | **MEASURED: 0 settled / 14 fired = 0.0% MODEL FIRES = 14. ★ THE CHEAPEST LAYER CONTRIBUTED NOTHING on this corpus. Two candidate causes, distinguished by the rule set: the corpus contains no EMPTY-evidence firing and no target appearing only in negated slots — or the two MPSE rules are too narrow to catch the shapes that actually occur. The first is checkable (the corpus is chosen); the second is the real risk.** |
| M9 | THE FAIL-POLARITY RATE | `count(policyName LIKE '%+fail-%')/total` | 0 | W7 | **MEASURED: 0 degraded / 14 = 0.0%. A clean run — the failure path was never taken, which means the DEGRADATION HANDLING (EN-056/EN-057) is proven only by test, not by this campaign. It needs a dedicated outage run to be runtime-proven.** |
| M10 | THE ORACLE RESOLUTION RATE | `(confirmed+refuted)/total` | 0 | W6 | **MEASURED ON THE CORPUS: 14/14 resolvable (the campaign labels ARE the ground truth: 8 confirmed / 6 refuted). NOT MEASURED: the rate against the REAL downstream evidence gatherers of W2 — that needs a session producing genuine later-edits, test-runs, withdrawals and permits. The two are different numbers and must not be conflated.** |
| M11 | THE FALSE-NEGATIVE CLASS | ★ SAMPLE the IGNORE rows and label them — the ONLY view of what the gate silently lets through | human review | W7 | **UNMEASURED — AWAITING A SAMPLING SESSION** |
| M12 | THE STARVATION CHECK | `count(band='act')/total` — 0 means the bar is too high | 0 (the health gate) | W7 | **MEASURED AGAIN THROUGH THE WIRED PATH: 0 act rows of 14 → STARVED=TRUE. Reproduces the prior finding on a different corpus and a different code path, which upgrades it from an observation to a PROPERTY of the shipped seeds.** |

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
