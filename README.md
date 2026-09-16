# omp-code-intel-plugin

Self-contained git repo of the `mimo-code-intel` v0.2.0 MiMo-Code plugin (production close-out, sealed).

- **Source:** `src/` (20 modules) — structural search/rewrite, hashline-anchored editing, tag-emitting reads, write-time LSP verification, persistent py/js eval kernels with tool re-entry, import-rewriting moves, native grep shadow, vendored 5-op LSP client, merkle evidence chain, stream-rule governance, opt-in advisor. Zero MiMo-Code core edits.
- **Install:** `bun install` · **Typecheck:** `bun x tsc --noEmit` (exit 0) · **Tests:** `bun run tests/st/run.ts` (79/79).
- **Plugin entry:** `src/index.ts` (`plugin()` + `server`, FUNCTIONS ONLY). Register file-source in `mimocode.jsonc`.
- **Docs:** `reports/` (engineering report v8 + eval-re-entry deep dive), `.trident/` (battery plans, container results with per-row tokens, build ledger PROGRESS cycles 0-21), `Checkpoints/` (sealed T1/T2 checkpoint).
- **Provenance:** extracted from branch `mimo-code-intel-v2-closeout` @ `f3399245`, tags `v0.2.0` @ `cc40d62c` / `v0.2.0-observability` @ seal. Gates at extraction: tsc 0, ST 79/79, judge GATE PASS (0 critical/high, nemo/laguna lanes; pinned muse lane quota-dead), pack 23 files.
- **Not shipped here:** Ship_Packages/, campaign judge JSONs, container volumes, registry publish. This repo is the product + its evidence — nothing else.
