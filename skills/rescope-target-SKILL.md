---
name: rescope-target
description: Inputtable rescope destinations with path rewrites and SHA-gated moves
---

# Rescope Target — Inputtable Project Homes (companion to `rescope`)

Use when the operator names an explicit destination for a rescope
migration instead of the default MIMOCODE tree (e.g. "put the project in
.../Shared_Workspace/Graph_Intelligence", "replace the mimocode path with
X"). This skill does NOT replace `rescope` — it parameterizes it.

## Inputs (ask or take from the order, never assume)

- `TARGET`: absolute destination dir (must exist or be mkdir-able; must be
  empty or operator-confirmed non-empty).
- `SOURCE`: absolute source dir (the tree being moved).
- `PATH_REWRITES`: list of `OLD_ROOT -> NEW_ROOT` string swaps to apply to
  code + docs + manifests after the move (verify each with grep before and
  after; record counts in the migration manifest).
- `EXCLUDE`: runtime/vendor bulk that stays behind (default:
  `node_modules/`, `*.sqlite-shm`, `*.sqlite-wal`; anything else named by
  the operator with its reason).

## Procedure

1. Survey: `pwd`, git status/log/toplevel at SOURCE, `ls` TARGET (must be
   empty or confirmed), du sizes both sides.
2. Hash every included file at SOURCE (`sha256sum`, manifest BEFORE).
3. Move per-file (`mv`, never copy-and-hope); recreate symlinks relative
   at TARGET; remove stale absolute links at SOURCE.
4. Re-hash at TARGET — every entry MUST match BEFORE (gate: 0 mismatches).
5. Apply PATH_REWRITES with `sed -i` per explicit file list; grep-verify
   zero old-root hits remain in code/tests/scripts/docs; re-run the
   project's battery from the NEW root (a move that breaks the build is a
   failed migration).
6. Init repo at TARGET when ordered (`git init -b <branch>`, `.gitignore`
   for bulk/regen, first commit with dist SHA + battery line); worktree via
   `git worktree add` only on operator order; NEVER commit for the user
   beyond the ordered baseline commit.
7. Write `MIGRATION_MANIFEST.md` at TARGET: source→dest, per-file SHAs,
   exclusions + reasons, path-rewrite counts, timestamp, uncommitted-state
   note.

## Laws

- Archive, don't destroy: the source tree is left as husks + vendor +
  runtime state; never deleted.
- Never migrate a live session's cwd from under it.
- Never silently merge into a non-empty target.
- Key material never enters manifests or logs (fingerprints only).
- The battery from the NEW root is the migration's proof, not the hash
  gate alone.
