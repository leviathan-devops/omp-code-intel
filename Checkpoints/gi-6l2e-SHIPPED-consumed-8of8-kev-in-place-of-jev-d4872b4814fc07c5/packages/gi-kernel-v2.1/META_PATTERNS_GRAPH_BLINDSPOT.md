# META-PATTERNS — THE GRAPH BLINDSPOT CLASS (2026-09-22)

**Extracted from:** the derailment ledger (7 entries) + the seven audit passes (~90 findings).
**Purpose:** name the recurring failure modes so the KERNEL detects them mechanically instead of
a human finding them by hand.

## PATTERN TABLE

|#|META-PATTERN|HOW IT APPEARS|THE MECHANICAL SIGNATURE|WHICH LAYER CATCHES IT|
|---|---|---|---|---|
|MP-1|**THE PRODUCER-LESS CONTRACT**|a type functions accept; nothing constructs it|in-degree 0 on a consumed type|graph (L5/L6) → MPSE rule, $0|
|MP-2|**THE DEAD DECLARATION**|a config field with a comment promising consumption; zero readers|in-degree 0 on a declared field|graph → MPSE rule, $0|
|MP-3|**THE STALE INSTRUMENT**|a store built once, consulted after N commits|`populated_at` < HEAD|the EXISTING freshness gate — on the CONSULT path|
|MP-4|**THE UNWIRED GRAPH**|populate runs > 0, consults == 0|a counter pair|the register's own counters|
|MP-5|**THE GUARD INCONSISTENCY**|one mutation, N call sites, N different guards|N>1 call edges into a mutation|closure-level graph (NOT method-level)|
|MP-6|**THE SELF-MEASURING FUNCTION**|a measurement written into the object it measures|a cycle: field ∈ its own computation|data-flow analysis|
|MP-7|**THE CEREMONY**|an instrument invoked to satisfy a gate; no decision derived|query issued, no citation|a gate rule requiring the RESULT be cited|
|MP-8|**THE SILENT TOOL**|`str.replace` unchanged; fixes reported as landed|the edit's post-state ≠ its intent|a post-edit ASSERTION on every scripted edit|
|MP-9|**THE REPORT/WORK DIVERGENCE**|the narrative says done; the artifact says not|claim with no artifact binding|the audit — the only detector that found it|
|MP-10|**THE FIX-COMPOSITION DEFECT**|two correct fixes compose into a new failure|shared/cached artifact without re-derived eviction|a RE-VERIFY pass — no single-pass detector|

## THE ROOT — ONE SENTENCE

> **I PRODUCED CONFIDENT NARRATIVES WHERE MECHANICAL CHECKS WERE AVAILABLE.**
>
> The kernel is a mechanical-check engine. The graph layers are its eyes. I used the graph
> as a REGISTRATION PRECONDITION — a substrate to satisfy a gate — instead of as the INPUT
> TO EVERY DECISION. That is the category error under all ten patterns.

## WHAT THE KERNEL ALREADY HAS vs WHAT IT USES

```
HAS                                          USES
────                                          ────
the 6 graph layers (L1-L6)                      as a gate to satisfy  ← THE ERROR
the typed store with layer_id namespacing       0 consults this session
storeFreshness + populated_at (typed-write.ts)  on the POPULATE path only, never on consult
MPSE — the $0 settlement layer                  2 rules; NEITHER consults the graph
the pre-act advisory (W3, position A)           asks Jev; runs NO deterministic check first
the audit loop (7 passes)                       the ONLY structural detector — and it costs
                                                a model call per file per pass
```

## THE COST, MEASURED

```
7 audit passes · ~90 findings · 2 CRITICAL-class runtime defects · 70+ model calls
THE SAME STRUCTURAL CLASSES RECURRED AT EACH PASS: the eviction inconsistency appeared in
pass 6, was "fixed", and reappeared in pass 7 as a HIGH. A graph-asserted PRE-ACT check would
have REFUSED the edit that created it — at $0, before the edit existed.
```
