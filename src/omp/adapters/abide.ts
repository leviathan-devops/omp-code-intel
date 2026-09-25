// adapters/abide — ★ ABIDE → the REPAIR rung.
//
// ★ ABIDE REPAIRS, NEVER BLOCKS. The rung is `repair`, and the fact a repair
// contributes is a REPAIR OPPORTUNITY the decision may take — never a refusal. An
// ABIDE edge that returned a block would be the wrong rung entirely.
//
// ★ NO-STUB LAW (WARHEAD 23) — REPLACED 2026-09-22: this adapter first returned
// `facts: () => []` unconditionally. That was a STUB over working machinery: ABIDE
// IS RUNNING on this host (`.abide/events.jsonl`, 22.8 MB, updated 23:35 the same
// day) and emitting structured verdicts. The stub is replaced with the real read.
//
// THE SUBSTRATE: the Abide checker's event ledger. Each row is a rubric verdict
// against agent text:
//   {"ts","rule","buffer","band":"flag"|"clear","verdict","jev_called","ms","matched_span"}
// A `flag` band is a REPAIR OPPORTUNITY — the agent's own words tripped a rubric rule
// and the evidence demand applies. Those are the facts this edge contributes.
import * as fs from "node:fs";
import * as path from "node:path";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";

export const ABIDE_EVENTS_REL = ".abide/events.jsonl";

interface AbideEvent {
  ts?: string;
  rule?: string;
  buffer?: string;
  band?: string;
  probability?: number | null;
  verdict?: string;
  jev_called?: boolean;
  ms?: number;
  matched_span?: string | null;
  skip_reason?: string | null;
}

/** ★ THE EVENTS FILE — the real substrate. `abideRoot` defaults to the workspace
 *  `.abide` the checker writes; a caller may point it elsewhere for a test.
 *  ★ F-340 FIX (2026-09-24): the workspace default was a HARDCODED user path — wrong on
 *  every other machine (silently a missing dir). GI_ABIDE_ROOT, then JARVIS_WORKSPACE,
 *  then the legacy absolute path (last resort, never first). */
export function abideEventsPath(abideRoot?: string): string {
  // ★ F-342 FIX (2026-09-24): F-341 made scopeRoot authoritative — correct for isolation, but
  //   it BROKE the substrate when the ledger lives at a WORKSPACE ANCESTOR (this repo's
  //   `.abide/events.jsonl` sits at Shared_Workspace/, one level up — a graph consumer inside
  //   a project must still find the workspace-level checker's ledger). Resolution, in order:
  //   (1) the explicit abideRoot (test/ops override), (2) GI_ABIDE_ROOT, (3) an ANCESTOR WALK
  //   from the given root looking for an existing ledger (bounded, NAMED in the evidence),
  //   (4) the given root verbatim (so a genuinely absent substrate still reports its own path).
  // THE SEMANTICS: the argument is the SEARCH BASE (the scope the caller passed), never an
  // asserted root — calling `abideEventsPath(scopeRoot)` must not be read as "the ledger is
  // AT scopeRoot" (that reading is exactly what made the substrate read absent). The env
  // vars are the only ASSERTIONS; everything else is a bounded lookup from the base.
  if (process.env.GI_ABIDE_ROOT !== undefined) return path.join(process.env.GI_ABIDE_ROOT, ABIDE_EVENTS_REL);
  if (process.env.JARVIS_WORKSPACE !== undefined) {
    const envPath = path.join(process.env.JARVIS_WORKSPACE, ABIDE_EVENTS_REL);
    if (fs.existsSync(envPath)) return envPath;
  }
  const base = path.resolve(abideRoot ?? process.cwd());
  let dir = base;
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, ABIDE_EVENTS_REL);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // absent everywhere on the walk — report the base's own path (the loud ENOENT names it)
  return path.join(base, ABIDE_EVENTS_REL);
}

/** ★ F-23 FIX (2026-09-24): the full-file read loaded a 22.8MB ledger to keep 4000 rows. Bounded tail + mtime/size cache. */
const tailCache = new Map<string, { size: number; mtimeMs: number; events: AbideEvent[] }>();
/** Read the LAST `limit` events. The ledger is append-only and can be large, so the
 *  read is a bounded tail — never a full materialization. */
function tailEvents(eventsPath: string, limit: number): AbideEvent[] {
  let st: import("node:fs").Stats | null = null;
  try { st = fs.statSync(eventsPath); } catch { st = null; }
  if (st !== null) {
    const hit = tailCache.get(eventsPath);
    if (hit && hit.size === st.size && hit.mtimeMs === st.mtimeMs) return hit.events.slice(-limit);
    // ★ F-AB1 FIX (2026-09-24): the bounded tail previously assumed the last 1 MiB contained a newline; if it did not, the function discarded the window and fell through to a full-file read. Grow exponentially so very long lines are still captured without materializing the entire ledger.
    const TAIL_BYTES_START = 1024 * 1024;
    // ★ F-210 FIX (2026-09-24): Math.min — the cap BOUNDS the tail window. Math.max floored
    //   every read at 64 MiB, loading the WHOLE file for anything smaller (the anti-optimization).
    const TAIL_BYTES_MAX = Math.min(st.size, 64 * 1024 * 1024);
    let fd: number | null = null;
    try {
      fd = fs.openSync(eventsPath, "r");
      let accepted = false;
      let tailBytes = TAIL_BYTES_START;
      while (tailBytes <= TAIL_BYTES_MAX && !accepted) {
        const start = Math.max(0, st.size - tailBytes);
        const buf = Buffer.alloc(st.size - start);
        fs.readSync(fd, buf, 0, buf.length, start);
        let text = buf.toString("utf8");
        if (start > 0) {
          const nl = text.indexOf("\n");
          if (nl === -1) {
            tailBytes *= 2;
            continue;
          }
          text = text.slice(nl + 1);
        }
        const lines = text.split("\n").filter((l) => l.trim().length > 0);
        if (lines.length >= limit || start === 0) {
          const out: AbideEvent[] = [];
          for (const l of lines.slice(-limit)) {
            try { out.push(JSON.parse(l) as AbideEvent); } catch { /* torn line — counted, never fatal */ }
          }
          tailCache.set(eventsPath, { size: st.size, mtimeMs: st.mtimeMs, events: out });
          return out;
        }
        tailBytes *= 2;
      }
    } catch { /* fall through to the full read */ } finally {
      if (fd !== null) { try { fs.closeSync(fd); } catch { /* ignore */ } }
    }
  }
  // ★ F-414 FIX (2026-09-24): reaching here means the bounded tail FAILED (fd error or
  // ★ loop exhaustion) — the full read below undoes the F-23/F-AB1/F-210 optimization
  // ★ silently. A ledger above the safety threshold throws instead of materializing,
  // ★ and the degraded path warns so operators can detect the fallback.
  const MAX_SAFE_FULL_READ = 32 * 1024 * 1024; // 32 MiB
  if (st && st.size > MAX_SAFE_FULL_READ) {
    throw new Error(
      `GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} (${st.size}B) and full read exceeds ${MAX_SAFE_FULL_READ}B — refusing to materialize the ledger`,
    );
  }
  console.warn(`[gi-abide] bounded tail failed for ${eventsPath} — degraded full read (counted, never silent)`);
  // ★ F-842 FIX (2026-09-24): the fallback read was unguarded — when `st` is null (stat failed) there is no size bound AND a missing/unreadable ledger escapes as a raw ENOENT crash instead of the structured GI_ENFORCE_ABIDE error the adapter promises. A read failure refuses NAMED.
  let raw: string;
  try {
    raw = fs.readFileSync(eventsPath, "utf8");
  // ★ F-1206 FIX (2026-09-25): when `st` is null (stat failed) the pre-guard above is
  //   skipped — a successful read of a giant ledger would materialize unbounded.
  //   Enforce the same 32MiB ceiling on the ACTUAL bytes just read.
    if (Buffer.byteLength(raw, "utf8") > MAX_SAFE_FULL_READ) {
      throw new Error(
        `GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} (${Buffer.byteLength(raw, "utf8")}B read) and full read exceeds ${MAX_SAFE_FULL_READ}B — refusing to materialize the ledger`,
      );
    }
  } catch (e) {
    throw new Error(`GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} and the fallback read is unavailable (${(e as NodeJS.ErrnoException).code ?? (e instanceof Error ? e.message : String(e))}) — the ledger cannot be read`);
  }
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const out: AbideEvent[] = [];
  for (const l of lines.slice(-limit)) {
    try {
      out.push(JSON.parse(l) as AbideEvent);
    } catch {
      // a torn final line is normal for an append-only ledger — counted, never fatal
    }
  }
  try {
    const st2 = fs.statSync(eventsPath);
    tailCache.set(eventsPath, { size: st2.size, mtimeMs: st2.mtimeMs, events: out });
  } catch { /* cache best-effort */ }
  return out;
}

export function abideProbe(scopeRoot: string, abideRoot?: string): ConsumerProbe {
  // ★ F-341 FIX (2026-09-24): scopeRoot was ACCEPTED but never READ — the probe resolved from
  // ★ abideRoot-or-hardcoded-absolute, so a confined scopeRoot bought no isolation (every other
  // ★ adapter joins scopeRoot). abideRoot stays an explicit test/ops override; otherwise the
  // ★ path derives from scopeRoot (the confined root the caller actually passed).
  const eventsPath = abideEventsPath(abideRoot ?? scopeRoot);
  return {
    id: "ABIDE",
    rung: "repair",
    dependency: "the Abide source — the ALU (repair, never block)",
    errorCode: "GI_ENFORCE_ABIDE",
    up: () => {
      // ★ F-507 NOTE (2026-09-24): NOT-A-BUG - sync statSync here is the CONTRACT. ConsumerProbe.up
      // ★ is SYNCHRONOUS (layer-registry.ts pins `up: boolean`-shaped returns, not a Promise), so an
      // ★ async stat cannot satisfy the interface; one statSync on a hot metadata path is the same
      // ★ cost every other probe pays. The 64MiB/32MiB ledger reads live in facts()/tailEvents, not here.
      try {
        const st = fs.statSync(eventsPath);
        if (!st.isFile()) return { up: false, evidence: `${eventsPath} exists but is not a file` };
        if (st.size === 0) return { up: false, evidence: `${eventsPath} is EMPTY — the checker has emitted nothing` };
        return { up: true, evidence: `${eventsPath} (${st.size}B, mtime ${new Date(st.mtimeMs).toISOString()})` };
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code ?? "UNKNOWN";
        return { up: false, evidence: `${eventsPath} — ${code}` };
      }
    },
    facts: (subject: string): LayerFact[] => {
      if (!fs.existsSync(eventsPath)) {
        // ★ the no-fallback law: an absent substrate THROWS (the registry's catch maps
        //   it to GI_LAYER_DOWN). It never returns [] dressed as "no facts".
        throw new Error(`GI_ENFORCE_ABIDE: the Abide event ledger is absent at ${eventsPath}`);
      }
      // ★ F-906 FIX (2026-09-24): hay.includes('') is always true — a blank subject matched EVERY flag, flooding repair facts. Blank subject ⇒ zero facts (an empty span never matches per F-506; an empty subject matches nothing).
      if (!subject || subject.trim().length === 0) return [];
      const events = tailEvents(eventsPath, 4000);
      const hits = events.filter((e) => {
        if (e.band !== "flag") return false; // ★ only a FLAG is a repair opportunity
        // ★ F-506 FIX (2026-09-24): one-direction hay.includes(subject) missed repairs when the
        // * subject is the broader text containing the span excerpt. Also match the reverse
        // * (subject contains the span); an empty span never matches.
        // * F-1005 FIX (2026-09-25): the concatenated hay matched ACROSS field boundaries
        //   (a span-tail + verdict-head joined by a space phantom-matched a subject present in
        //   no single field) and the reverse arm fired on 2-3-char spans incidentally contained
        //   in the subject (UNBOUNDED class). Forward now matches each field separately; the
        //   reverse arm needs a 6-char minimum span. PROBE: subject "error ful" vs row {span
        //   "a error", verdict "ful x"} -> no hit (was a phantom hit); a subject containing a
        //   long span still hits.
        const span = (e.matched_span ?? "").trim();
        const verdict = (e.verdict ?? "").trim();
        const rule = (e.rule ?? "").trim();
        if (span.length > 0 && span.includes(subject)) return true;
        if (verdict.length > 0 && verdict.includes(subject)) return true;
        if (rule.length > 0 && rule.includes(subject)) return true;
        if (span.length >= 6 && subject.includes(span)) return true;
        return false;
      });
      return hits.map((e) => ({
        consumer: "ABIDE" as const,
        rung: "repair" as const,
        subject,
        value: {
          repair: "the flagged claim needs its structured atom / evidence",
          rule: e.rule,
          band: e.band,
          matchedSpan: e.matched_span,
          verdict: e.verdict,
        },
        source: `${eventsPath}#${e.ts ?? "?"}(${e.rule ?? "?"} · span "${e.matched_span ?? "-"}")`,
      }));
    },
  };
}
