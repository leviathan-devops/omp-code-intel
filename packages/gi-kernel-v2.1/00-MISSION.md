# 00 — MISSION

## THE MISSION, VERBATIM (operator, 2026-09-21)

```
looks good /skill:runtime-grade mint the full runtime grade build package
```

With the two rulings that shape it, verbatim from the same turn:

```
"1) both"                                        — the fire gate sits BOTH before the
                                                   act AND as a filter on the
                                                   detector's output
"2) get proper measurements for everything. no guesses"
```

And the scale envelope, verbatim from the turn before:

```
"each fire should be < 5000 tokens of data realistically. these are high frequency
 micro decisions not big macro spec level deicsions we should absolutley be able
 to fit this into 5k tokens per kernel fire. we can safely assume this fires 100
 times per session across 5 parallel session per day = 500k tokens a day, costs me
 literally 2 cents."
```

## RESTATED UNDERSTANDING

Build **GI Kernel v2.1** — the Jev-in-the-loop runtime kernel — as a **runtime-grade**,
container-verified production package. v2.0 detects; v2.1 **adjudicates**: every detector fire
passes a gate that spends at most one Noul (<5000 tokens) deciding whether the SHAPE was a REAL
violation given the context, and routes to FIRE / ESCALATE / IGNORE under a **named policy whose
numbers are DERIVED from a measured precision curve plus the operator's stated cost posture —
never chosen**. The gate sits in BOTH positions the operator ruled: a pre-act advisory (fail-OPEN)
and a post-detector filter (per-surface polarity). Every decision leaves a row carrying the
threshold in force and a `laterTruth` slot only the oracle may fill, so the system calibrates over
time instead of freezing at its seeds.

## SCALE CLASS

`system` — 3 new modules (~720 L), 2 modified (kernel-v2, the gate path), 1 new ledger table,
1 new test file, 7 package documents, and one sealed ship package. The blueprint (862 L) exists.

## THE NON-NEGOTIABLES

```
· NO GUESSES — every threshold derived from a measured curve + the operator's cost matrix
· the gate in BOTH positions (pre-act advisory + post-detector filter)
· <5000 tokens per fire (the 18KB state cap, measured as M5)
· one snap judgment per question; never a composite (bible D006)
· the state is the EVIDENCE only — no conversation, no instructions (bible D004)
· the fail polarity is PER SURFACE (D010): dumb OPEN, theatrical/destructive CLOSED
· `laterTruth` written "unresolved" at firing time — only the oracle changes it (§6.4.7)
· every fire leaves a row; a fire with no row cannot be calibrated or audited
· the cache key is the CANONICAL STATE; a question edit is a NEW instrument (D013/L12)
· ENGINES BEFORE REGISTRATION — with L1..L5 ENOENT and JEV absent, STAGE 0 refuses everything
```

## THE FORBIDDEN LIST

```
· a chosen constant shipped unlabelled (the 2x error, EN-047)
· a threshold applied globally across asymmetric costs
· a silent pass on a missing answer (UNCERTIFIABLE is not a pass)
· a budget overrun that degrades to "skip the judgment" (it THROWS)
· a source-file mutation as a mutation test (F-51: the module-instance split)
· a host battery published as a property of the code (the container law, F-53)
· a checkpoint saved before the artifact it certifies (the refresh lesson, c329f83)
```

## OPEN QUESTIONS (max 5, only unresolvable ones)

```
Q1  M2 — THE COST MATRIX. "When this rule is wrong, which error costs more, and by
    how much?" per class (destructive/dumb/theatrical). Every derived threshold waits
    on it. THE OPERATOR'S — it is a taste/risk call, not a measurement.
Q2  E1 — THE ORACLE'S ENGINE. Jev / MPSE-only / JESL. The oracle.ts seam takes
    whichever; the choice decides whether 3.0 has a model in its adaptation path.
Q3  THE ESCALATE TARGET. A human queue, a bigger model, or a re-ask with better
    evidence? The blueprint names three options and picks none.
Q4  THE POLARITY ON A JEV OUTAGE, globally. The build implements the R5 surface
    split (per-surface); the operator may overrule to fail-closed everywhere.
Q5  THE WIRING WINDOW. When to register the gate in the live extension — after
    which engines? Registering before them refuses every tool call on this host.
```
