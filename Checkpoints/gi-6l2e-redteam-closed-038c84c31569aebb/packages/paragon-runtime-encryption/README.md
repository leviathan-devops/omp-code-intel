# paragon-runtime-encryption

A reusable, self-contained, battery-PROVEN primitive for guarded-seam security +
auditable edits. Any project with an audit need gets: rows writable only through a
signed kernel path (G1/G2), tamper DETECTION on read (G3/G4), tamper-proof
RETIREMENT (G5 — the disablement hole the live attack found), an append-only
evidence ledger, and time-travel queries over the version chain. TypeScript + bun,
zero dependencies (`node:crypto` HMAC, `bun:sqlite`).

## The five layers (corrected by the live attack)

```
G1  SEPARATE STORE      vault/ mode 0700, out-of-tree of the project
G2  SIGNED ROWS         HMAC-SHA256 over canonical content, kernel-only key (0600, 32B)
G3  HASH CHAIN          each row binds prev_hash; head anchorable via anchor()
G4  VERIFIED READS      an unverified row is treated as ABSENT (never throws: false/null)
G5  VERIFIED RETIREMENT a supersede counts ONLY if the superseding row verifies
```

## The live attack results (verbatim from the reference session, 2026-09-21)

Source: `packages/gi-kernel-v2/RSI_ARCHITECTURE_v1.md` §1, executed on this host
against `/home/leviathan/.omp/graph-intelligence/rsi/rsi.sqlite` (read-only
reference — inspected, never touched):

```
KERNEL WRITE 1   sig=2d12217667fe732d  kind=Reflex  precision=0.95 (19/20)
KERNEL WRITE 2   sig=e4731c869cadef3b  kind=Guard   precision=0.99 (31/32)
ATTACK 1 (direct insert)  -> sqlite3.IntegrityError: UNIQUE constraint failed: gi_reflex.canonical_id
ATTACK 2 (retire-then-insert) -> the write SUCCEEDED at the DB level
READER: VERIFIED [(1,'Reflex','2d122176..'), (2,'Guard','e4731c86..')]
        REJECTED [(3,'Retired','deadbeef..')] -> ABSENT
THE HOLE FOUND: the real Reflex (id=1) had superseded_run='rsi-99' -> NOT LIVE.
  FORGERY was blocked (sig). DISABLEMENT was NOT blocked (supersede).
THE FIX: a retirement is honored ONLY if the SUPERSEDING row verifies.
  "supersede by UNSIGNED rsi-99 -> IGNORED, row STAYS LIVE"
```

This package replays both attacks in `demo.ts` and pins them in `tests/` (T4/T5).

## HONEST LIMIT (binding — RSI §1.6, carried verbatim)

Verification makes a forged row INERT, not ABSENT. The forged bytes remain in the
file; any reader that skips verification would trust them. So verification is
load-bearing and MANDATORY, never advisory: read ONLY through `readLive`/`readAsOf`
(never raw SQL), and treat `verify() === false` as absent. Further, G1–G5 hold only
while the kernel is the sole path to tool execution; an unobserved channel degrades
these guarantees to tamper-DETECTION rather than tamper-PREVENTION.

## Laws (verbatim, with anchors)

- L-INDEX — the one-live constraint lives in a partial unique index
  (`src/omp/typed-write.ts:84`):
  `CREATE UNIQUE INDEX ... ON typed_nodes(canonical_id) WHERE superseded_run IS NULL`.
  Ported as `uq_live_<records> ON <records>(<idColumn>) WHERE superseded_run IS NULL`
  (`src/store.ts` `ensureSchema`). ATTACK 1 dies here.
- L-APPEND — the outcome is a NEW record, never an edit of the firing
  (`RSI_ARCHITECTURE_v1.md` §3.1: "Append-only is what makes this honest").
  Ported as `appendFiring`/`appendOutcome` with NO update method (`src/store.ts`).
- L10 NO SILENT PASS (`ENFORCEMENT_ENGINE_MASTER_BLUEPRINT_v1.md` §7): every skip or
  failure is NAMED. Ported as named throws: `KEY_ABSENT`, `KEY_LEN`, `KEY_MODE`,
  `CHAIN_TAIL_UNVERIFIED`, `RETIRE_NO_LIVE`, `LEDGER_NO_FIRING`, `BAD_CONFIG`.
- L11 NEVER THROW INTO THE HOST (§7: "Any failure is caught, logged as an event,
  and returns silent"). Ported as read-path polarity: `verify` returns boolean,
  `readLive`/`readAsOf` return `null` for unverified — a forged row degrades to
  ABSENT, never an exception in the caller.
- L-G5 VERIFIED RETIREMENT (`RSI_ARCHITECTURE_v1.md` §1.5): "A retirement is
  honored only if the SUPERSEDING row verifies" and "the one-live-row invariant
  moves out of the index and into the reader, where it can consult the signature."
  Ported as `isDisabled` (`src/store.ts`): a `superseded_run=S` stamp disables a row
  iff some row with `created_run=S` VERIFIES; otherwise the retire is IGNORED.
- L-ASOF (`RSI_ARCHITECTURE_v1.md` §5.2):
  `as_of(M) = created_run <= M AND (superseded_run IS NULL OR superseded_run > M)`.
  Ported as `readAsOf`, plus G4/G5 filtering and numeric-suffix run ordering.

## Provenance (what was copied, from where)

| # | Source (read first-hand) | What was taken | Lands here |
|---|---|---|---|
| P1 | `~/.omp/graph-intelligence/rsi/rsi.sqlite` — 3 rows + `uq_reflex_live` index DDL | row shape (13 cols), one-live partial index, the forged row + stamped victim as the attack fixture | `ensureSchema`, tests T4/T5 |
| P2 | `RSI_ARCHITECTURE_v1.md` §1 (guarded seam) + §5 (supersede rationale) | G1–G5, the fix rule, as-of/history semantics, append-only ledger | whole `src/`, README laws |
| P3 | `src/omp/typed-write.ts:55-95` (`TYPED_STORE_DDL`, `:84` live index, `:95` gate state) | DDL discipline, partial-index pattern | `ensureSchema` |
| P4 | `ENFORCEMENT_ENGINE_MASTER_BLUEPRINT_v1.md` §7 L10/L11, §8.2 ledger schema | named-failure law, read polarity, firing/outcome record split | errors, `appendFiring`/`appendOutcome` |

## Deltas from the reference (improvements are recorded, never silent)

- D1 — the reference is a ~60-line single-file PYTHON demo; this is TypeScript +
  seam-ified: every hard-coded name (table, identity column, store path, key path)
  is `StoreConfig`. Language translation + configuration, no logic change.
- D2 — the reference never anchors its chain HEAD externally. This package exposes
  `anchor(path)` (writes the head sha to a durable file). Mechanism, not call site.
- D3 — the reference has no concurrency story. Assumption stated, not solved: sqlite
  WAL + a single writer. Multi-writer safety is UNEXERCISED — do not imply it.
- D4 — the reference verifies on read but not on WRITE-ACCEPT: a corrupt writer could
  chain from an unverified tail. Added the guard (`CHAIN_TAIL_UNVERIFIED`) + test T10.
- D5 — the reference never faced a dangling outcome (outcome for a firing that does
  not exist). Added the linkage guard (`LEDGER_NO_FIRING`) + test T9.

Left OUT and why: confidence derivation, the oracle, tier promotion (RSI §2–§4) —
designed-not-built intelligence, not seam machinery. The key-cycler/transport
machinery of sibling boilerplates — different primitive, not this desk.

## Adoption guide (8 steps)

1. Copy `packages/paragon-runtime-encryption/` into your repo (zero dependencies).
2. Confirm `bun --version` (1.4+; needs `bun:sqlite` + `node:crypto`, both built in).
3. Mint the kernel key OUTSIDE your project tree: `mintKey("/vault/<app>/.kernel.key")`
   (0600, 32 random bytes — never commit it, never log it).
4. Open the store with YOUR 3 names (table, ledger, identity column are config):
   `KernelStore.open({ storePath, keyPath, recordTable, ledgerTable, idColumn })`.
5. Write ONLY through the kernel: `write()` for new rows, `retire()` for succession.
   Never `UPDATE`/`DELETE` outside the kernel — the battery assumes sole-writer.
6. Read ONLY through `readLive()` / `readAsOf()` / `history()` + `verify()`.
   Raw SQL readers skip verification and WILL trust forgeries (see HONEST LIMIT).
7. Run the battery green from inside the package: `bun test` (15 pass / 0 fail).
8. Anchor the head somewhere durable on a schedule: `anchor(path)`; commit that file
   (git ledger à la RSI §5.4) so a future break has an external reference.

## Audit (law-by-law diff vs the reference, pre-ship)

- F1 — first draft `readLive` scanned only NULL-stamped rows and returned the
  newest, missing the attacker-stamped victim shape (stamp present, claimant
  unverified). FIX: newest-verified-non-disabled scan with `isDisabled` (G5 in the
  reader, per §1.5). Pinned by T5.
- F5 — the attacker's raw UPDATE stamps WITHOUT re-signing, so the stamped victim
  fails even NULL-stamp verify; `readLive` returned null (T5 red after F1's fix).
  FIX: G5 graffiti rescue — a stamped row that verifies AS-IF-unstamped with no
  verified claimant is returned with kernel-signed content (retirement IGNORED).
  Pinned by T5; `readAsOf` inherits it via the claimant rule.
- F6 — `retire()` stamped-then-inserted without re-signing the victim: the
  kernel's OWN retire corrupted the victim's sig (verify went false, T5b/T7 red).
  FIX: retire re-signs the stamped victim in-transaction and chains the successor
  from the new victim sig. Pinned by T5b/T7.
- F7 — `readAsOf` returned the stamped-null successor for pre-succession runs
  (T5b/T7 red). FIX: a stamped-null candidate loses to any newer verified row
  created at-or-before M. Pinned by T7.
- F8 — `retire()` inserted BEFORE stamping: the one-live partial index rejected
  the kernel's own succession with `UNIQUE constraint failed` (T5b/T7 red).
  FIX: stamp-then-insert inside `BEGIN IMMEDIATE`/`COMMIT` (atomic; the reference
  never executed a same-identity kernel succession live, so it never faced the
  index). Pinned by T5b.
- F2 — draft tail carried a module-augmentation stub (`StoredRecordProto`) from an
  abandoned design. FIX: deleted; `isDisabled` is a plain private method. Re-ran green.
- F3 — no firing-linkage guard (reference never faced it). FIX: D5 `LEDGER_NO_FIRING`
  + T9 negative case.
- F4 — test seam risk: `verifyHooks.compare` indirection could be mistaken for
  production configurability. FIX: documented test-only in `signing.ts`; production
  code never touches it; T8 uses it and restores it in `finally`.

Battery: `bun test` — 17 pass / 0 fail (output in the ship report). Mutation red-run:
`/tmp/paragon-red` copy with `verifyRow` gutted to `return true` goes red
(T2/T3/T5/T6/T10 fail — 12 pass / 5 fail; T2 detail: `Expected: false,
Received: true` at `battery.test.ts:89`).
No GI vocabulary in `src/` (`grep -rn "canonical_id\\|gi_reflex\\|Graph_Intelligence" src/`
returns nothing — the reference identity column arrives only via `idColumn`).
