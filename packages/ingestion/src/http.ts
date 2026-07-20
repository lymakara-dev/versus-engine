/**
 * Minimal token-bucket-ish rate limiter: guarantees at least `minIntervalMs`
 * between the start of consecutive calls made through the returned throttle().
 * Every network-calling adapter (vPIC, future scrapers) must wrap its
 * requests with one of these so a batch ingest run doesn't hammer a source.
 */
export function createRateLimiter(minIntervalMs: number) {
  let lastCallAt = 0;

  async function throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const wait = Math.max(0, lastCallAt + minIntervalMs - now);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastCallAt = Date.now();
    return fn();
  }

  return { throttle };
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
