# V21 DESIGN REWORK PLAN — the 15 design-level defects, fixed at the root

Discipline: TDD (test first, watch it fail, minimal fix, watch it pass). No patch-on-patch.
Each defect gets a regression test that FAILED before the fix and PASSES after. The battery
is the only green-light. Ship = full battery + rebuild both dists + deploy + frozen-tree rescan.

## Root causes (not symptoms)

1. **Label-keyed identity** — every traversal (whoCalls/impact/blastRadius/chain/safeDelete)
   joins on `label = ?`. Two distinct functions named `init` in different files are ONE identity.
   FIX: resolve symbol → canonical_ids first; traverse edges by canonical_id; rows carry
   canonical_id. Labels become display-only.
2. **REPLACE-vs-tombstone** — `INSERT OR REPLACE ... superseded_run=NULL` deletes the prior
   live row (history gone, PK churn). FIX: on conflict, tombstone the old row
   (superseded_run = incoming run) then INSERT the new row with its own created_run.
   Versioned history preserved by construction.
3. **Untransacted batch writes** — batch writers must refuse to run outside a transaction
   (loud), so a mid-batch failure can never leave a half-store. supersedeThenInsert owns
   the txn; standalone call sites are removed or wrapped.
4. **Traversal correctness** — BFS marks visited on ENQUEUE (never re-enqueue); blast-radius
   rewritten without the CROSS-JOIN fan-out.
5. **Auditor correctness** — grep gets `--` before the pattern (flag injection dead); search
   failure is LOUD-skip (never dead-code evidence); DFS uses proper on-stack cycle detection;
   unwired() enforces the DeadNode contract (lineless = named refusal, parity).
6. **Pool contract** — ONE shared machine-wide DB (session pinning removed); classifier is
   ordered (contract → rejected → server 50x → quota) with no regex overlap; window parser
   gains hr-dialects and clamps [1min, 30d]; redaction covers api_key/apikey JSON shapes.
7. **TOCTOU class** — corbell re-stats the warm store after read (changed-mid-read = loud);
   adapter file projection is root-contained.

## Order (blocking → simple)

W1 identity · W2 tombstone · W3 txn guard · W4 BFS · W5 blast · W6 grep · W7 DFS ·
W8 search-failure · W9 unwired · W10 pool · W11 corbell · W12 adapter containment.

## Verification

- Per-defect: the new test fails BEFORE the fix, passes AFTER (pasted in the wave record).
- Full 19-file battery green after each workspace (no stacked unproven fixes — EN-020 lesson).
- Rebuild GI + trident (NODE_PATH), deploy both rigs, TUI legs re-proof.
- FINAL GATE: one rescan on the FROZEN tree. Whatever it returns is triaged:
  fix-now (bounded, only on my own new code) vs accepted-debt (operator-ruled). No more
  fix→rescan→fix loops: the frozen-tree rescan is the verdict, not a new work order.
