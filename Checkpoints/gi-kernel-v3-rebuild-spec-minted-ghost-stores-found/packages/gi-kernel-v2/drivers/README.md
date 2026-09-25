# DRIVERS — the executed end-to-end runs

## sc8-reflex-loop.ts — SC-8's runnable half

Runs ONE firing through the FULL v2 path: the kernel stages → the two-layer
enforcement → the reflex write → the append-only ledger → the supersede.

**HONESTY, stated in the file itself:** the JUDGE and the LOAD UNIT are STUBS (no
TypeSafe key on this host). The MACHINERY is the real code path; what is substituted
is the model, at the declared DI seam. This is a machinery proof, NOT a live-Jev proof.

Run:  bun packages/gi-kernel-v2/drivers/sc8-reflex-loop.ts

Measured output (2026-09-21):
```
STAGES 0:PREFLIGHT=UP 1:CLASSIFY=OK 2:BIND+INDEX=OK 3:DETECT=SIGNAL
       4:KERNEL=VIOLATION 5:VERDICT=REFUSE 6:RECORD=WRITTEN
KERNEL verdict=REFUSE class=theatrical code=GI_FABRICATED_CLAIM
LEDGER confirmed=1→2→3  unresolved=1→2→3
RSI    precision=1.000 fires=2→4→6 → tier=HOLD→REFLEX→REFLEX
SUPERSEDE  HOLD → REFLEX, live=rsi-2, history=2 rows (append-only)
SC8-EXEC-OK final_tier=REFLEX
```

**A stub inconsistency, disclosed:** the kernel's theatrical detector saw `spans=0`
(the real state) and fired; the close layer's stub load unit returned one span and
PASSED. The two layers disagreed because MY fixture gave them different evidence —
not because the code is wrong. A live run with a real load unit would give both the
same spans.
