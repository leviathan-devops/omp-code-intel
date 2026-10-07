# CHECKPOINT STRUCTURE — gi-kernel-v2.3-reflexive-kernel-4694b1323fcc6887
| path | what | count |
|---|---|---|
| src/ | the full source tree | 120 .ts |
| extensions/graph-intelligence/index.js | the deployed bundle (the artifact) | 817806 B |
| DIST.SHA256 | the artifact hash (the truth) | 1 |
| context_management/ | the 11 canon docs | 11 |
| BUILD_REPORT DEBUG_LOG FAILURE_LOG SPEC_VIOLATION_LOG TESTING_LOG RECEIPT-V2.3.md | the 5 ship docs + the receipt | 6 |
| .omp/container-test-results.json | **THE REFLEX PROOF** (3 scenarios, all PASS) | 1 |
| wave-audit/ | the desk verdicts + the coverage map | 1+ |
| packages-gi-kernel-v2.3/ | the build package (the spec + the wave plan + the goals) | the package |
| CHECKPOINT_MANIFEST.md + CHECKPOINT_STRUCTURE.md | this seal | 2 |

## THE FILE-BY-FILE INVENTORY (the V2.3-changed surface)
| the path | the change | the proof |
|---|---|---|
| src/hunter/firewall/readonly.ts | the W6 sweep (9 fixes / 10 passes) | the 10-probe corpus: 0 leaks / 0 misfires |
| src/hunter/graph/corbell-adapter.ts | the scope-law `..` refusal + the desks' 6 + the WALK_SKIP import | tsc + the corbell probe 16/0 |
| src/hunter/graph/mechanical.ts | the constructor blindness (x2) + the desks' 4 | the mechanical probe 16/0 |
| src/hunter/shared/db.ts | the staged rebuild + the temp view + the edge anchors | the store suite + the concurrency probe |
| src/hunter/hooks/bus-hook.ts | the desks' bus family (10 markers) | the bus suite |
| src/hunter/harness/hunt-lock.ts | the isPidAlive fail-CLOSED | tsc + the lock suite |
| src/hunter/diagnostics/semantic-predicates.ts | the infra-throw (SEMANTIC_ANCHOR_INFRA_FAILED) | tsc + the semantic suite |
| src/hunter/diagnostics/engine.ts | S5: LOCAL_BUILD_SKIPS = the shared WALK_SKIP | the engine suite 1/0 |
| scripts/semantica-ingest.py | S5: the mirror aligned to the shared law | python -m py_compile OK |
| scripts/gi-lsp.ts | the V2.3 LSP server (the reflex surface) | the sandbox: the spawn + the diagnostics |
| tests/st-hunter-live.ts | the store-path resolver (the two-spellings defect) | 5 pass / 0 fail |

## THE VERIFICATION COMMANDS (copy-paste)
    cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
    bunx tsc --noEmit                 # EXIT-0
    bun run test                      # 466 + 564 pass / 0 fail
    bun scripts/graph-health.ts .     # EXIT-0 — every layer >=90%
    bun scripts/gi-lsp.ts --selftest src/hunter/profile/source-roots.ts   # EXIT-0 (20 tokens)
    grep -ri trident src/ scripts/ | wc -l    # 0

## THE SEAL'S PROVENANCE
- the seal mode: FULL-TREE (src + dist + SHA + the canon + the ship docs + the receipt + the CT
  artifact + the wave audit + the package + this seal) — ONE mode
- the dist sha256 is recorded in DIST.SHA256 and MATCHES the deployed bundle
- the src count MATCHES the repo (120 = 120)
