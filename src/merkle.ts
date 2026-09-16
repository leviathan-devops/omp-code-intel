// src/merkle.ts — Merkle evidence pipeline (W2-A).
//
// Port of the proven 88-line trident-omp EvidencePipeline
// (trident/src/subagents/trident-build/harness/evidence-pipeline.ts —
// NOTE: the OMP_WORKSPACE path named in the wave brief does not exist;
// the canonical copy lives under trident/src/subagents/trident-build/):
// same MerkleNode fields, same hash construction
// (prev|"root"|ts|tool|passed|dataHash joined with "|"), same append-only
// JSONL persistence, same verify-walks-previousHash-links semantics.
//
// Adaptations for omp-code-intel (CONTRACTS-W2, exact spec):
// - default base ".mimocode/omp-intel". A relative base resolves against
//   process.cwd() AT CALL TIME (not at construction); an absolute base
//   passes through untouched — the plugin passes an absolute base when
//   available, the evidence tool derives one from ctx.directory.
// - contract method names: chainLength() / lastHash() / verify().
// - persistence failure is non-fatal AND loud (ported posture, made loud):
//   record() console.warns naming the tool + the error and still returns
//   the node; verify()/chainLength() expose any gap on the next fresh load.
// - loadChain() replaces in-memory state with the fresh disk state
//   (malformed lines skipped), so re-loading never duplicates rows —
//   src/evidence.ts constructs a pipeline (which already loads) and then
//   calls loadChain() again for an explicit fresh read; without the
//   replace-semantics that double-load would double the chain.

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface MerkleNode {
  hash: string;
  previousHash: string | null;
  timestamp: number;
  tool: string;
  passed: boolean;
  dataHash: string;
}

const CHAIN_FILE = "merkle-chain.jsonl";

export const DEFAULT_INTEL_BASE = ".mimocode/omp-intel";

export class EvidencePipeline {
  private chain: MerkleNode[] = [];
  private readonly basePath: string;

  constructor(basePath: string = DEFAULT_INTEL_BASE) {
    this.basePath = basePath;
    this.loadChain();
  }

  private chainFile(): string {
    const base = path.isAbsolute(this.basePath)
      ? this.basePath
      : path.join(process.cwd(), this.basePath);
    return path.join(base, CHAIN_FILE);
  }

  // Load chain from disk, replacing in-memory state. Malformed lines are
  // skipped; a missing file means a fresh chain (no throw, empty chain).
  loadChain(): void {
    const fresh: MerkleNode[] = [];
    try {
      const data = readFileSync(this.chainFile(), "utf8");
      const lines = data.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length === 0) continue;
        try {
          fresh.push(JSON.parse(line) as MerkleNode);
        } catch {
          // Skip malformed lines (ported posture).
        }
      }
    } catch {
      // Fresh start — no chain file yet.
    }
    this.chain = fresh;
  }

  record(toolName: string, data: unknown, passed: boolean): MerkleNode {
    const dataHash = createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex")
      .slice(0, 16);
    const previousHash =
      this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : null;

    const now = Date.now();
    const nodeContent = [previousHash ?? "root", now, toolName, String(passed), dataHash].join("|");
    const hash = createHash("sha256").update(nodeContent).digest("hex").slice(0, 16);

    const node: MerkleNode = {
      hash,
      previousHash,
      timestamp: now,
      tool: toolName,
      passed,
      dataHash,
    };

    // SIDE-EFFECT-BEFORE-CLAIM (MERKLE RECORDING ORDER LAW): the JSONL row
    // lands on disk BEFORE record() returns. Never batch/defer.
    this.chain.push(node);
    this.persist(node);
    return node;
  }

  private persist(node: MerkleNode): void {
    try {
      mkdirSync(path.dirname(this.chainFile()), { recursive: true });
      appendFileSync(this.chainFile(), JSON.stringify(node) + "\n");
    } catch (err) {
      // Ported non-fatal posture, made loud: record() still returns the
      // node; the gap surfaces via chainLength()/verify() on fresh loads.
      const detail = err instanceof Error ? err.message : String(err);
      console.warn(`[omp-intel merkle] persist failed for tool=${node.tool}: ${detail}`);
    }
  }

  chainLength(): number {
    return this.chain.length;
  }

  lastHash(): string | null {
    return this.chain.length > 0 ? this.chain[this.chain.length - 1].hash : null;
  }

  verify(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      if (this.chain[i].previousHash !== this.chain[i - 1].hash) return false;
    }
    return this.chain.length > 0; // empty chain verifies false (SPEC-named)
  }
}

// Shared-instance helper for src/index.ts (W2-C): one pipeline per base so
// the hook and the evidence tool observe the same chain file.
export function newPipeline(base?: string): EvidencePipeline {
  return new EvidencePipeline(base);
}
