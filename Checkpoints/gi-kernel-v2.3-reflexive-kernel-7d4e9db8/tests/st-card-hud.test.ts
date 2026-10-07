// st-card-hud — ★ W5 THE CARD-HUD (GI_KERNEL_V2.3 FR-4).
//
// S3: an edit on a SYMBOL file queues a CALLERS card (delivered on tool_result). C5: a
// doc-only edit is SILENT (zero cards). The HUD is fail-OPEN — it never throws.
import { describe, expect, test } from "bun:test";
import path from "node:path";
import { attachCardHud, formatHud } from "../src/omp/card-hud.ts";

const REPO = path.resolve(import.meta.dir, "..");

function fakePi(): { on: (ev: string, cb: (e: Record<string, unknown>) => unknown) => void; fire: (ev: string, e: Record<string, unknown>) => unknown } {
  const handlers: Record<string, (e: Record<string, unknown>) => unknown> = {};
  return {
    on: (ev, cb) => { handlers[ev] = cb; },
    fire: (ev, e) => handlers[ev]?.(e),
  };
}

describe("st-card-hud: W5 the portable fallback (FR-4)", () => {
  test("test_card_hud_queued_on_edit", () => {
    const pi = fakePi();
    attachCardHud(pi);
    const file = path.join(REPO, "src/hunter/profile/source-roots.ts");
    // the edit enqueues a card ...
    pi.fire("tool_call", { toolName: "edit", isAgentOrigin: true, cwd: REPO, sessionID: "s1", input: { file_path: file } });
    const res = pi.fire("tool_result", { toolName: "edit", sessionID: "s1", input: { file_path: file } }) as { content?: Array<{ text?: string }> } | undefined;
    // ... and tool_result delivers the HUD block
    expect(res).toBeDefined();
    expect(res?.content?.[0]?.text ?? "").toMatch(/GI CARD-HUD/);
    expect(res?.content?.[0]?.text ?? "").toMatch(/callers|CARD-HUD/);
    expect(res?.content?.[0]?.text ?? "").toMatch(/shown=/);
  });

  test("test_card_hud_silent_on_doc_edit", () => {
    const pi = fakePi();
    attachCardHud(pi);
    const doc = path.join(REPO, "README.md");
    pi.fire("tool_call", { toolName: "edit", isAgentOrigin: true, cwd: REPO, sessionID: "s2", input: { file_path: doc } });
    const res = pi.fire("tool_result", { toolName: "edit", sessionID: "s2", input: { file_path: doc } });
    expect(res).toBeUndefined(); // a doc-only edit → SILENT (the C5 negative)
  });

  test("test_card_hud_format_is_informational", () => {
    // the HUD block carries the cards + the honest shown=N total=M suffix.
    const hud = formatHud([
      { shape: "CALLERS", title: "foo — 2 callers", rows: ["a (x.ts:1)", "b (y.ts:2)"], severity: 3, source: "gi-lsp/callers", total: 2 },
    ]);
    expect(hud).toMatch(/GI CARD-HUD/);
    expect(hud).toMatch(/foo — 2 callers/);
    expect(hud).toMatch(/shown=2 total=2/);
  });
});
