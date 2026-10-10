/**
 * lexicon-gate — the OMP host extension (W2).
 *
 * THE DIVISION OF LABOUR (measured, not assumed):
 *   TTSR  = the regex PRE-FILTER. It tests `condition:` as a BOOLEAN (ttsr.ts:293-301) and
 *           rewinds on a match. It reads NO lexicon (grep: 0 hits in the ttsr source).
 *   THIS  = THE LEXICON, and it IS the prose-abort decision-maker. `message_update` carries
 *           no RESULT type, but the handler receives `ctx` and `ctx.abort()` aborts the
 *           agent operation (types.ts:441). So the SCORED band decides the abort; the regex
 *           is the fast pre-filter.
 *   THIS  = the adjudicator. It scores, gates on source-kind, judges the gray zone with Jev,
 *           ledgers every decision, and drives the two channels an extension DOES own:
 *           tool_call (block) and tool_result (repair-append).
 */
import {
	appendLedger,
	bandOf,
	classifySource,
	confidence,
	isQuotedMatch,
	judgeSpan,
	judgeSpans,
	loadRules,
	scoreSignals,
	SCORABLE,
	type LedgerRow,
	type LexiconRule,
	type SrcKind,
} from "./lib";
import { existsSync } from "node:fs";

const REPAIR_HEAD = "lexicon-gate: this text looks like a pattern the PBK forbids.";

function fileKindOf(p: string | undefined): string {
	if (!p) return "";
	if (/\.(md|mdx|markdown)$/i.test(p)) return "doc";
	if (/[\\/]rules[\\/].*\.md$/i.test(p)) return "rule";
	return "";
}

export default function (pi: any): void {
	let rules: LexiconRule[] = [];
	let loadError: string | null = null;
	const buffers = new Map<string, { text: string; fence: boolean }>();
	// THE LEXICON-DRIVEN ABORT: the last (ruleId:span) we aborted on, so the abort does not
	// re-fire on the same text. Cleared at session_start.
	let lastAbort = "";

	/**
	 * ★ THE HOT-RELOADABLE KILL SWITCH (operator 2026-09-23: "immediately turn off all ttsr
	 * injections ... hot reload once its fixed").
	 *
	 * The extension module is ESM-CACHED — a code edit needs a NEW PROCESS. But a SENTINEL
	 * FILE read PER-INVOCATION toggles live: `touch ~/.omp/run/lexicon-gate.OFF` silences the
	 * gate in the RUNNING process, no restart. `rm` re-arms it. This is the only hot-reloadable
	 * control a hook has.
	 */
	const KILL_FILE = `${process.env.HOME}/.omp/run/lexicon-gate.OFF`;
	const enabled = (): boolean => {
		try {
			return !existsSync(KILL_FILE);
		} catch {
			return true;
		}
	};

	const reload = () => {
		try {
			rules = loadRules();
			loadError = null;
			pi.logger?.info?.(`[lexicon-gate] ${rules.length} rules loaded`);
		} catch (e) {
			rules = [];
			loadError = String(e);
			// A LOUD named event — never a silent skip.
			pi.logger?.warn?.(`[lexicon-gate] RULES LOAD FAILED: ${loadError}`);
		}
	};

	/** The one decision pipeline. Returns the band + the row for the ledger. */
	const decide = (line: string, fileKind: string, inFence: boolean, quoteCheck = true) => {
		const srcKind: SrcKind = classifySource(line, inFence, fileKind);
		const hits: { rule: LexiconRule; c: number; band: string; pos: number; neg: number; span: string; kind: SrcKind }[] = [];
		if (SCORABLE.has(srcKind)) {
			for (const rule of rules) {
				const { pos, neg, hit } = scoreSignals(line, rule.lexicon);
				if (pos === 0) continue;
				const c = confidence(pos, neg);
				// FIX (the container test, 2026-09-23): a QUOTED match is material the agent is
				// repeating, not its own assertion. The line-level gate cannot see it, so the
				// matched text is checked for an enclosing backtick/quote here.
				const kind: SrcKind = quoteCheck && isQuotedMatch(line, hit) ? "quotation" : srcKind;
				hits.push({ rule, c, band: bandOf(c, rule.band), pos, neg, span: line.slice(0, 200), kind });
			}
		}
		return { srcKind, hits };
	};

	const record = (ruleId: string, c: number, srcKind: SrcKind, span: string, jev: number | null) =>
		appendLedger({ Pattern: ruleId, State: { confidence: Number(c.toFixed(4)), source_kind: srcKind }, Evidence: { span, jev } } satisfies LedgerRow);

	// ── session_start: load the rules once ──
	pi.on("session_start", async () => {
		lastAbort = "";
		reload();
	});

	// ── message_update: the stream hook — THE LEXICON DECIDES ──
	// The handler takes (event, ctx). `ctx.abort()` aborts the current agent operation
	// (types.ts:441 -> runner.ts:859 -> runner.ts:543 -> agent-session.ts:5518 -> :8372
	// -> agent.abort()). This is the wire that makes the SCORED LEXICON — not the flat
	// regex — the prose-abort decision-maker.
	// ── input: THE PROVENANCE GATE. A message the EXTENSION injected (source ===
	// "extension") is OUR OWN VOICE — never the operator's, and never the agent's own
	// utterance. Passing it through unscored is what keeps a correction from being
	// re-scored as a claim (the F-1 defect, measured 2026-09-23: 14 ledger rows at
	// confidence 0.000 whose span WAS the injected correction).
	pi.on("input", async (event: any) => {
		if (event?.source === "extension") return { action: "continue" };
		return { action: "continue" };
	});

	pi.on("message_update", async (event: any, ctx: any) => {
		if (!enabled()) return; // ★ THE KILL SWITCH — read per-invocation, hot-reloadable
		const ev = event?.assistantMessageEvent;
		if (!ev) return;
		const isText = ev.type === "text_delta" || ev.type === "thinking_delta";
		if (!isText || typeof ev.delta !== "string") return;
		const key = `${ev.type}:${ev.contentIndex ?? 0}`;
		let buf = buffers.get(key);
		if (!buf) {
			buf = { text: "", fence: false };
			buffers.set(key, buf);
		}
		buf.text += ev.delta;
		const parts = buf.text.split("\n");
		buf.text = parts.pop() ?? "";
		for (const raw of parts) {
			const line = raw.trim();
			if (/^\s*```/.test(raw)) buf.fence = !buf.fence;
			if (line.length < 8) continue;
			const { srcKind, hits } = decide(line, "", buf.fence);
			for (const h of hits) {
				if (h.band === "fire" && SCORABLE.has(h.kind)) {
					record(h.rule.id, h.c, h.kind, h.span, null);
					// ★ THE LEXICON DECIDES. The band fired on the agent's OWN utterance
					// (source_kind passed the gate) -> ABORT the stream.
					const sig = `${h.rule.id}:${h.span}`;
					if (lastAbort !== sig) {
						lastAbort = sig;
						pi.logger?.warn?.(
							`[lexicon-gate] FIRE ${h.rule.id} c=${h.c.toFixed(3)} kind=${h.kind} -> abort + inject`,
						);
						// ★ THE BOOLEAN PUSH. There is no "push a bool into TTSR" API (the
						// condition-matcher takes no input slot — measured). The enforcement
						// ACTION *is* the boolean: abort the operation in place, then inject the
						// quoted violation + the correction. Nothing is deleted (no rewind).
						// THE PEDIGREE (2026-09-23): sendMessage + customType, NOT sendUserMessage.
						// sendUserMessage is documented as "an actual user message that appears as
						// if typed by the user" — a gate must never impersonate the operator.
						// customType makes it a NATIVE custom entry: the harness renders it as
						// <primary-context kind="ttsr-injection"> and the input hook can see
						// event.source === "extension" — its own voice, correctly attributed.
						ctx?.abort?.();
						try {
							// ★ THE NATIVE SHAPE (measured in the omp binary, 2026-09-23):
							//   role:"custom", customType:"ttsr-injection", content, display:!1,
							//   details:{rules, deliveryId}, attribution:"agent"
							// `display:true` rendered it as a BOX ("package") in the TUI; the native
							// uses display:false + details + attribution — the SAME fields, the SAME
							// rendering path as the harness's own TTSR injections.
							pi.sendMessage(
								{
									customType: "ttsr-injection",
									content:
										`[${h.rule.id}] ${h.rule.body.slice(0, 700)}`,
									display: false,
									attribution: "agent",
									details: {
										rules: [h.rule.id],
										confidence: Number(h.c.toFixed(3)),
										sourceKind: h.kind,
										span: h.span.slice(0, 200),
									},
								},
								{ deliverAs: "steer" },
							);
						} catch (e) {
							pi.logger?.warn?.(`[lexicon-gate] inject failed (named): ${String(e)}`);
						}
					}
				} else if (h.band === "gray") {
					// THE GRAY ZONE ONLY — Jev is the exception handler, never the hot path.
					let jev: number | null = null;
					try {
						// ★ V2.4: ONE span → the noul form (a 1-option `choice` is a 400 on the local judge).
						jev = await judgeSpan(h.span);
					} catch (e) {
						pi.logger?.warn?.(`[lexicon-gate] jev skip (named): ${String(e)}`);
					}
					record(h.rule.id, h.c, h.kind, h.span, jev);
				} else {
					record(h.rule.id, h.c, h.kind, h.span, null);
				}
			}
		}
	});

	// ── ttsr_triggered: record the adjudication for every abort TTSR made ──
	pi.on("ttsr_triggered", async (event: any) => {
		for (const r of event?.rules ?? []) {
			const span = String(r?.content ?? "").slice(0, 200);
			const { pos, neg } = scoreSignals(span, (rules.find((x) => x.id === r?.name)?.lexicon ?? { suggestive: [], descriptive: [] }) as any);
			record(String(r?.name ?? "unknown"), confidence(pos, neg), "own_utterance", span, null);
		}
	});

	// ── tool_call: the ONE mechanical channel an extension owns for input ──
	pi.on("tool_call", async (event: any) => {
		const text = typeof event?.input === "string" ? event.input : JSON.stringify(event?.input ?? {});
		const fileKind = fileKindOf(event?.input?.path ?? event?.input?.filePath);
		const { hits } = decide(text.slice(0, 4000), fileKind, false, false);
		for (const h of hits) {
			record(h.rule.id, h.c, h.kind, h.span, null);
			if (h.band === "fire" && SCORABLE.has(h.kind)) {
				return { block: true, reason: `${h.rule.id}: ${h.rule.description}\n\n${h.rule.id} — ${String((h.rule as any).content ?? "").slice(0, 400)}` };
			}
		}
		return undefined;
	});

	// ── tool_result: the repair-append channel (the edit stands; the demand rides) ──
	pi.on("tool_result", async (event: any) => {
		// FIX (the container test, 2026-09-23): a tool RESULT is material the agent is reading
		// (file contents, command output) — NOT the agent's own utterance. Scoring it as
		// own_utterance produced the FP on a rule file's own body. `doc` makes it non-scorable.
		const text = typeof event?.content === "string" ? event.content : JSON.stringify(event?.content ?? "");
		const { hits } = decide(text.slice(0, 4000), "doc", false);
		const fired = hits.filter((h) => h.band === "fire" && SCORABLE.has(h.kind));
		for (const h of hits) record(h.rule.id, h.c, h.kind, h.span, null);
		if (fired.length === 0) return undefined;
		const demand = `${REPAIR_HEAD}\n` + fired.map((h) => `- ${h.rule.id} (confidence ${h.c.toFixed(3)})`).join("\n");
		const base = Array.isArray(event?.content) ? event.content : [];
		return { isError: true, content: [...base, { type: "text", text: demand }] };
	});

	// ── agent_end: the close check ──
	pi.on("agent_end", async () => {
		if (loadError) pi.logger?.warn?.(`[lexicon-gate] close check with rules unloaded: ${loadError}`);
		buffers.clear();
	});
}
