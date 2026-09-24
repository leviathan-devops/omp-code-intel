// PORTED FROM v443-en38-graphify-oom-fixed/src/hydra/graphify.ts:1-111 (GraphifyMCPClient connect/listTools/callTool/disconnect/isConnected) + :113-181 (createGraphifyTools factory shape)
// OMP SEAM ADAPTATION (D1, GI_OMP_FULL_PORT_DPL1_SPEC §B.1 + §9/D1): the operator-side
// graphify.serve lifecycle (StdioClientTransport spawn, stderr:ignore, half-open teardown)
// is NOT ported — no MCP serve spawn in src by LAW (the HT-BUG-16 orphan-spiral class).
// This reader keeps the READ-ONLY verbs (listTools/callTool/disconnect) against an
// OPERATOR-INJECTED transport only: the caller owns spawn/teardown (their shell), the
// machine only reads. A client with no transport refuses LOUD (GRAPHIFY_CONNECT_INVALID /
// GRAPHIFY_NOT_CONNECTED), never silent, never spawning.
// LAW: no tool registration without its proof battery in the same wave — the adversarial
// battery for this file is src/hydra/__tests__/client-reader.test.ts (W5 gate).

/** Minimal transport the operator injects. The ONLY surface the reader touches. */
export interface GraphifyTransport {
  listTools(): Promise<string[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  close(): Promise<void>;
}

export interface GraphifyToolDef {
  name: string;
  label: string;
  description: string;
}

const GRAPHIFY_TOOL_DEFS: GraphifyToolDef[] = [
  { name: "graphify_query", label: "Graph Query", description: "Ask a natural-language question about the codebase structure. Returns a scoped subgraph." },
  { name: "graphify_path", label: "Path Trace", description: "Find the shortest path between two concepts in the code graph." },
  { name: "graphify_explain", label: "Explain Concept", description: "Get detailed info about a concept: connections, community, degree, source file." },
  { name: "graphify_subgraph", label: "Subgraph Extraction", description: "Extract a scoped subgraph around a concept. Use for blast-radius analysis." },
];

/**
 * Read-only stdio MCP client (fork graphify.ts:28-111, serve-spawn REMOVED).
 * Lifecycle stays operator-side: attach() takes an already-connected transport;
 * this class NEVER spawns a child process. Disconnect is best-effort close.
 */
export class GraphifyClientReader {
  private transport: GraphifyTransport | null = null;
  private graphPath: string | null = null;
  // ★ F-1 FIX (2026-09-24): serialize concurrent attach() calls — two attachers
  //   interleaved at `await disconnect()` both closed the SAME old transport
  //   (double-close) and the loser overwrote the winner. The chain plus the
  //   synchronous clear below makes each re-attach atomic per attacher.
  private attachLock: Promise<void> = Promise.resolve();

  /** Attach an operator-owned connected transport for graphPath. Re-attach disconnects first. */
  async attach(graphPath: string, transport: GraphifyTransport): Promise<void> {
    if (typeof graphPath !== "string" || graphPath.trim() === "") {
      throw new Error("GRAPHIFY_CONNECT_INVALID: graphPath must be non-empty string");
    }
    if (!transport || typeof transport.callTool !== "function" || typeof transport.close !== "function" || typeof transport.listTools !== "function") {
      throw new Error("GRAPHIFY_TOOLS_INVALID: transport with listTools/callTool/close required");
    }
    const prev = this.attachLock;
    let release!: () => void;
    this.attachLock = new Promise<void>((r) => { release = r; });
    await prev;
    try {
      const old = this.transport;
      this.transport = null;
      this.graphPath = null;
      if (old) {
        try {
          await old.close();
        } catch (e) {
          console.error("[client-reader] transport close failed (releasing reference anyway):", e instanceof Error ? e.message : e);
        }
      }
      this.transport = transport;
      this.graphPath = graphPath;
    } finally {
      release();
    }
  }

  async listTools(): Promise<string[]> {
    // ★ F-2 FIX (2026-09-24): capture the reference — a concurrent disconnect()
    //   may null the field mid-flight; the call proceeds on the captured
    //   transport instead of throwing a raw TypeError on null.
    const t = this.transport;
    if (!t) throw new Error("GRAPHIFY_NOT_CONNECTED: no transport attached — attach() an operator-side transport first");
    try {
      return await t.listTools();
    } catch (err) {
      throw new Error(`GRAPHIFY_MCP_LIST_FAILED: ${String((err as Error).message ?? err)}`);
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // ★ F-2 FIX (2026-09-24): same capture as listTools — the in-flight call
    //   keeps its transport even if disconnect() lands concurrently.
    const t = this.transport;
    if (!t) throw new Error("GRAPHIFY_NOT_CONNECTED: no transport attached — attach() an operator-side transport first");
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error("GRAPHIFY_CALL_INVALID: name must be non-empty string");
    }
    try {
      return await t.callTool(name, args ?? {});
    } catch (err) {
      if (String((err as Error).message ?? "").includes("GRAPHIFY_NOT_CONNECTED")) throw err;
      throw new Error(`GRAPHIFY_MCP_CALL_FAILED: ${name} — ${String((err as Error).message ?? err)}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (e) {
        console.error("[client-reader] transport close failed (releasing reference anyway):", e instanceof Error ? e.message : e);
      }
      this.transport = null;
    }
    this.graphPath = null;
  }

  isConnected(): boolean {
    return this.transport !== null;
  }

  getGraphPath(): string | null {
    return this.graphPath;
  }
}

/**
 * Tool descriptors for the four graph verbs (fork createGraphifyTools :113-181,
 * AgentTool wrapper REMOVED — OMP bind owns its tool surface; this returns the
 * static defs so the auditor can name the verbs without an MCP dependency).
 * Throws GRAPHIFY_TOOLS_INVALID on null client (fork :114 parity).
 */
export function createGraphifyToolDefs(client: GraphifyClientReader | null | undefined): GraphifyToolDef[] {
  if (!client) throw new Error("GRAPHIFY_TOOLS_INVALID: mcp client required");
  return [...GRAPHIFY_TOOL_DEFS];
}
