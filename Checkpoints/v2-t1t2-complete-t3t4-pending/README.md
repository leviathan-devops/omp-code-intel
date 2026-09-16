# mimo-code-intel

OMP harness intelligence for MiMo-Code as one toggle. Structural
search/rewrite, hashline-anchored edits, persistent eval kernels, a merkle
evidence chain, stream-rule governance, and optional grep/LSP shadows — with
zero edits to MiMo core files. Native engine: `@oh-my-pi/pi-natives@18.1.18`
(pinned exact). License: MIT.

## Install

```bash
npm install mimo-code-intel        # registry channel
npm install file:../mimo-code-intel # dev channel (local path)
```

Enable with one line in `mimocode.jsonc`:

```jsonc
{ "plugin": [["mimo-code-intel", { "ttsr": { "rules": [] } }]] }
```

## Options

| Key | Type | Default | Effect |
|---|---|---|---|
| `ast` | boolean | `true` | registers `ast_grep`, `ast_edit`, `resolve` |
| `hashline` | boolean | `true` | registers `mimo_edit` |
| `eval` | `{py, js}` | `{py: true, js: true}` | per-language kernel on/off; both off unregisters `eval` |
| `merkle` | boolean | `true` | `tool.execute.after` chain append + `evidence` tool |
| `ttsr.rules` | `{key, re, body}[]` | `[]` | rule scan on tool output, reminder injection, compaction persist |
| `advisor` | `{model}` | off | `session.userQuery.post` trajectory scan, `[mimo-intel advisor]` concern |
| `shadow` | `("grep"\|"lsp")[]` | `[]` | opt-in registry shadow; absent = builtins untouched |

Full example: `{ "ast": true, "hashline": true, "eval": { "py": true,
"js": false }, "merkle": true, "ttsr": { "rules": [] }, "shadow": ["grep"] }`.

## Tools

| Tool | What it does |
|---|---|
| `ast_grep` | structural search (`{pat, path?, lang?, skip?}`); emits `[path]#tag` + `N:body` rows, `matchCount/filesSearched` |
| `ast_edit` | structural rewrite preview (`{ops, paths}`, `dryRun`); disk changes only via `resolve` |
| `resolve` | applies staged `ast_edit` diffs; rejects stale previews |
| `mimo_edit` | hashline-anchored edit (`{file_path, tag, hunks:[{line, old, new}]}`); verifies tag, writes atomically, retags |
| `eval` | persistent py/js kernels (`{language, code, title?, timeout?, reset?}`); `reset:true` wipes that language |
| `evidence` | reads the merkle chain; returns `integrity` + `chainLength` |

Shadow ids (opt-in only via `shadow`): `grep` (pi-natives in-process grep,
`matches=<n> files=<m>` + `#tag` headers) and `lsp` (hover, definition,
references, rename, diagnostics).

## The anchor loop

`ast_grep` snapshots each file and prints its content-hash tag as
`[path]#tag`. Pass that tag to `mimo_edit`; the tool verifies the tag against
the live file BEFORE writing. A tag from an edited file is stale: the write
is refused with `STALE_ANCHOR` and the file bytes are unchanged. A hunk whose
`old` line no longer matches fails with `ANCHOR_MISMATCH at line N`. After a
successful write a fresh tag is minted — always re-read tags from the latest
tool output. Out-of-band writes (any `file.edited` event) invalidate stored
tags, so the next `mimo_edit` with the old tag also returns `STALE_ANCHOR`.

## Merkle evidence

Every successful mutating-tool call appends one row to
`.mimocode/mimo-intel/merkle-chain.jsonl` BEFORE the tool result returns
(side-effect-before-claim). `evidence {}` replays the chain: `integrity:
true` plus the row count, or LOUD `integrity: false` when a row was deleted
or tampered with (SC-9). The chain is the audit trail, not a backup.

## Eval limitations

'No await keyword in cells; trailing promise expressions are awaited. State
persists per language until reset.' Concretely: the js driver runs each cell
synchronously and only awaits a trailing thenable; the py driver `exec()`s
each cell. Missing runtimes fail named (`KERNEL_MISSING`, `EVAL_TIMEOUT`,
`EVAL_DISABLED_PY/JS`), never silent. Kernels die with the session.

## LSP v1 scope

Per-call server lifecycle (spawn → ops → shutdown); no persistent server in
v1. Builtin servers: `typescript-language-server --stdio` for
`.ts/.tsx/.js/.jsx/.mjs/.cjs`, `pyright-langserver --stdio` for `.py`.
Unserved extensions and missing binaries both return `No LSP server
available for <ext> files` (`NO_LSP_SERVER`) — no throw, no fallback.

## Toggle-off

Remove the `"mimo-code-intel"` entry from `mimocode.jsonc` and restart: the
six plugin tool ids disappear from the registry and all builtins behave as
if the plugin was never installed.

## Third-party notices

See `THIRD-PARTY-NOTICES` (MIT: `@oh-my-pi/pi-natives`, `@mimo-ai/plugin`,
`zod`, `effect`). The plugin wraps `@oh-my-pi/pi-natives` unmodified; all
plugin source is original.
