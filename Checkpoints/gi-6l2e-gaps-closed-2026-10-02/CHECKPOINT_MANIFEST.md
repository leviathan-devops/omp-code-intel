# CHECKPOINT — gi-6l2e-gaps-closed-2026-10-02

## The GOAL (all gates green)
Close the GI 6L+2E gaps: ALL 8 consumers CONSUMED on the SUBJECT UNION +
every ABIDE judge verdict lands a gate-ledger row with its scores.

## The gates (all PASS)
| Wave | test_id | gate | evidence |
|---|---|---|---|
| W1 L2 symbol-read | ST-1 | audit populateSessionStore -> L2 facts>0 | L2_ARSUMBRIS CONSUMED facts=50 |
| W1 test | ST-1b | bun test -t consume_arsumbris | 2 pass 0 fail 103 expect |
| W2 subject-matrix | ST-2 | >=3 per-subject rows + union | 6 rows + union=8/8 |
| W3 C2KG edges | ST-3 | edges>0 | edges=411; L4 CONSUMED facts=13 |
| W4 ABIDE observability | ST-4 | a ledger row Pattern=ABIDE_JUDGE | p=0.703 ABIDE-R1=0.703 R2=0.659 R3=0.407 |
| W5 union + seal | ST-5 | union==8/8 + sha-match | PREDICATE PASSED; 73e907fffa6647d1==source |

## Deployed / source
- deployed: 73e907fffa6647d18d56f964205a40d71a9efb50f298addf6ce3d4a18acafb53
- source  : 73e907fffa6647d18d56f964205a40d71a9efb50f298addf6ce3d4a18acafb53
- match   : YES
- GI HEAD : 6d9ba16 feat(gi): W3 — C2KG index gains edges (411) + the adapter reads them (L4 CONSUMED facts=13 on an edge subject)

## The 3 source changes
1. src/omp/adapters/arsumbris.ts — the L2 file-space read (facts() answers symbol subjects).
2. scripts/au-read.ts — per-read field mapping + type-field omission (files/types/hubs grammar).
3. src/omp/adapters/c2kg.ts + .c2kg/index.json — the edge read (411 edges from the structural store).
4. scripts/consumption-audit.ts — the per-subject matrix rows.
5. tests/st-gi-6l2e.test.ts — the L2 symbol-read TDD tests.

## Honest remainder
- src/omp/populate.ts is NOT a c2kg index symbol (the index indexes packages/tests/scripts/.trident + some src); added via the structural references, not the Bevy generator (absent on this host).
- The deployed bundle is live only after an omp RESTART (operator-owned).
