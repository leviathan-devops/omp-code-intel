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
 *  `.abide` the checker writes; a caller may point it elsewhere for a test. */
export function abideEventsPath(abideRoot?: string): string {
  return path.join(abideRoot ?? "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace", ABIDE_EVENTS_REL);
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
  const raw = fs.readFileSync(eventsPath, "utf8");
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
  const eventsPath = abideEventsPath(abideRoot);
  return {
    id: "ABIDE",
    rung: "repair",
    dependency: "the Abide source — the ALU (repair, never block)",
    errorCode: "GI_ENFORCE_ABIDE",
    up: () => {
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
      const events = tailEvents(eventsPath, 4000);
      const hits = events.filter((e) => {
        if (e.band !== "flag") return false; // ★ only a FLAG is a repair opportunity
        const hay = `${e.matched_span ?? ""} ${e.verdict ?? ""} ${e.rule ?? ""}`;
        return hay.includes(subject);
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
