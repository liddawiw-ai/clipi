// Use server time for the round and monotonic time between syncs.
export function createRoundClock(readMonotonic = () => performance.now(), fallback = Date.now) {
  let offset = null;
  return {
    now: () => offset === null ? fallback() : readMonotonic() + offset,
    async sync(fetchTime) {
      const start = readMonotonic();
      const server = await fetchTime();
      const end = readMonotonic();
      if (Number.isSafeInteger(server) && server > 0 && end - start < 2000) {
        offset = server - (start + end) / 2;
      }
    },
  };
}
