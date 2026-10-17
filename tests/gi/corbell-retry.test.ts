import { describe, expect, test } from "bun:test";
import { isSqliteBusy, withCorbellBusyRetry } from "../../src/gi/index";

describe("GI-1 corbell SQLITE_BUSY retry", () => {
  test("a transient SQLITE_BUSY succeeds after bounded backoff", async () => {
    const delays: number[] = [];
    let calls = 0;
    const value = await withCorbellBusyRetry(
      () => {
        calls += 1;
        if (calls < 3) throw new Error("SQLITE_BUSY: database is locked");
        return "ok";
      },
      {
        maxAttempts: 5,
        baseDelayMs: 10,
        capDelayMs: 15,
        maxTotalDelayMs: 100,
        sleep: async (ms) => {
          delays.push(ms);
        },
      },
    );
    expect(value).toBe("ok");
    expect(calls).toBe(3);
    expect(delays).toEqual([10, 15]);
    for (const delay of delays) expect(delay).toBeLessThanOrEqual(15);
  });

  test("exhausted retries fail clearly with CORBELL_SQLITE_BUSY", async () => {
    const delays: number[] = [];
    let calls = 0;
    await expect(
      withCorbellBusyRetry(
        () => {
          calls += 1;
          throw new Error("database is locked");
        },
        {
          maxAttempts: 4,
          baseDelayMs: 5,
          capDelayMs: 20,
          maxTotalDelayMs: 1000,
          sleep: async (ms) => {
            delays.push(ms);
          },
        },
      ),
    ).rejects.toThrow(/CORBELL_SQLITE_BUSY: database remained locked after 4 bounded retries/);
    expect(calls).toBe(4);
    expect(delays.length).toBe(3);
    expect(Math.max(...delays)).toBeLessThanOrEqual(20);
  });

  test("the total wait is bounded and stops before maxAttempts", async () => {
    let calls = 0;
    let waited = 0;
    await expect(
      withCorbellBusyRetry(
        () => {
          calls += 1;
          throw new Error("SQLITE_BUSY");
        },
        {
          maxAttempts: 10,
          baseDelayMs: 50,
          capDelayMs: 50,
          maxTotalDelayMs: 60,
          sleep: async (ms) => {
            waited += ms;
          },
        },
      ),
    ).rejects.toThrow(/CORBELL_SQLITE_BUSY/);
    expect(calls).toBe(2);
    expect(waited).toBeLessThanOrEqual(60);
  });

  test("a non-busy error is not retried", async () => {
    let calls = 0;
    await expect(
      withCorbellBusyRetry(
        () => {
          calls += 1;
          throw new Error("UNIQUE constraint failed");
        },
        {
          maxAttempts: 5,
          sleep: async () => {
            throw new Error("sleep should not run");
          },
        },
      ),
    ).rejects.toThrow(/UNIQUE constraint failed/);
    expect(calls).toBe(1);
    expect(isSqliteBusy(new Error("no such table"))).toBe(false);
  });
});
