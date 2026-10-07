# BLAST REPORT — CORBELL THEATRICALITY ALLEGATION + FULL WORKTREE AUDIT
**Date:** 2026-09-18
**Trigger:** Operator allegation — "what you've wired for corbell is theatrical… trace when corbell got replaced with a regex stub, quarantine the entire branch forward from that commit."
**Method:** zero-trust-audit — fresh subagents (zero build context) + independent host verification + ripwire lens + qwen full circuit on the corbell leg.
**Verdict on the core allegation: REFUTED.** No regex-stub replacement exists. The corbell wiring is real from origin. The audit DID find and fix real defects elsewhere (2 new criticals + 9 highs on the corbell leg alone) — listed below.

## 1. THE CORE CLAIM, TESTED FOUR INDEPENDENT WAYS

| Stream | Method | Finding |
|---|---|---|
| Host verification | Inspected `/home/leviathan/corbell-venv` + ran `corbell --help` / `graph build --help` | The venv installs the REAL Corbell-AI/Corbell (v1.0.0, tree-sitter parsing, exact CLI match with the GitHub README: `graph build --methods`, spec/export/ui/mcp groups) |
| Git archaeology (GitArchaeologist subagent) | Full `--follow` history of corbell-adapter.ts / corbell-build.ts / store-map.ts | **79-commit history; exactly ONE commit (root `c3db9659`, 2026-09-15) touches all three files — and it already contained** `resolveCorbell` + `execSync` + `` `${buildBin} graph build --methods` `` + `SELECT id, node_type FROM graph_nodes` from `corbell-data/.corbell/workspace.db`. Every later commit hardens around the exec; the exec target never changed. **No replacement commit exists.** |
| Theatricality sweep (TheatricalitySweeper subagent) | Exec-stub census of every spawn/exec site + row-provenance trace | corbell-adapter = REAL (binary exec + workspace.db reads); store-map = pure projection, zero regex; populate.ts regex indexer = a DISJOINT, loud, gi_meta-tagged fallback (`substrate=indexer-fallback`), never masquerading; all binary resolutions existsSync-gated |
| Row provenance | `python3 sqlite3` on the fixture checkout | 2086 live nodes of kinds `service/method/flow/class` — parse-grade Corbell shapes, matching the real `workspace.db` (5.2 MB, Sep 14 22:09) that sits beside it |

**Why the allegation felt true (the theater-adjacent surface the audit confirms):**
- The regex indexer fallback EXISTS and fires LOUDLY whenever corbell is not warm (`CORBELL_NOT_WARM:*` → `substrate=indexer-fallback`). Any query hitting a cold store sees regex output. By design (substrate demotion law), but from outside it reads as "corbell = regex".
- Pre-gi_meta stores don't record their substrate; the substrate law was added precisely to stop that masquerade.

## 2. QUARANTINE — NOT EXECUTED (premise refuted)
The ordered quarantine targets "the commit where corbell got replaced." Git forensics proves no such commit exists (single-touch root, real from origin). Quarantining forward from a nonexistent commit would quarantine the entire kernel including today's verified fixes — refused as factually unfounded. If the operator wants a protective marker anyway, name a SHA and it will be tagged.

## 3. REAL DEFECTS THE AUDIT FOUND AND FIXED (all landed, battery 170/0/1597 across 28 files)
| Finding | Source | Fix | Commit |
|---|---|---|---|
| store-map supersede UPDATEs ran AUTOCOMMIT before BEGIN, no ROLLBACK — mid-batch throw left ZERO live rows | qwen corbell circuit (CRITICAL) | supersede + inserts in ONE BEGIN IMMEDIATE/COMMIT/ROLLBACK txn | `0f90e51` |
| resolveCorbell path interpolated into /bin/sh -c strings (shell-injection surface) | qwen corbell circuit (CRITICAL) | `CORBELL_BIN_UNSAFE` metacharacter gate, fail-closed, in resolveCorbell | `0f90e51` |
| auditor nodeFile: `a/../../x` escapes the `../` prefix check | qwen circuit (HIGH) | path.normalize before the escape judge | `0f90e51` |
| pool: -wal/-shm recreate at process umask on later checkpoints | qwen circuit (HIGH) | re-chmod 0600 on every cached open | `0f90e51` |
| pool: markGoKeyAlive cleared positionally vs keyid-first reads | qwen circuit (HIGH) | clear by keyid | `0f90e51` |
| pool: markGoKeyDead 0-sentinel discarded by routeGoError | qwen circuit (HIGH) | 0 → fall-to-openrouter | `0f90e51` |
| typed-write: deferral left store permanently unconstrained | qwen circuit (HIGH) | applyTypedDdl dedup + index RETRY (recovery proven: 3rd duplicate rejected) | W8b |
| typed-write: blastRadius CTE seed leaked superseded rows; whoCalls unbounded IN(...) | W8 (HIGH) | seed live-only; 500-cap + WARN | W8 |
| graphify: hash missed tail edits / unreadable-file collisions / scope collisions / file-scope excludes | W8 (HIGHs) | whole-file+tail hash, skip-marks, scope anchor, excludes parity | W8 |

## 4. LIBRARIANS PINNED (graph-intelligence thread, per operator order)
Pinned to `~/.omp/threads/store.sqlite` thread `graph-intelligence` (entries table, origin omp):
- **(1) CORBELL BUG HUNTERS** — BugHunterBibles.{md,json,jsonl} + OmpCorbellPort.{md,json,jsonl}; tokens: fork-v143 checkout store (2086/9386), workspace.db, bug_hunter_report_v5.md:222-264, port proof 6/6 PASS
- **(2) GRAPHIFY** — CheckpointAudit.{md,json,jsonl}; tokens: v443-en38-graphify-oom-fixed (dist 54b50f18), hydra graphify/graph-mapper/corbell-bridge/aether-auditor/pipeline
- **(3) AETHER CODE AUDIT** — ForkAuditFace + SubstrateAudit + OmpHunterHarness + ForkGraphAudit + UpstreamAudit; tokens: v443-ship-approved-aether-code-audit (1c2b00fe), v443_aether_overhaul_complete_20260829 (890bc97d), R18-R31

## 5. LIVE LEGS (re-verified on the deployed dist in-rig)
```
LEG1_PROBE: {"token":"PROBE_TOOL_OK","sessionID":"ses_LIVELEG0000000001","echo":null}
LEG_G1_GRAPHIFY: substrate=graphify nodes=4 edges=5 | rows=2 | beta() (src/beta.ts:2)
LEG_G4_AUDIT: AUDIT_DONE layer=R28-sro-graph findings=3
```

## 6. FINAL KERNEL STATE
- battery **170 pass / 0 fail / 1597 expect across 28 files**
- dist **`05c3a282c0c41d74`** deployed ×5, exec-verified (build ext+idx, host OMP ×2, rig)
- qwen circuit on the corbell leg: 2 CRITICAL + 9 HIGH found → **all fixed this pass** (see §3)
- remaining scan highs: the documented architectural band (TOCTOU classes, first-run mtime, semantic tradeoffs) — tracked in WAVE_REPORT §SCAN VERDICT
