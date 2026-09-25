// PORTED FROM v443-en38-graphify-oom-fixed/graph-intelligence/hydra/pipeline.ts:15-143 (AetherHydraPipeline.execute: subagent-nonempty gate → GRAPH_EXTRACT → MCP connect → fan-out allSettled → synthesize → post-gates → output) + :145-161 (dispatchSubagent AETHER_MIGRATION stub) + :163-168 (failLoud) + hydra/types.ts:34-96 (PipelineConfig/SubagentSpec/SubagentSettlement/GateCheck/GateResult/SharedMemoryStore)
// OMP SEAM ADAPTATION (D2): graphMapper.extract (CLI spawn) REMOVED — the pipeline consumes an
// operator-built graphPath via readGraphJson (map-reader guarded load); MCP connect REMOVED —
// fan-out runs runTemplateAudit per spec (auditor.ts deterministic sweep, no LLM); contract-guard
// import (audit-engine/math) REMOVED — gates are plain async checks. dispatchSubagent stays a LOUD
// AETHER_MIGRATION stub matching the fork (dead by design; the live path is runMetaLayer-style
// fan-out below). Synthesizer + buildOutput are caller-supplied (no OMP consumer yet — tested but
// unbound per D2). Evidence log is an in-memory entry list (fork PipelineEvidenceCollector shape,
// file backend not ported — no consumer reads it yet).

import type { AuditorTemplate } from "./templates/types.ts";
import { runTemplateAudit, type HunterSettlement } from "./auditor.ts";
import { readGraphJson, type GraphifyGraph } from "./map-reader.ts";

export interface GateResult {
  passed: boolean;
  reason?: string;
}

export interface GateCheck<T> {
  name: string;
  check(value: T): Promise<GateResult>;
}

export interface SubagentSpec<TInput, TSubResult> {
  id: string;
  template: AuditorTemplate;
  ledgerDirFor: (input: TInput) => string;
  inputDataFor?: (input: TInput) => string;
  run: (input: TInput, graph: GraphifyGraph) => Promise<TSubResult>;
}

export interface SubagentSettlement<T> {
  subagentId: string;
  status: "fulfilled" | "rejected";
  value?: T;
  reason?: Error;
}

export interface EvidenceEntry {
  kind: string;
  at: number;
  data: Record<string, unknown>;
}

export interface PipelineTelemetry {
  totalDurationMs: number;
  subagentCount: number;
  fulfilledCount: number;
  rejectedCount: number;
}

export interface GateOutput<TSynthesis, TSubResult> {
  gateName: string;
  synthesis: TSynthesis;
  results: SubagentSettlement<TSubResult>[];
  telemetry: PipelineTelemetry;
}

export interface PipelineConfig<TInput, TSubResult, TSynthesis, TOutput> {
  name: string;
  targetRootFor: (input: TInput) => string;
  graphPathFor: (input: TInput) => string;
  subagents: SubagentSpec<TInput, TSubResult>[];
  gates: { pre: GateCheck<TInput>[]; post: GateCheck<TSynthesis>[] };
  synthesizer: (results: SubagentSettlement<TSubResult>[], graph: GraphifyGraph) => Promise<TSynthesis>;
  buildOutput: (synthesis: TSynthesis, results: SubagentSettlement<TSubResult>[], evidence: EvidenceEntry[]) => TOutput;
}

export function specForTemplate(
  template: AuditorTemplate,
  ledgerRoot: string,
): SubagentSpec<{ targetRoot: string; graphPath: string }, HunterSettlement> {
  return {
    id: template.layerId,
    template,
    ledgerDirFor: () => `${ledgerRoot}/${template.layerId}`,
    run: async (input, _graph) =>
      runTemplateAudit({
        template,
        ledgerDir: `${ledgerRoot}/${template.layerId}`,
        targetRoot: input.targetRoot,
        graphPath: input.graphPath,
      }),
  };
}

export class HydraPipeline<TInput, TSubResult, TSynthesis, TOutput> {
  readonly config: PipelineConfig<TInput, TSubResult, TSynthesis, TOutput>;
  readonly evidence: EvidenceEntry[] = [];
  // ★ F-364 FIX (2026-09-24): last-run snapshot policy — concurrent execute() calls
  //   share this field, so an older call finishing late must not clobber a newer
  //   call snapshot. Sequence is assigned at call order; publish is
  //   last-caller-wins. Per-run correctness never depended on this field: the local
  //   evidence array rides to buildOutput for the run that built it.
  private evidenceSeq = 0;
  private publishedSeq = 0;

  constructor(config: PipelineConfig<TInput, TSubResult, TSynthesis, TOutput>) {
    this.config = config;
  }

  // ★ F-203 FIX (2026-09-24): per-run evidence target — the instance-level
  //   array raced across concurrent execute() calls (reset + interleaved pushes).
  private log(kind: string, data: Record<string, unknown>, target: EvidenceEntry[] = this.evidence): void {
    target.push({ kind, at: Date.now(), data });
  }

  async execute(input: TInput): Promise<TOutput> {
    if (this.config.subagents.length === 0) {
      throw new Error(`[${this.config.name}] GATE FAILED: subagents — pipeline requires at least 1 subagent`);
    }
    const t0 = Date.now();
    const seq = ++this.evidenceSeq;
    // ★ F-203 FIX (2026-09-24): LOCAL evidence per execute() — concurrent runs
    //   no longer share/reset one array. The public field keeps a last-run
    //   snapshot for the sequential readers (replaces the F-141 reset).
    const evidence: EvidenceEntry[] = [];
    this.log("PIPELINE_START", { name: this.config.name, at: t0 }, evidence);

    for (const gate of this.config.gates.pre) {
      this.log("GATE_CHECK", { gate: gate.name, phase: "pre" }, evidence);
      const result = await gate.check(input);
      if (!result.passed) this.failLoud(gate, result.reason ?? "pre-gate failed");
    }

    // ★ F-202 FIX (2026-09-24): honor the declared targetRootFor/graphPathFor
    //   extractors — execute() read raw input fields and the config fns were dead.
    let targetRoot: string;
    let graphPath: string;
    try {
      targetRoot = String(this.config.targetRootFor(input) ?? "");
      graphPath = String(this.config.graphPathFor(input) ?? "");
    } catch (e) {
      throw new Error(`[${this.config.name}] GATE FAILED: input — targetRootFor/graphPathFor threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (targetRoot.trim() === "" || graphPath.trim() === "") {
      throw new Error(`[${this.config.name}] GATE FAILED: input — targetRoot and graphPath required`);
    }
    this.log("GRAPH_EXTRACT_START", {}, evidence);
    let graph: GraphifyGraph;
    try {
      graph = await readGraphJson(graphPath);
    } catch (e) {
      throw new Error(`[${this.config.name}] GRAPH_LOAD_FAILED: ${String((e as Error).message ?? e)}`);
    }
    this.log("GRAPH_EXTRACT_DONE", { nodeCount: graph.nodes.length, edgeCount: graph.edges.length, durationMs: Date.now() - t0 }, evidence);

    this.log("DISPATCH_START", {
      subagentCount: this.config.subagents.length,
      subagentIds: this.config.subagents.map((s) => s.id),
    }, evidence);
    const dispatchT0 = Date.now();
    const settled = await Promise.allSettled(this.config.subagents.map((spec) => spec.run(input, graph)));
    const dispatchDuration = Date.now() - dispatchT0;

    const results: SubagentSettlement<TSubResult>[] = settled.map((outcome, i) => {
      const id = this.config.subagents[i]!.id;
      if (outcome.status === "fulfilled") return { subagentId: id, status: "fulfilled" as const, value: outcome.value };
      const raw = outcome.reason;
      return { subagentId: id, status: "rejected" as const, reason: raw instanceof Error ? raw : new Error(String(raw)) };
    });
    for (const r of results) {
      this.log(r.status === "rejected" ? "SUBAGENT_REJECTED" : "SUBAGENT_FULFILLED", {
        subagentId: r.subagentId,
        ...(r.status === "rejected" ? { error: String(r.reason) } : {}),
      }, evidence);
    }
    this.log("DISPATCH_DONE", {
      durationMs: dispatchDuration,
      fulfilled: results.filter((r) => r.status === "fulfilled").length,
      rejected: results.filter((r) => r.status === "rejected").length,
    }, evidence);

    this.log("SYNTHESIZE_START", {}, evidence);
    // ★ F-1205 FIX (2026-09-25): evidence died with the throw — SYNTHESIZE_START, a failed
    //   post-gate check, and PIPELINE_DONE were appended to the LOCAL array AFTER buildOutput
    //   had its snapshot, and any synthesizer/gate throw skipped the publish below, so the only
    //   externally-readable surface (this.evidence) showed nothing of a failed run. Publish on
    //   ALL exits: the try body runs synthesis → gates → output; the catch publishes the partial
    //   trail (with a PIPELINE_FAILED entry) then re-throws; success publishes as before.
    try {
      const synthesis = await this.config.synthesizer(results, graph);
      this.log("SYNTHESIZE_DONE", {}, evidence);
      for (const gate of this.config.gates.post) {
        this.log("GATE_CHECK", { gate: gate.name, phase: "post" }, evidence);
        const result = await gate.check(synthesis);
        if (!result.passed) this.failLoud(gate, result.reason ?? "post-gate failed");
      }
      const output = this.config.buildOutput(synthesis, results, evidence);
      this.log("PIPELINE_DONE", { name: this.config.name, totalDurationMs: Date.now() - t0 }, evidence);
      this.publishRun(seq, evidence);
      return output;
    } catch (e) {
      this.log("PIPELINE_FAILED", { name: this.config.name, error: e instanceof Error ? e.message : String(e) }, evidence);
      this.publishRun(seq, evidence);
      throw e;
    }
  }

  /**
   * AETHER_MIGRATION stub (fork pipeline.ts:145-161 verbatim in intent): the old
   * buildAndRunSubagent path is dead — the live path fans out via spec.run (the
   * runMetaLayer role). This stub is intentionally unreachable; it throws to
   * enforce migration. Documented by battery, never revived.
   */
  async dispatchSubagent(
    _spec: SubagentSpec<TInput, TSubResult>,
    _input: TInput,
    _graph: GraphifyGraph,
    _tools: unknown[],
  ): Promise<TSubResult> {
    throw new Error("AETHER_MIGRATION: buildAndRunSubagent removed — the primary path fans out via spec.run (runTemplateAudit) with Promise.allSettled settlement");
  }

  private publishRun(seq: number, evidence: EvidenceEntry[]): void {
    // ★ F-1205 helper (2026-09-25): the single-call snapshot publish (F-212 splice→length+push
    //   per F-814, F-364 last-caller-wins seq gate) — shared by the success and failure exits.
    if (seq >= this.publishedSeq) {
      this.evidence.length = 0;
      for (const entry of evidence) {
        this.evidence.push(entry);
      }
      this.publishedSeq = seq;
    }
  }

  private failLoud<T>(gate: GateCheck<T>, reason: string): never {
    throw new Error(`[${this.config.name}] GATE FAILED: ${gate.name} — ${reason}`);
  }
}
