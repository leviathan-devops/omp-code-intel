import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export interface Snapshot {
  tag: string;
  contentHash: string;
  mtime: number;
}

export class TagStore {
  private readonly snapshots = new Map<string, Snapshot>();

  tagOf(text: string): string {
    return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 4);
  }

  snapshot(absPath: string, text: string): string {
    const contentHash = createHash("sha256").update(text, "utf8").digest("hex");
    const tag = contentHash.slice(0, 4);
    this.snapshots.set(absPath, { tag, contentHash, mtime: Date.now() });
    return tag;
  }

  currentTag(absPath: string): string | null {
    let text: string;
    try {
      text = readFileSync(absPath, "utf8");
    } catch {
      return null;
    }
    return this.tagOf(text);
  }

  verify(absPath: string, tag: string): boolean {
    const snap = this.snapshots.get(absPath);
    if (snap === undefined) return false;
    const current = this.currentTag(absPath);
    if (current === null) return false;
    return snap.tag === tag && tag === current;
  }

  retag(absPath: string, text: string): string {
    return this.snapshot(absPath, text);
  }

  invalidate(absPath: string): void {
    this.snapshots.delete(absPath);
  }

  get(absPath: string): Snapshot | undefined {
    return this.snapshots.get(absPath);
  }
}

export const store = new TagStore();
