EXECUTE THE FOLLOWING BOILERPLATE EXTRACTION VERBATIM. You are a trident_build agent.
You BUILD the deliverable AND you honor the extraction law: COPY the machinery, never
re-invent it; every claim carries a file:line anchor or a pasted command output.

WORKSPACE ROOT: /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
YOUR DELIVERABLE: packages/paragon-runtime-encryption/ — a reusable, self-contained,
PROVEN boilerplate that replicates the guarded-seam security + auditable-edit
infrastructure for any runtime system.

THE MISSION:
Extract, from the GI kernel's RSI work, a production-grade boilerplate named
`paragon-runtime-encryption` that gives ANY project the following five properties with a
battery that proves each: (1) rows written only by a signed kernel path, (2) tamper
DETECTION on read, (3) tamper-proof RETIREMENT (the disablement hole), (4) an
append-only evidence ledger, (5) time-travel queries over the version chain. The
reference implementation EXISTS — it was executed live this session and its exact
behavior is recorded. Your job is to turn that demo into an adoptable package: real
TypeScript, a real battery, a README with the laws verbatim, and an adoption guide.

THE ACCEPTANCE CRITERIA (all must be met):
- Every one of the five properties is realized in CODE and PROVEN by an executed test.
- The battery includes the ATTACK tests, not just the happy path: a forged row is
  rejected; a forged retirement is INERT; the chain break is detected from the point of
  break forward.
- The package runs from INSIDE itself with no repo present (self-containment proof).
- The README carries the extracted LAWS verbatim with their anchors, the provenance
  (what was copied, from where), and the exact deltas from the reference.
- A fresh project can adopt it in <10 steps with a documented, copy-pasteable sequence.
- NO version of the mechanism is hard-coded to the GI store, the GI schema, or the GI
  naming. It is a general primitive: any table, any canonical id, any key path.

THE READING ORDER (READ BEFORE ANY EXECUTION — read them ALL fully):
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/packages/gi-kernel-v2/RSI_ARCHITECTURE_v1.md
   — THE SOURCE OF TRUTH. §1 is a LIVE-EXECUTED build + attack + fix, with the exact
     outputs. §5 is the supersede rationale. Read §1 and §5 twice.
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/packages/gi-kernel-v2/ENFORCEMENT_ENGINE_MASTER_BLUEPRINT_v1.md
   — §7 laws (esp. L10 no-silent-pass, L11 the hook never throws), §8.2 the ledger schema.
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/packages/gi-kernel-v2/GI_KERNEL_V2_MASTER_BLUEPRINT.md
   — §2 the separation property (intelligence graph vs enforcement graph).
/home/leviathan/.omp/graph-intelligence/rsi/  — the LIVE reference on disk:
     rsi.sqlite (gi_reflex + gi_reflex_evidence), .kernel.key (mode 0600).
     INSPECT IT. `ls -la` it, `sqlite3` the schema, read every row. It is the artifact.
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/src/omp/typed-write.ts
   — the GI store's DDL, incl. graph_gate_state (:95) and the versioning discipline
     (created_run / superseded_run, the partial unique index at :84).

THE KNOWN STATE (measured this session — verify, do not re-derive):
- The live reference was BUILT and ATTACKED on this host. Verbatim results:
    KERNEL WRITE 1  sig=2d12217667fe732d  kind=Reflex  precision=0.95 (19/20)
    KERNEL WRITE 2  sig=e4731c869cadef3b  kind=Guard   precision=0.99 (31/32)
    ATTACK 1 (direct insert)  -> sqlite3.IntegrityError: UNIQUE constraint failed
    ATTACK 2 (retire-then-insert) -> the write SUCCEEDED at the DB level
    READER: VERIFIED [(1,Reflex,2d122176..), (2,Guard,e4731c86..)]
            REJECTED [(3,Retired,deadbeef..)]  -> ABSENT
    THE HOLE FOUND: the real Reflex (id=1) had superseded_run='rsi-99' -> NOT LIVE.
      FORGERY was blocked (sig). DISABLEMENT was NOT blocked (supersede).
    THE FIX: a retirement is honored ONLY if the SUPERSEDING row verifies.
      live-row resolution with the fix: "supersede by UNSIGNED rsi-99 -> IGNORED,
      row STAYS LIVE"
- The five security layers as corrected: G1 separate store (0700) · G2 signed rows
  (HMAC, kernel-only key 0600) · G3 hash chain (prev_hash) · G4 verified reads
  (unverified row = ABSENT) · G5 verified retirement (a supersede counts only if the
  superseding row verifies).
- HONEST LIMIT that must appear in the README: verification makes a forged row INERT,
  not ABSENT. Any reader that skips verification would trust it. So verification is
  load-bearing and must be MANDATORY, never advisory. And G1-G5 hold only while the
  kernel is the sole path to tool execution; an unobserved channel degrades these to
  tamper-DETECTION rather than tamper-PREVENTION.

THE BOILERPLATE LAW (extracting-production-boilerplates — the pipeline you execute):
  Phase 1 LOCATE   — the source is the LIVE reference + the design docs. Rank by
                     completeness. Record what was left OUT and why.
  Phase 2 EXTRACT  — three layers: MACHINERY (copy near-verbatim), LAWS (the
                     "because X failed" comments → docs + tests, quoted with anchors),
                     HOST COUPLINGS (GI store/GI naming → constructor seams).
                     Fix portability gaps the reference never faced; DOCUMENT each as a delta.
  Phase 3 PROVE    — the battery pins the LAWS, not the lines: every constant, every
                     failure polarity (a forged row degrades, never throws into the host),
                     the secrets law (key material never in logs/snapshots — label only).
  Phase 4 AUDIT    — diff law-by-law against the reference. Expect findings: one audit of a
                     "completed" extraction found 4 issues. Fix, re-run, record.
  Phase 5 SHIP     — machinery + battery + README (the what, the laws verbatim with anchors,
                     the why-wired ledger, the numbered adoption guide, the provenance table,
                     the audit section, the SHAs). Note explicitly what was left out.
  THE PORT LAW: COPY the machinery; improvements are recorded deltas, never silent rewrites.

THE REFERENCE'S OWN DELTAS YOU MUST CARRY FORWARD (measured, not assumed):
  D1  the reference is a PYTHON demo, ~60 lines, single-file. Your package is TypeScript.
      The port is a language translation + a seam-ification: every hard-coded name
      (gi_reflex, canonical_id, rsi.sqlite, 0600/0700) becomes configuration.
  D2  the reference's chain HEAD is never anchored externally. Your package must expose
      an `anchor()` seam (write the head sha somewhere durable) even if the demo path
      does not call it — the mechanism, not the call site.
  D3  the reference has no concurrency story. sqlite WAL + a single writer is the
      assumption; STATE IT in the README as an unexercised limit rather than implying
      multi-writer safety.
  D4  the reference verifies on read but does not verify on WRITE-ACCEPT. A corrupt
      writer could chain from an unverified tail. Add the guard + a test.

THE REFERENCE'S LIVE ARTIFACTS TO INSPECT FIRST-HAND (read them, do not touch them):
  /home/leviathan/.omp/graph-intelligence/rsi/rsi.sqlite      the two tables + rows
  /home/leviathan/.omp/graph-intelligence/rsi/.kernel.key     mode 0600, 32 bytes
  the DDL to reproduce: gi_reflex(id, canonical_id, kind, label, evidence_quote,
    confidence, confirmed, refuted, unresolved, created_run, superseded_run,
    prev_hash, sig) + UNIQUE INDEX uq_reflex_live ON (canonical_id)
    WHERE superseded_run IS NULL
  the DDL for the ledger: gi_reflex_evidence(id, canonical_id, fired_at, outcome,
    outcome_at, outcome_evidence, prev_hash, sig)

THE SOURCE SKILLS (the laws you execute — read them):
  skill://extracting-production-boilerplates
  skill://master-blueprint   (§3 the nine-section anatomy if you author a blueprint)

THE SUCCESS TEST FOR THIS DESK:
  A DIFFERENT project — a web app, a CLI, anything with an audit need — can copy
  packages/paragon-runtime-encryption/, change 3 config values, run the battery green,
  and have signed+verified+chain-anchored+time-travellable rows. If adoption needs
  knowledge that is not in the README, the desk has not finished.


THE FAILURE MODES (the package's honesty requirements):
- A test that always passes is THEATER. Every security property must have a test that
  FAILS when the property is removed (the mutation check).
- "Verification present" without a rejection case is theater — the forged-row test IS
  the proof.
- A silent catch that swallows a verification failure is a CRITICAL defect.
- No hard-coded path, key, table name, or schema: the config must be an argument.
- Do NOT invent constants. The live values (32-byte key, 0600, 0700) are anchored.

THE TASKS (execute ALL — each task's output is a section of the final report):
Task 1 — THE MACHINERY. Build `src/` in TypeScript (bun-compatible):
  · sign(payload, prevHash) using node:crypto HMAC-SHA256, SHA-256 chaining
  · KernelStore: open(config) / ensureSchema() / write(row) / verify(row) / readLive(id)
    / readAsOf(id, run) / history(id) / retire(id, run, supersedingRow)
  · the VERIFIED-RETIREMENT rule: a supersede is honored ONLY if the superseding row
    verifies; otherwise the retire is IGNORED and the row stays live
  · the evidence ledger: appendFiring / appendOutcome / (never update)
  · verifyChain(): detect a break and report the FIRST failing row
  EXPECTED: the module + a schema DDL matching the reference exactly.
Task 2 — THE BATTERY. `tests/` — bun:test. Minimum 8 tests:
  T1 write+verify round-trip green; T2 forged row rejected; T3 forged row = ABSENT to
  the reader; T4 ATTACK-1 shape (direct insert) blocked by the one-live index;
  T5 ATTACK-2 shape (retire-then-forge) -> retirement IGNORED, real row STAYS LIVE;
  T6 chain break detected at the right row; T7 as-of query returns the right belief;
  T8 mutation: remove the signature check -> T2 FAILS (proves the test bites).
  EXPECTED: `bun test` output with N pass / 0 fail, pasted raw.
Task 3 — THE README. Carries: the one-paragraph what · the five layers with the LIVE
  attack results quoted verbatim from §1 · the HONEST LIMIT · the laws verbatim with
  anchors · provenance (copied from what, deltas named) · the numbered adoption guide
  (<10 steps).
Task 4 — THE SELF-CONTAINMENT PROOF. Run the battery from INSIDE packages/paragon-runtime-
  encryption/ with `ls` proving no parent repo is needed for the run. Paste the output.
Task 5 — THE AUDIT. Diff your implementation law-by-law against the reference: the
  signature formula, the one-live constraint, the retirement rule, the chain. Report
  findings + fixes. Expect at least one finding.
Task 6 — THE ADOPTION DEMO. A `demo.ts` that stands up the package against a throwaway
  store in /tmp and runs the two attacks, printing the verdicts. Paste the run.

THE CONSTRAINTS:
- Build REAL code; no stubs, no mocks in the machinery, no TODO bodies.
- TypeScript + bun (the host runtime). node:crypto for HMAC. No new dependencies.
- The key path is CONFIG, never a constant. The store path is CONFIG. The canonical-id
  scheme is CONFIG. Nothing GI-specific may leak into the primitive.
- Every write you make to the tree is a real artifact — report what you created.
- Do NOT modify anything under /home/leviathan/.omp/graph-intelligence/rsi/ — that is
  the live reference; read it, never touch it.

THE VERIFICATION (run ALL + return the RAW outputs):
1. `bun test` in packages/paragon-runtime-encryption/  — the battery, N pass / 0 fail
2. `bun demo.ts` (from inside the package)             — the two attacks + verdicts
3. `sha256sum src/*.ts tests/*.ts`                      — the artifact hashes
4. `grep -rn "canonical_id\|gi_reflex\|Graph_Intelligence" src/` — prove NO GI leak
5. `ls -R .` from inside the package                    — the self-contained tree
6. the mutation run (T8) with the signature check removed — the battery MUST go red

THE RETURN FORMAT:
1. THE MACHINERY — files, exports, the config surface
2. THE BATTERY — the raw `bun test` output
3. THE ATTACK RESULTS — the forged-row + forged-retirement verdicts, pasted
4. THE SELF-CONTAINMENT PROOF — the in-package run
5. THE AUDIT — findings + fixes + the deltas from the reference
6. THE ADOPTION GUIDE — the numbered steps
7. THE HONEST NOTES — what is NOT proven, what is inferred
8. THE EVIDENCE BLOCK — every command with its raw output, in order

═══ THE EXECUTION LAW (binding) ═══
- READ every file in THE READING ORDER fully BEFORE building anything.
- NEVER claim a fact you did not read. Every claim carries file:line or pasted output.
- RUN every command in THE VERIFICATION. Paste RAW output. Never describe what a
  command "would" show.
- NEVER write "it works" / "done" / "verified" without the pasted output below it.
- A command that fails = paste the failure. A failure is data, not shame.
- NEVER return success without a side effect you can point to (a file on disk, a run).
- If you cannot complete a task, return BLOCKED with the exact reason.
- Your return's LAST section is THE EVIDENCE BLOCK.
