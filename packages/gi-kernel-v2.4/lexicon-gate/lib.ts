/**
 * lexicon-gate — the PBK v3 adjudicator.
 *
 * TTSR is the abort teeth (it owns the prose stream). THIS module is the adjudicator:
 * it scores the stream with the per-rule lexicon, gates on the SOURCE KIND, judges the
 * gray zone with Jev, and writes one ledger row per decision.
 *
 * W0 = the frozen interface (the types below). W2 = the implementation below the marker.
 * The frozen marker is the W0/W2 region split: W2 appends, it never edits above the line.
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

// ── FROZEN INTERFACE ABOVE — DO NOT EDIT ──
export type SrcKind = "own_utterance" | "quotation" | "table" | "doc" | "rule_source";

export interface PatternFamily {
	/** Legitimate co-context. neg += 1 */
	descriptive: string[];
	/** The violation shape. pos += 2 when the regex source contains \b, else 1 */
	suggestive: string[];
	/** The theatrical tell. pos += 2 */
	substitute?: string[];
	/** THE EXEMPTOR: the legitimate use of the same words. neg += 3 */
	use?: string[];
}

export interface LexiconRule {
	id: string;
	description: string;
	scope: string[];
	/** What TTSR reads (its own frontmatter key). EMPTY = extension-only (TTSR registers nothing). */
	condition: string[];
	/** What the extension reads (parsed from disk; never from the resolved Rule). */
	lexicon: PatternFamily;
	threshold: number;
	band: { low: number; high: number };
	/** The markdown body — the correction text the interrupt injects. */
	body: string;
}

export type Band = "silent" | "gray" | "fire";

export interface LedgerRow {
	Pattern: string;
	State: { confidence: number; source_kind: SrcKind };
	Evidence: { span: string; jev: number | null };
}

export const FROZEN = "// ── FROZEN INTERFACE ABOVE — DO NOT EDIT ──";

/**
 * Strip a leading PCRE-style inline flag group. JS `RegExp` REJECTS `(?i)` — the same trap
 * `compileRuleCondition` handles on the engine side (capability/rule.ts:257-264). A rule whose
 * `lexicon:` regex carried `(?i)` threw at load and took the whole extension down (found by the
 * suite after the denial-lookbehind change).
 */
export function stripInlineFlags(p: string): string {
	return p.replace(/^\(\?[a-z]+\)/, "");
}

/** Compile a lexicon pattern: strip the inline flags, then compile case-insensitively. */
export function compileLexiconPattern(p: string): RegExp {
	return new RegExp(stripInlineFlags(p), "i");
}

// ── THE IMPLEMENTATION (W2) — everything below appends; nothing above is edited ──

/** ONLY own_utterance can fire. A quotation/table/doc/rule_source match is recorded, never acted on. */
export const SCORABLE: ReadonlySet<SrcKind> = new Set<SrcKind>(["own_utterance"]);

export const RULES_DIR = path.join(homedir(), ".omp", "agent", "rules");
export const LEDGER_PATH = path.join(homedir(), ".omp", "run", "lexicon-ledger.jsonl");

/**
 * The deterministic source-kind gate. $0, no model, runs BEFORE any score.
 * A fenced block, a table row, a bulleted backtick quote, a blockquote, a heading,
 * a rule file, and a doc file are ALL non-scorable.
 */
export function classifySource(line: string, inFence: boolean, fileKind: string): SrcKind {
	if (inFence) return "rule_source";
	if (/^\s*\|/.test(line)) return "table";
	if (/^\s*[-*]\s*`[^`]+`/.test(line)) return "quotation";
	if (/^\s*>/.test(line)) return "quotation";
	if (/^\s*#{1,6}\s/.test(line)) return "doc";
	if (fileKind === "rule") return "rule_source";
	if (fileKind === "doc") return "doc";
	return "own_utterance";
}

/** The blueprint §8 weights, verbatim. `hit` is the MATCHED TEXT (not the pattern source). */
export function scoreSignals(text: string, f: PatternFamily): { pos: number; neg: number; hit: string } {
	let pos = 0;
	let neg = 0;
	let hit = "";
	for (const p of f.suggestive ?? []) {
		let re: RegExp;
		try {
			re = compileLexiconPattern(p);
		} catch {
			throw new Error(`lexicon: invalid suggestive regex ${JSON.stringify(p)}`);
		}
		const m = re.exec(text);
		if (m) {
			pos += p.includes("\\b") ? 2 : 1;
			if (!hit || m[0].length > hit.length) hit = m[0];
		}
	}
	for (const p of f.substitute ?? []) {
		const m = compileLexiconPattern(p).exec(text);
		if (m) {
			pos += 2;
			if (!hit || m[0].length > hit.length) hit = m[0];
		}
	}
	for (const p of f.descriptive ?? []) if (compileLexiconPattern(p).test(text)) neg += 1;
	for (const p of f.use ?? []) if (compileLexiconPattern(p).test(text)) neg += 3;
	return { pos, neg, hit };
}

/** confidence = pos / (pos + neg + 1) */
export function confidence(pos: number, neg: number): number {
	return pos / (pos + neg + 1);
}

export function bandOf(c: number, b: { low: number; high: number }): Band {
	if (c >= b.high) return "fire";
	if (c >= b.low) return "gray";
	return "silent";
}

/**
 * Load every rule from disk. THROWS on an invalid regex, a missing `use:` bank, or an
 * empty `condition:` — a silent drop is the #4796 class and is banned here.
 */
export function loadRules(dir: string = RULES_DIR): LexiconRule[] {
	if (!existsSync(dir)) throw new Error(`lexicon-gate: rules dir absent: ${dir}`);
	const out: LexiconRule[] = [];
	for (const name of readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
		const raw = readFileSync(path.join(dir, name), "utf8");
		const m = raw.match(/^---\n([\s\S]*?)\n---/);
		if (!m) throw new Error(`lexicon-gate: ${name} has no frontmatter`);
		const fm = Bun.YAML.parse(m[1]) as Record<string, unknown>;
		const lex = fm.lexicon as PatternFamily | undefined;
		if (!lex || !Array.isArray(lex.use) || lex.use.length === 0)
			throw new Error(`lexicon-gate: ${name} has no 'use:' bank (the exemptor is mandatory)`);
		// THE TTSR-EMPTY MODE (the architecture change 2026-09-23): `condition:` is OPTIONAL.
		// When present, TTSR also registers the rule (the fast regex pre-filter). When absent,
		// this rule is EXTENSION-ONLY and TTSR loads nothing — one decision-maker.
		const condition = Array.isArray(fm.condition) ? (fm.condition as string[]) : [];
		for (const bank of ["suggestive", "descriptive", "substitute", "use"] as const)
			for (const p of (lex[bank] as string[] | undefined) ?? [])
				try {
					compileLexiconPattern(p);
				} catch (e) {
					throw new Error(`lexicon-gate: ${name} bad ${bank} regex ${JSON.stringify(p)}: ${String(e)}`);
				}
		// the body = everything after the frontmatter, minus the internal band comment
		const body = (m[0].length ? raw.slice(m[0].length) : "").replace(/<!--[\s\S]*?-->/g, "").trim();
		out.push({
			id: name.replace(/\.md$/, ""),
			body,
			description: String(fm.description ?? ""),
			scope: (fm.scope as string[]) ?? [],
			condition: condition as string[],
			lexicon: lex,
			threshold: Number(fm.threshold ?? 0.55),
			band: (fm.band as { low: number; high: number }) ?? { low: 0.55, high: 0.7 },
		});
	}
	return out;
}

/**
 * Resolve the TypeSafe key. Order: env -> ~/.abide/.env -> ~/.config/typesafe/key.
 * (The SDK reads TYPESAFE_API_KEY; the host's .env names it TYPESAFE_AI_API_KEY.)
 */
export function resolveKey(): string | undefined {
	const env = process.env.TYPESAFE_AI_API_KEY ?? process.env.TYPESAFE_API_KEY;
	if (env && env.trim()) return env.trim();
	try {
		const dotenv = readFileSync(path.join(homedir(), ".abide", ".env"), "utf8");
		const m = dotenv.match(/^\s*TYPESAFE_AI_API_KEY\s*=\s*(\S+)/m);
		if (m) return m[1];
	} catch {}
	try {
		const k = readFileSync(path.join(homedir(), ".config", "typesafe", "key"), "utf8").trim();
		if (k) return k;
	} catch {}
	return undefined;
}

/** One ledger row per decision. Append-only. Never throws into the caller. */
export function appendLedger(row: LedgerRow, ledgerPath: string = LEDGER_PATH): void {
	try {
		mkdirSync(path.dirname(ledgerPath), { recursive: true });
		appendFileSync(ledgerPath, JSON.stringify(row) + "\n");
	} catch {}
}

/**
 * THE JEV WIRE (blueprint §7): ONE Choice whose criteria are the tagged span ids, plus a
 * noul companion. `P(span) > 0` -> claim; `P(span) === 0.0000` -> mention. The gray zone only.
 *
 * DEPENDENCY-FREE BY DESIGN: `@typesafe-ai/sdk` does not resolve from this subdirectory, so the
 * wire is a raw POST to /v1/systemone (the SDK's own path + body, read from its dist). The SDK is
 * used when it happens to resolve; otherwise the fetch path runs. Same contract either way.
 */
// ★ V2.4 (2026-10-10 — the operator mandate VERBATIM: "No remote type safe local judge for
//   everything. Always mandatory."). The judge is the LOCAL jevk5-4b on :8090 (gguf, llama:200,
//   FREE, no key). The remote paid-judge path is DELETED — not a fallback, not an option. A
//   remote-judge reference anywhere is a HARD STOP in this build (grep the firewall's detector).
export const TYPESAFE_URL = "http://127.0.0.1:8090/v1/systemone";
export const TYPESAFE_MODEL = "jevk5-4b-v0.2-Q8_0";

export function buildJevBody(spans: { id: string; text: string }[]): unknown {
	const criteria: Record<string, null> = {};
	for (const s of spans) criteria[s.id] = null;
	return {
		state: {
			context:
				"Lines from a coding agent's session. Some are the assistant's OWN assertions about work it just did. Others are material the agent is reading, quoting, tabulating, writing a rule about, or attributing to someone else.",
			lines: spans.map((s) => `${s.id}| ${s.text}`).join("\n"),
		},
		questions: {
			where: {
				type: "choice",
				instructions: {
					question:
						"Which ONE line contains the assistant ASSERTING, in its own voice, a completion or success claim about work IT JUST DID?",
					target: "an assertion the agent makes about its own work",
					not_target:
						"a line that only quotes, tabulates, writes a rule about, reads from a document, or attributes the same words to someone else",
				},
				criteria,
			},
			exists: {
				type: "noul",
				instructions:
					"Does ANY line contain the assistant asserting, in its own voice, a claim about work it just did?",
				criteria: {
					true: "at least one line is the agent's own assertion about its own work",
					false: "every line is a quotation, table, rule source, document, or attribution",
				},
			},
		},
		model: TYPESAFE_MODEL,
	};
}

export async function judgeSpans(spans: { id: string; text: string }[]): Promise<Map<string, number>> {
	const body = buildJevBody(spans);
	// ★ V2.4: the LOCAL judge ONLY — no key, no SDK, no remote fallback. A down judge THROWS;
	//   the caller's fail-open records jev:null and CONTINUES (never a remote substitute).
	const res = await fetch(TYPESAFE_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(15000),
	});
	if (!res.ok) throw new Error(`lexicon-gate: local judge ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`);
	const json = (await res.json()) as { answers?: { where?: { probabilities?: Record<string, number> } } };
	return new Map(Object.entries(json.answers?.where?.probabilities ?? {}));
}

/**
 * ★ V2.4 — THE SINGLE-SPAN GRAY CHECK. The gray path judges ONE span, and the local judge
 * REJECTS a `choice` with fewer than two options (`400: choice criteria must name at least two
 * options` — measured). A single span is therefore a NOUL (binary) question: "is this line the
 * agent's own completion claim?" → returns P(noul). This is the correct shape, not a workaround.
 */
export async function judgeSpan(text: string): Promise<number> {
	const body = {
		state: {
			context:
				"One line from a coding agent's session. Some lines are the assistant's OWN assertions about work it just did; others are material it is reading, quoting, tabulating, writing a rule about, or attributing to someone else.",
			lines: `S001| ${text}`,
		},
		questions: {
			exists: {
				type: "noul",
				instructions:
					"Does this line contain the assistant ASSERTING, in its own voice, a completion or success claim about work IT JUST DID?",
				criteria: {
					true: "the agent asserts its own work is done/complete/verified",
					false: "a quotation, table, rule source, document, or attribution",
				},
			},
		},
		model: TYPESAFE_MODEL,
	};
	const res = await fetch(TYPESAFE_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(15000),
	});
	if (!res.ok) throw new Error(`lexicon-gate: local judge ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`);
	const json = (await res.json()) as { answers?: { exists?: { noul?: number } } };
	return json.answers?.exists?.noul ?? 0;
}


/**
 * FIX (found by the container test, 2026-09-23): a phrase the agent is QUOTING is material, not the
 * agent's own assertion. The source-kind gate is line-level, so it cannot see an inline quotation.
 * This check upgrades a line to `quotation` when the MATCHED TEXT sits inside backticks or
 * double/single quotes — the class that produced the FP on "the user asked me to run
 * `echo "the build is done"`".
 */
export function isQuotedMatch(line: string, match: string): boolean {
	if (!match) return false;
	const idx = line.toLowerCase().indexOf(match.toLowerCase());
	if (idx < 0) return false;
	// A quote-STATE walk: the match is "quoted" iff its start index falls inside an open
	// backtick / double-quote / single-quote region. (The first version only checked the
	// immediately-preceding char, which missed `echo "the build is done"` — the match starts
	// at "build", after "the ", still inside the quote.)
	let inBack = false;
	let inDbl = false;
	let inSgl = false;
	for (let i = 0; i < idx; i++) {
		const c = line[i];
		if (i > 0 && line[i - 1] === "\\") continue;
		if (c === "`") inBack = !inBack;
		else if (c === '"' && !inBack && !inSgl) inDbl = !inDbl;
		else if (c === "'" && !inBack && !inDbl) inSgl = !inSgl;
	}
	return inBack || inDbl || inSgl;
}
