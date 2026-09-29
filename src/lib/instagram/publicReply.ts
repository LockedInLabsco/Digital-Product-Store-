/**
 * Picks which public reply variation to send next. Pure/deterministic —
 * given the same inputs it always returns the same index, so the actual
 * "what did we send last" lookup lives in the caller
 * (src/lib/instagram/processTrigger.ts), not here.
 *
 * Round-robins through `variations` in order: index 0, 1, 2, 0, 1, 2, ...
 * — this guarantees the next pick is never the same as the last one
 * whenever there's more than one variation, satisfying "avoid sending
 * the same variation repeatedly when possible" without needing
 * randomness (or a separate counter column to keep in sync).
 */
export function pickPublicReplyVariationIndex(variationCount: number, lastUsedIndex: number | null): number {
  if (variationCount <= 1) return 0
  if (lastUsedIndex === null) return 0
  return (lastUsedIndex + 1) % variationCount
}
