/** Tracked blobs at or above this size are treated as large backups. Source on master is far below it. */
export const LARGE_FILE_MAX_BYTES = 1_000_000;

export interface BackupVerdict {
  backup: boolean;
  reason: string | null;
}

/**
 * A path is a tracked backup when it is a sqlite/bak artifact, lives under
 * graphify-out or a backups directory, or is simply too large to be source.
 */
export function isTrackedBackup(relPath: string, bytes: number): BackupVerdict {
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (bytes >= LARGE_FILE_MAX_BYTES) {
    return { backup: true, reason: `size ${bytes} >= ${LARGE_FILE_MAX_BYTES}` };
  }
  if (norm.endsWith(".sqlite") || norm.endsWith(".sqlite3") || norm.endsWith(".bak")) {
    return { backup: true, reason: "backup suffix" };
  }
  if (norm === "graphify-out" || norm.startsWith("graphify-out/")) {
    return { backup: true, reason: "graphify-out" };
  }
  const segments = norm.split("/");
  if (segments.some((segment) => segment === "backups" || segment === "backup")) {
    return { backup: true, reason: "backup directory" };
  }
  return { backup: false, reason: null };
}
