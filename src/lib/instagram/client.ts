/**
 * Server-only Instagram API client — plain fetch, no SDK, mirroring
 * src/lib/ai/client.ts's own reasoning: this is a low-volume, admin-
 * triggered integration (the "Sync from Instagram" button) plus a
 * personal-brand-scale volume of automated DMs, not something that needs
 * a dependency, and staying on plain fetch keeps the access tokens
 * nowhere near a client bundle by construction.
 *
 * Two unrelated Meta products live in this one file, deliberately kept
 * on separate hosts/tokens/permission namespaces rather than sharing one
 * — mixing them is exactly what caused Graph API error
 * `(#3) Application does not have the capability to make this API call.`
 * on outbound messaging (see docs/INSTAGRAM_AUTOMATIONS_SETUP.md):
 *
 * - CONTENT_API_BASE (graph.facebook.com) + INSTAGRAM_ACCESS_TOKEN —
 *   Facebook Login for Business / the classic Instagram Graph API,
 *   Page-linked. Used only for read-only content sync (media, insights).
 * - MESSAGING_API_BASE (graph.instagram.com) + a token from
 *   src/lib/instagram/tokenStore.ts — Instagram API with Instagram
 *   Login, a separate product with its own `instagram_business_*`
 *   permissions. Used only for outbound messaging (private replies, DMs,
 *   follow-ups). Every messaging call addresses the literal id `me`
 *   rather than INSTAGRAM_BUSINESS_ACCOUNT_ID — that id comes from the
 *   Facebook Login flow's Page→Instagram link and is not guaranteed to
 *   be the same value under Instagram Login (Meta's own docs distinguish
 *   the two), so reusing it here would just reintroduce the same kind of
 *   cross-flow mismatch. `me` is Meta's own documented pattern for this
 *   API and sidesteps the question entirely.
 *
 *   The messaging token itself now lives in the database
 *   (instagram_integration_credentials, encrypted at rest), not directly
 *   in INSTAGRAM_MESSAGING_ACCESS_TOKEN — that env var only seeds the
 *   database once (see tokenStore.bootstrapMessagingTokenIfNeeded) and
 *   is refreshed automatically from then on. See tokenStore.ts for why.
 */
import 'server-only'
import { getCurrentMessagingToken, refreshAfterAuthFailure } from './tokenStore'

const GRAPH_API_VERSION = 'v21.0'
const CONTENT_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const MESSAGING_API_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`
const REQUEST_TIMEOUT_MS = 15000

export function isInstagramConfigured(): boolean {
  return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID)
}

export type InstagramResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: number }

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
  /** The playable/full-res file — absent for video-ish types where
   * Instagram only exposes a thumbnail instead (see thumbnail_url). */
  media_url: string | null
  /** Only present on VIDEO/REELS media; images have no separate
   * thumbnail — use media_url for those instead. */
  thumbnail_url: string | null
}

/**
 * Maps Instagram's media/product type onto this project's own
 * content_type enum — best-effort only, since neither an auto-created
 * content item nor the automation media picker has any way to know which
 * of "reel"/"post" the admin would call it beyond what Instagram itself
 * reports.
 */
export function mapContentType(media: Pick<InstagramMedia, 'media_type' | 'media_product_type'>): 'reel' | 'story' | 'carousel' | 'post' | 'other' {
  if (media.media_product_type === 'REELS') return 'reel'
  if (media.media_product_type === 'STORY') return 'story'
  if (media.media_type === 'CAROUSEL_ALBUM') return 'carousel'
  if (media.media_type === 'IMAGE' || media.media_type === 'VIDEO') return 'post'
  return 'other'
}

async function apiRequest<T>(
  baseUrl: string,
  accessToken: string | undefined,
  missingTokenError: string,
  method: 'GET' | 'POST',
  path: string,
  params: Record<string, string>,
  body?: unknown
): Promise<InstagramResult<T>> {
  if (!accessToken) {
    return { ok: false, error: missingTokenError }
  }

  const url = new URL(`${baseUrl}/${path}`)
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
      return { ok: false, error: message, code: json?.error?.code }
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
  return apiRequest<T>(CONTENT_API_BASE, process.env.INSTAGRAM_ACCESS_TOKEN, 'INSTAGRAM_ACCESS_TOKEN is not configured', 'GET', path, params)
}

function graphPost<T>(path: string, body: unknown): Promise<InstagramResult<T>> {
  return apiRequest<T>(CONTENT_API_BASE, process.env.INSTAGRAM_ACCESS_TOKEN, 'INSTAGRAM_ACCESS_TOKEN is not configured', 'POST', path, {}, body)
}

/** Meta's OAuthException code for an invalid/expired access token — the signal to try a refresh-and-retry. */
const AUTH_ERROR_CODE = 190

/**
 * POSTs to the messaging API using whatever token tokenStore currently
 * considers current — never process.env directly, so a refreshed token
 * takes effect on the very next send with no redeploy. If the send fails
 * with Meta's "invalid/expired access token" error, attempts exactly one
 * refresh + one retry (never more, so a genuinely dead token can't loop):
 * the retry either succeeds on the freshly refreshed token, or the
 * caller gets back a sanitized message telling the owner to reconnect —
 * the real Meta error/token is never included.
 */
async function messagingPost<T>(path: string, body: unknown): Promise<InstagramResult<T>> {
  const current = await getCurrentMessagingToken()
  if (!current) {
    return { ok: false, error: 'Instagram messaging is not configured' }
  }

  const result = await apiRequest<T>(MESSAGING_API_BASE, current.token, 'Instagram messaging is not configured', 'POST', path, {}, body)
  if (result.ok || result.code !== AUTH_ERROR_CODE || !current.rowId) {
    return result
  }

  const refreshedToken = await refreshAfterAuthFailure(current.rowId)
  if (!refreshedToken) {
    return { ok: false, error: 'Instagram messaging authorization requires reconnection.' }
  }

  return apiRequest<T>(MESSAGING_API_BASE, refreshedToken, 'Instagram messaging is not configured', 'POST', path, {}, body)
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

  const fields =
    'id,permalink,caption,media_type,media_product_type,timestamp,like_count,comments_count,views,media_url,thumbnail_url'
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
 * this is ever called). Goes through the Instagram API with Instagram
 * Login (graph.instagram.com, via messagingPost's tokenStore-backed
 * token), not the Facebook Login content API above — see the file-level
 * comment.
 */
export async function sendPrivateReplyToComment(
  commentId: string,
  message: string,
  button: MessageButton | null = null
): Promise<InstagramResult<{ id: string }>> {
  return messagingPost('me/messages', {
    recipient: { comment_id: commentId },
    message: buildMessagePayload(message, button),
  })
}

/**
 * Posts a public reply on a comment — a normal, publicly-visible comment
 * reply (e.g. "Check your DMs 👀"), NOT the Private Reply DM mechanism
 * above. Deliberately a different endpoint (`/{comment_id}/replies`, not
 * `/me/messages`): Private Reply and public comment reply are two
 * distinct Instagram capabilities, and Meta only allows one Private
 * Reply per comment — this call is unaffected by whether a private
 * reply was already sent (or fails) for the same comment. Same
 * Instagram Login messaging path (graph.instagram.com, via
 * messagingPost) as the rest of this section, since
 * `instagram_business_manage_comments` is part of that token's scope.
 */
export async function replyToComment(commentId: string, message: string): Promise<InstagramResult<{ id: string }>> {
  return messagingPost(`${commentId}/replies`, { message })
}

/**
 * Sends a direct message to an Instagram-scoped user id — used for
 * inbound-DM-keyword replies, story-reply replies, and every follow-up
 * step in a drip sequence. Only deliverable within Meta's standard
 * 24-hour messaging window since the recipient's last message; a
 * follow-up scheduled further out than that will fail at send time (see
 * docs/INSTAGRAM_AUTOMATIONS_SETUP.md) — this function surfaces that as
 * an ordinary `{ ok: false }` result rather than throwing, so the
 * follow-up cron can record it on the run and move on. Same Instagram
 * Login messaging path as sendPrivateReplyToComment above.
 */
export async function sendDirectMessage(
  recipientIgId: string,
  message: string,
  button: MessageButton | null = null
): Promise<InstagramResult<{ id: string }>> {
  return messagingPost('me/messages', {
    recipient: { id: recipientIgId },
    message: buildMessagePayload(message, button),
  })
}
