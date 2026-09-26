/**
 * Matches a logged content item to an Instagram media item by permalink.
 * Pure/deterministic on purpose — the sync must never guess by caption
 * text or posted date, only an exact (normalized) URL match, so a
 * mismatch fails loud (unmatched) rather than silently attaching metrics
 * to the wrong post.
 */
export function normalizeInstagramUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url.trim())
    const path = parsed.pathname.replace(/\/+$/, '').toLowerCase()
    return `${parsed.hostname.replace(/^www\./, '').toLowerCase()}${path}`
  } catch {
    return null
  }
}

export function urlsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const normalizedA = normalizeInstagramUrl(a)
  const normalizedB = normalizeInstagramUrl(b)
  return normalizedA !== null && normalizedA === normalizedB
}
