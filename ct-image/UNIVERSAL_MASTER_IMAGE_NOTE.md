# UNIVERSAL MASTER IMAGE — one image for ALL TUIs (supsersedes per-TUI images)

Built 2026-09-14: `omp-ct:master` (ID b3deaa6d03eb, 3.76GB) is the first step —
FROM `mimo-ct:master` (2.38GB) + the full OMP runtime + prebuilt config.
The goal: ONE universal master image that ALL TUIs (omp/mimo/opencode/qwen/grok)
can use, with each CT tool wired to it — superseding per-TUI images.

## Current state (measured)

| TUI | Image today | Binary in omp-ct:master? | Gap |
|---|---|---|---|
| omp / pi | runtime-grade-container-sandbox:master (25.9GB) | YES — /root/.bun/bin/omp, v18.1.14 verified | registry still points at old image (one-line change, not applied) |
| mimo / mimocode | mimo-ct:master (2.38GB) | YES — inherited FROM base (/root/.mimocode/bin/mimo) | none — already native |
| opencode | runtime-grade image (/usr/local/bin/opencode) | NO — base mimo-ct has no opencode binary | copy /usr/local/bin/opencode* + /usr/local/lib/node_modules/opencode-ai from runtime image, or keep bind strategy |
| qwen | runtime-grade image + host bind (~/.npm-global → /opt/qwen-global) | NO | needs bind preserved + bun entry path |
| grok | runtime-grade image + host bind (static binary → /usr/local/bin/grok) | NO | needs bind preserved |

## Needs (to complete the universal image)

1. **Per-TUI launcher shims** — one small entry per TUI (`omp`, `mimo`,
   `opencode`, `qwen`, `grok`) resolving to the right binary/bind inside the
   single image; CT's `ct-tui-registry.ts` presets then differ only by
   command/workdir/binds, never by image.
2. **Shared auth staging** — base carries /root/.local/share/mimocode/auth.json
   (opencode-go, nvidia, zhipuai-coding-plan); OMP auth seeds agent.db at CT
   setup from the image opencode store; per-TUI credentials (OPENROUTER for
   omp laguna default, opencode oauth, qwen oauth) stage the same way —
   never baked as key material beyond what the base already carries.
3. **Per-TUI workdir profiles** — omp/qwen/grok/opencode → /workspace;
   mimo → /root/MIMOCODE_WORKSPACE. One image, two workdirs, chosen by preset.
4. **Cutover** — point every CT_IMAGE_* constant at the universal image and
   retire runtime-grade-container-sandbox:master (25.9GB) for CT use.

## Human cutover for THIS ticket (NOT applied — DO NOT rebuild any dist)

File: `/home/leviathan/OMP_WORKSPACE/trident-omp/src/tools/ct-tui-registry.ts`
Line 8 context:
```
export const CT_IMAGE_OMP = "runtime-grade-container-sandbox:master";
```
Change to:
```
export const CT_IMAGE_OMP = "omp-ct:master";
```
Then rebuild the trident-omp dist + redeploy (out of scope for this ticket).
`CT_IMAGE_MIMO` (line 9) stays `mimo-ct:master` — omp-ct already contains mimo.
