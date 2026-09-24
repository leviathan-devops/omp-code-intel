WAVES: 4
# the cleanup wave plan — derives from CLEANUP_SPEC.md §5 (the binding authority)
W1 the honest register   | scripts/goal-verify.ts + scripts/consumption-audit.ts      | FR-1
W2 the diverse ledger    | tests/st-runtime-diversity.test.ts (NEW) + src/omp (if needed)| FR-2
W3 the whole-tree audit  | artifacts/ (the new audit JSONs)                            | FR-3 FR-4
W4 the container ceiling | scripts/container-substrate-payload.sh + phaseE-kev.json    | FR-5
