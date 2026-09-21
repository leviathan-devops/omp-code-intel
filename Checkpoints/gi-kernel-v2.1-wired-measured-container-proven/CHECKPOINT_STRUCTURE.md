# CHECKPOINT_STRUCTURE — what is here and how to verify it

## THE TREE

```
gi-kernel-v2.1-wired-measured-container-proven/
+- CHECKPOINT_MANIFEST.md      ← READ FIRST: the state + the 8 HONEST GAPS
+- CHECKPOINT_STRUCTURE.md     ← this file
+- BUILD_REPORT.md             the v2.1 build (528 L)
+- DEBUG_LOG.md                EN-048..EN-059 (558 L)
+- FAILURE_LOG.md              F-54..F-61 (438 L)
+- SPEC_VIOLATION_LOG.md       SV-1..SV-5, the declared deviations (111 L)
+- TESTING_LOG.md              the wave ladder + the AUDIT GATE line (658 L)
+- THEATRICALITY_LOG.md        4 self-caught, OPERATOR-CAUGHT: 0 (425 L)
+- src/                        the full source tree (97 ts)
+- dist/graph-intelligence/    the built extension (613,039 B, sha 83eb7bba)
+- context_management/         the 11-doc canon (all 200+ L, gate-verified)
+- packages/                   the v2.1 build package incl. PACKAGE_AUDIT.md
+- trident/                    the board, the CREATE_PIN, the container results
+- artifacts/audit/            EMPTY — see GAP-3
```

## THE VERIFY COMMANDS

```bash
# the source count (expect 97)
find src -name '*.ts' | wc -l

# the dist fingerprint (expect 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709)
sha256sum dist/graph-intelligence/index.js

# the battery (expect 244 pass / 0 fail / 901 expect / 25 files)
bun test ./tests/ ./src/hydra/__tests__/

# tsc (expect 191, the baseline; 0 new)
bunx tsc --noEmit 2>&1 | grep -c 'error TS'

# the canon floors (expect all >= 200 L and no CRITICAL)
for d in context_management/*.md; do printf '%-46s %s L\n' "$d" "$(wc -l < $d)"; done

# the container (expect 244/0/905/25)
docker exec stupefied_morse sh -lc 'cd /work/gi && /root/.bun/bin/bun test ./tests/ ./src/hydra/__tests__/'
```

## THE PROVENANCE

```
every file here is a COPY of the working tree at HEAD af54ea9 + the manifest commit.
the repo's git history is the integrity record — this checkpoint is NOT a lock.
NO SECRETS: the Jev key lives at ~/.config/typesafe/key (0600) and appears nowhere here.
```
