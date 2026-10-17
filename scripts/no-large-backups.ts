import { execFileSync } from "node:child_process";
import { LARGE_FILE_MAX_BYTES, isTrackedBackup } from "../src/gi/backup-guard";

const listed = execFileSync("git", ["ls-files", "-s", "-z"], { encoding: "utf8" });
const offenders: string[] = [];

for (const entry of listed.split("\0")) {
  if (entry.length === 0) continue;
  const tab = entry.indexOf("\t");
  if (tab < 0) continue;
  const rel = entry.slice(tab + 1);
  const sha = entry.slice(0, tab).split(" ")[1];
  if (sha === undefined || sha.length === 0) continue;
  const bytes = Number(execFileSync("git", ["cat-file", "-s", sha], { encoding: "utf8" }).trim());
  const verdict = isTrackedBackup(rel, bytes);
  if (!verdict.backup) continue;
  offenders.push(`${rel} (${bytes} bytes, ${verdict.reason})`);
}

if (offenders.length > 0) {
  for (const line of offenders) console.error(`LARGE_BACKUP_TRACKED: ${line}`);
  console.error("no-large-backups: FAIL");
  process.exit(1);
}

console.log(`no-large-backups: HEAD tracks no backup blobs (limit ${LARGE_FILE_MAX_BYTES} bytes)`);
