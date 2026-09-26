/**
 * Server-only Instagram Graph API client — plain fetch, no SDK, mirroring
 * src/lib/ai/client.ts's own reasoning: this is a low-volume, admin-
 * triggered integration (the "Sync from Instagram" button), not
 * something that needs a dependency, and staying on plain fetch keeps
 * INSTAGRAM_ACCESS_TOKEN nowhere near a client bundle by construction.
 */
import 'server-only'

const GRAPH_API_VERSION = 'v21.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const REQUEST_TIMEOUT_MS = 15000

export function isInstagramConfigured(): boolean {
  return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID)
}

export type InstagramResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface InstagramMedia {
  id: string
  permalink: string | null
  caption: string | null
  media_type: string | null
  media_product_type: string | null
  timestamp: string | null
  like_count: number | null
  comments_count: number | null
  /** Not exposed for every media type/age — Meta only backfills this on
   * the media list endpoint, not on a per-media insights lookup. */
  views: number | null
}

async function graphRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  params: Record<string, string>,
  body?: unknown
): Promise<InstagramResult<T>> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!accessToken) {
    return { ok: false, error: 'INSTAGRAM_ACCESS_TOKEN is not configured' }
  }

  const url = new URL(`${GRAPH_API_BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  url.searchParams.set('access_token', accessToken)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    const json = await response.json().catch(() => null)

    if (!response.ok || !json) {
      const message = json?.error?.message || `Instagram API request failed (status ${response.status})`
      console.error('[Instagram] Graph API error', response.status, message)
      return { ok: false, error: message }
    }

    return { ok: true, data: json as T }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    console.error('[Instagram] Exception calling Graph API', isAbort ? 'timed out' : error)
    return { ok: false, error: isAbort ? 'Instagram API request timed out' : 'Instagram API request failed' }
  } finally {
    clearTimeout(timeout)
  }
}

function graphGet<T>(path: string, params: Record<string, string>): Promise<InstagramResult<T>> {
  return graphRequest<T>('GET', path, params)
}

function graphPost<T>(path: string, body: unknown): Promise<InstagramResult<T>> {
  return graphRequest<T>('POST', path, {}, body)
}

/**
 * Fetches every media item on the connected account, newest first,
 * following pagination. `views` is requested directly on the media
 * object (not via /insights) — Meta stopped reliably returning view
 * counts from a single media's /insights lookup in 2026, but it's still
 * available on the media list itself.
 */
export async function fetchAllAccountMedia(): Promise<InstagramResult<InstagramMedia[]>> {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  if (!accountId) {
    return { ok: false, error: 'INSTAGRAM_BUSINESS_ACCOUNT_ID is not configured' }
  }

  const fields = 'id,permalink,caption,media_type,media_product_type,timestamp,like_count,comments_count,views'
  const all: InstagramMedia[] = []
  let after: string | undefined

  for (let page = 0; page < 20; page++) {
    const params: Record<string, string> = { fields, limit: '50' }
    if (after) params.after = after

    const result = await graphGet<{ data: InstagramMedia[]; paging?: { cursors?: { after?: string }; next?: string } }>(
      `${accountId}/media`,
      params
    )
    if (!result.ok) return result

    all.push(...result.data.data)
    after = result.data.paging?.cursors?.after
    if (!result.data.paging?.next || !after) break
  }

  return { ok: true, data: all }
}

export interface InstagramMediaInsights {
  reach: number | null
  saved: number | null
  shares: number | null
}

/**
 * Best-effort fetch of the engagement metrics that are only available
 * via /insights, not on the media object itself. Returns nulls (never
 * throws past this point) on failure — a missing insight for one post
 * must not abort syncing the rest, since Meta's supported metric set
 * varies by media type and has changed release to release.
 */
export async function fetchMediaInsights(mediaId: string): Promise<InstagramMediaInsights> {
  const result = await graphGet<{ data: { name: string; values: { value: number }[] }[] }>(`${mediaId}/insights`, {
    metric: 'reach,saved,shares',
  })

  const empty: InstagramMediaInsights = { reach: null, saved: null, shares: null }
  if (!result.ok) return empty

  const byName: Record<string, number | null> = {}
  for (const metric of result.data.data || []) {
    byName[metric.name] = metric.values?.[0]?.value ?? null
  }

  return {
    reach: byName.reach ?? null,
    saved: byName.saved ?? null,
    shares: byName.shares ?? null,
  }
}

export interface MessageButton {
  url: string
  label: string
}

/**
 * Builds the message payload: plain `{ text }` with no button, or
 * Instagram's Button Template (a text body plus one tappable "web_url"
 * button) when one is attached. Callers pass `button` as `null` rather
 * than omitting it, so it's always explicit whether a button was meant
 * to be there.
 */
function buildMessagePayload(text: string, button: MessageButton | null) {
  if (!button) return { text }

  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text,
        buttons: [{ type: 'web_url', url: button.url, title: button.label }],
      },
    },
  }
}

/**
 * Sends a Private Reply in response to a public comment — the one
 * mechanism Meta allows for turning a comment into a DM. Must be sent
 * within 7 days of the comment; only one per comment is allowed (Meta
 * rejects a second attempt, which the caller never gets to make anyway
 * since src/lib/instagram/automations.ts de-dupes by comment id before
 * this is ever called).
 */
export async function sendPrivateReplyToComment(
  commentId: string,
  message: string,
  button: MessageButton | null = null
): Promise<InstagramResult<{ id: string }>> {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  if (!accountId) {
    return { ok: false, error: 'INSTAGRAM_BUSINESS_ACCOUNT_ID is not configured' }
  }

  return graphPost(`${accountId}/messages`, {
    recipient: { comment_id: commentId },
    message: buildMessagePayload(message, button),
  })
}

/**
 * Sends a direct message to an Instagram-scoped user id — used for
 * inbound-DM-keyword replies, story-reply replies, and every follow-up
 * step in a drip sequence. Only deliverable within Meta's standard
 * 24-hour messaging window since the recipient's last message; a
 * follow-up scheduled further out than that will fail at send time (see
 * docs/INSTAGRAM_AUTOMATIONS_SETUP.md) — this function surfaces that as
 * an ordinary `{ ok: false }` result rather than throwing, so the
 * follow-up cron can record it on the run and move on.
 */
export async function sendDirectMessage(
  recipientIgId: string,
  message: string,
  button: MessageButton | null = null
): Promise<InstagramResult<{ id: string }>> {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  if (!accountId) {
    return { ok: false, error: 'INSTAGRAM_BUSINESS_ACCOUNT_ID is not configured' }
  }

  return graphPost(`${accountId}/messages`, {
    recipient: { id: recipientIgId },
    message: buildMessagePayload(message, button),
  })
}
