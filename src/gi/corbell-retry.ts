export interface CorbellRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  capDelayMs?: number;
  maxTotalDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 50;
const DEFAULT_CAP_DELAY_MS = 400;
const DEFAULT_MAX_TOTAL_DELAY_MS = 1000;

export function isSqliteBusy(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /SQLITE_BUSY|database is locked/i.test(msg);
}

function delayForAttempt(attempt: number, baseDelayMs: number, capDelayMs: number): number {
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  return Math.min(capDelayMs, exponential);
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Run a corbell SQLite op. SQLITE_BUSY / "database is locked" retries with
 * exponential backoff capped per sleep and across the whole call, then fails
 * with CORBELL_SQLITE_BUSY. Any other error is rethrown immediately.
 */
export async function withCorbellBusyRetry<T>(
  op: () => T | Promise<T>,
  options?: CorbellRetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const capDelayMs = options?.capDelayMs ?? DEFAULT_CAP_DELAY_MS;
  const maxTotalDelayMs = options?.maxTotalDelayMs ?? DEFAULT_MAX_TOTAL_DELAY_MS;
  const sleep = options?.sleep ?? defaultSleep;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error(`CORBELL_RETRY_INVALID: maxAttempts=${String(maxAttempts)}`);
  }
  if (baseDelayMs < 0 || capDelayMs < 0 || maxTotalDelayMs < 0) {
    throw new Error("CORBELL_RETRY_INVALID: delays must be >= 0");
  }

  let waited = 0;
  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await op();
    } catch (err) {
      if (!isSqliteBusy(err)) throw err;
      last = err;
      if (attempt === maxAttempts) break;
      const delay = delayForAttempt(attempt, baseDelayMs, capDelayMs);
      if (delay <= 0 || waited + delay > maxTotalDelayMs) break;
      await sleep(delay);
      waited += delay;
    }
  }
  const cause = last instanceof Error ? last.message : String(last);
  throw new Error(
    `CORBELL_SQLITE_BUSY: database remained locked after ${maxAttempts} bounded retries (backoff cap ${capDelayMs}ms, waited ${waited}ms). Last error: ${cause}`,
    { cause: last },
  );
}
