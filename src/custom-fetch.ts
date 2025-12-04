/** Create a custom `fetch`-like function that respects a certain rate limit.
 * Requests are sent at most once every `rateLimit` milliseconds; for Notion's
 * API, this should be set to around `500` (to be on the safe side). Notion is
 * a bit fuzzy on the details, saying they "allow for spikes" but we're not
 * taking any chances here. */
export function createRateLimitedFetch(rateLimit: number): typeof fetch {
  let queue = Promise.resolve();
  return async function rateLimitedFetch(url, options) {
    const delay = queue;
    queue = delay.then(() => wait(rateLimit));
    await delay;
    return await fetch(url, options);
  };
}

/** A helper function that waits a specified number of milliseconds before
 * resolving. */
async function wait(time: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, time));
}
