# BOILERPLATE MANIFEST — gi-6l2e-gaps-closed-audited

## 1 · Production modules (`boilerplate/modules/layer-registry/`)
| file | source (file:lines) | SHA-16 | role |
|---|---|---|---|
$(cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence && for f in layer-registry layer-consumption _shared c2kg arsumbris; do s=$(sha256sum src/omp/adapters/$f.ts src/omp/$f.ts 2>/dev/null | head -1 | awk '{print $1}'); echo "| $f.ts | src/omp/ | ${s:0:16} | see README |"; done; for f in consumption-audit au-read; do s=$(sha256sum scripts/$f.ts | awk '{print $1}'); echo "| $f.ts | scripts/$f.ts | ${s:0:16} | see README |"; done)

## 2 · Agent surface (`boilerplate/agent-surface/`)
| file | source | role |
|---|---|---|
| `extension.ts` | `src/omp/extension.ts` | the tool registration entry (`registerGiOmpTools(pi, cwdOf)`) |
| `REGISTRATION.md` | authored | how the extension loads + the `cwdOf` injection contract |

## 3 · Left OUT (the source's own use-case layer)
- `pbk-v2/src/ext/*` — the host gate stack (STTGF/DOC-DENSITY/CONTAINER gates) — a different project.
- `src/hunter/*` — the diagnostics subsystem — the source's own domain.
- runtime state (`.omp/*.sqlite`, `ct-results*.json`) — never ships (hygiene).
