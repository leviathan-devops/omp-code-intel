# THE SECOND OPERATOR — the P4 zero-context doc-sufficiency test

**Dispatched:** 2026-09-21 · **Duration:** 8m53s · **Agent:** `SecondOperator` (a `task`
subagent, NO prior context, given ONLY the eight documents listed in its brief).
**Verdict:** **8 ops executed · 6 SUFFICIENT · 2 GAP · 9 documentation gaps.**

The pin's rule: *"THE SECOND OPERATOR: a zero-context subagent, given ONLY the docs, must
operate it."* This is the record of whether it could.

---

## THE OPS

```
OP-1  the one-sentence purpose + the two positions                    SUFFICIENT
OP-2  the battery command                                             ★ GAP
OP-3  the named test `test_ledger_row_written`                        ★ GAP
OP-4  the ledger table, its file, and the RUNTIME path                ★ GAP
OP-5  the `act` threshold + a policy edit without re-inference         SUFFICIENT
OP-6  the AUDIT GATE verdict                                          NOTE (a tension)
OP-7  which waves are CLOSED and which is BLOCKED                      SUFFICIENT
OP-8  ★ THE DOC-ONLY CHALLENGE: write + run a fire from the docs      ★ GAP — THE DECISIVE ONE
```

## ★ OP-8 — THE DECISIVE GAP (verbatim from the operator's own reasoning)

> "The docs say `judge.evaluate(state, questions)` returns answers, but the stub returns a
> `Record<string, unknown>` object, while the gate expects an array (`.find()` is called).
> … The stub return shape is NOT documented."

**The operator SUCCEEDED — but only by reading `src/omp/fire-gate.ts` to infer the return
contract.** The brief forbade reading source for intent, and the operator reported the breach
itself. **A doc-only operator could not have built this.** The §8.3 "FORKABLE SHELL" was not,
in fact, forkable: it imported the real `JevJudge` and never stated what a stub must return.

## ★ OP-3 — A PHANTOM TEST FILE (verbatim)

> "The docs reference `tests/st-gi-v2.1-firegate.test.ts` but it doesn't exist with that exact
> name. … The actual files use `v21` (no dot)."

**CONFIRMED AT SOURCE, in THREE documents:** the spec §8, `00-INDEX.md:59`, and
`06-WAVES.md:15` all named a test file that does not exist. The real W1-W5 gate is covered by
five files: `st-gi-v21-{ledger,oracle,advisory,wiring,policy}.test.ts`.

## ★ OP-2 — THE RUN LOCATION

The operator ran `bun test ./tests/` from inside `packages/gi-kernel-v2.1/` (where the docs
live) and got "no tests found" — because `src/` and `tests/` are at the REPO ROOT. **No doc
stated the working directory.**

## ★ OP-3b — `-t` MUST BE FILE-SCOPED (measured by the operator)

> `bun test -t test_ledger_row_written` (bare) ⇒ **308 lines** of module errors from
> `Checkpoints/`
> `bun test -t test_ledger_row_written ./tests/st-gi-v21-ledger.test.ts` ⇒ **1 pass / 0 fail**

## ★ OP-4 — THE RUNTIME LEDGER PATH

The docs name the INSTRUMENT's ledger (`tools/campaign-ledger.sqlite`) but never state where
the KERNEL writes its own. (`FireGateConfig.ledgerPath` is declared and never consumed; the
path is the `FireLedger` constructor's argument, and the caller chooses.)

## NOTE — OP-6: A REAL TENSION THE OPERATOR SPOTTED

`PACKAGE_AUDIT.md` says **"PACKAGE_AUDIT: PASS (after remediation)"** at line 12, while its
own §"WHAT THIS AUDIT DOES NOT CERTIFY" says **"THE AUDIT GATE READS FAIL"**. A reader cannot
tell which verdict is live. Both are TRUE and about different things (the PACKAGE sealed
cleanly; the INDEPENDENT AUDIT did not reach zero) — but the docs did not say so plainly.

---

## THE FIXES APPLIED (the P4 gate is not green until a zero-context operator can operate it)

```
1  §8.2.1 added to the BLUEPRINT — THE JUDGE CONTRACT + THE FIRE CONTRACT, with a stub
   example, the run location, and the ledger-path rule.
2  §8 of the SPEC — the phantom filename CORRECTED (three docs), the RUN LOCATION stated,
   and the `-t` FILE-SCOPING rule recorded with the operator's measured numbers.
3  00-INDEX.md + 06-WAVES.md — the phantom references corrected.
4  §8.2.1 also states where the RUNTIME ledger path comes from (the caller, not the kernel).
```

## WHAT THIS TEST PROVED

**The docs were ~75% sufficient and the missing 25% was exactly the part a forker needs
first.** Every gap was in the DO-IT layer: where to run, what a stub must return, which test
file exists. The DESIGN layer (why the kernel exists, what the two positions are, which waves
are closed, how a policy edit works) was fully sufficient — the operator answered those from
the docs alone.

★ AND THE OPERATOR FOUND A REAL DEFECT NO TEST COULD: **three documents naming a test file
that has never existed.** A test suite cannot detect a doc pointing at a phantom; only a
reader following the doc can.
