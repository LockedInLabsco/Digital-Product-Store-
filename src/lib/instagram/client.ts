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
 * - CONTENT_API_BASE (graph.facebook.com) — Facebook Login for Business /
 *   the classic Instagram Graph API, Page-linked. Used only for read-only
 *   content sync (media, insights). As of the Social Workspace Foundation
 *   Phase G refactor, every function on this side (fetchAllAccountMedia,
 *   fetchMediaInsights) takes its Instagram account id + access token as
 *   an explicit argument instead of reading
 *   INSTAGRAM_ACCESS_TOKEN/INSTAGRAM_BUSINESS_ACCOUNT_ID from
 *   process.env — those env vars are no longer read anywhere in this
 *   file. Callers resolve the right account/token per workspace via
 *   src/lib/instagram/contentAccountResolution.ts
 *   (resolveContentAccountForWorkspace), which reads the per-connected-
 *   account `social_account_tokens` row (provider='facebook_login')
 *   instead. The legacy env vars still exist only as a one-time seed for
 *   that table (src/lib/social/backfillWorkspace.ts) — never consulted on
 *   a normal request path anymore.
 * - MESSAGING_API_BASE (graph.instagram.com) + a per-connected-account
 *   token from src/lib/instagram/tokenStore.ts's getMessagingTokenForAccount()
 *   — Instagram API with Instagram Login, a separate product with its
 *   own `instagram_business_*` permissions. Used only for outbound
 *   messaging (private replies, DMs, follow-ups). Every messaging call
 *   addresses the literal id `me` rather than an explicit business
 *   account id — that id comes from the Facebook Login flow's
 *   Page→Instagram link and is not guaranteed to be the same value under
 *   Instagram Login (Meta's own docs distinguish the two), so reusing it
 *   here would just reintroduce the same kind of cross-flow mismatch.
 *   `me` is Meta's own documented pattern for this API and sidesteps the
 *   question entirely — it resolves to whichever account the TOKEN BEING
 *   USED belongs to, which is exactly why every send function below
 *   requires an explicit `connectedAccountId` rather than ever falling
 *   back to one global token (see messagingPostForAccount). The OLD
 *   global-singleton send path (tokenStore.ts's getCurrentMessagingToken/
 *   refreshAfterAuthFailure, with its auto-refresh-on-401 retry) is no
 *   longer used by any send function here — automation execution
 *   (processTrigger.ts, the follow-up cron) now always resolves a
 *   specific connected account's own token. tokenStore.ts itself, and
 *   its status/reconnect endpoints for the legacy row, are untouched —
 *   this is purely about which token a SEND actually uses. No automatic
 *   refresh-on-401 exists yet for a per-account token; a failure here is
 *   simply reported, not retried — a future per-account refresh cron is
 *   a known, separately-scoped gap, not built here.
 */
import 'server-only'
import { getMessagingTokenForAccount } from './tokenStore'

// v21.0 was the real root cause of "views never syncs" (reported after
// the Issue 2 fix below): Meta did not introduce the `views` INSIGHTS
// metric until v22.0 (2025-01-21) — v21.0 simply has no such metric, so
// the combined insights request's per-metric fallback correctly
// recovered reach/saved/shares but always got views=null, no matter how
// correctly it was requested. v23.0 postdates v22.0 (so `views` exists),
// has no breaking changes for Instagram media/OAuth/webhooks between
// v21.0 and here (verified against Meta's own v22.0/v23.0 Graph API
// changelogs), and isn't due to expire until 2027-10-08 — plenty of
// runway. Do not revert this without re-confirming `views` support.
export const GRAPH_API_VERSION = 'v23.0'
const CONTENT_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const MESSAGING_API_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`
const REQUEST_TIMEOUT_MS = 15000

export type InstagramResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: number }

export interface InstagramMedia {
  id: string
  permalink: string | null
  caption: string | null
  media_type: string | null
  /** KNOWN LIMITATION, verified against Meta's current IG Media
   * reference: this field is "Available for Instagram API with
   * Facebook Login only" — an Instagram-Login-sourced media list (see
   * `provider` on InstagramAccountCredentials) will never populate
   * this, so mapContentType() below silently falls through to
   * media_type-only classification for those accounts (a Reel
   * misclassified as a generic 'post'). Not fixed here — this phase's
   * scope is the metrics themselves (Issue 2), not content-type
   * labeling; flagged for separate follow-up rather than guessed at. */
  media_product_type: string | null
  timestamp: string | null
  like_count: number | null
  comments_count: number | null
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
 * reports. See InstagramMedia.media_product_type's own doc comment for
 * the Facebook-Login-only limitation this inherits.
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

/**
 * `host` routes a content read to the Graph API that issued the token
 * being used — graph.facebook.com for a facebook_login content token
 * (the original flow), graph.instagram.com for an instagram_login one
 * (Phase G/Direct Instagram Login — verified against Meta's current
 * docs that instagram_business_basic/instagram_business_manage_comments
 * cover media + insights reads on this host, not just messaging).
 * Defaults to CONTENT_API_BASE so every pre-Phase-G call site (which
 * never passed a host) is unchanged.
 */
function graphGet<T>(accessToken: string, path: string, params: Record<string, string>, host: string = CONTENT_API_BASE): Promise<InstagramResult<T>> {
  return apiRequest<T>(host, accessToken, 'Instagram content access token is required', 'GET', path, params)
}

function graphPost<T>(accessToken: string, path: string, body: unknown): Promise<InstagramResult<T>> {
  return apiRequest<T>(CONTENT_API_BASE, accessToken, 'Instagram content access token is required', 'POST', path, {}, body)
}

/**
 * POSTs to the messaging API using the token stored for ONE specific
 * connected account (social_account_tokens, provider='instagram_login')
 * — never a global/env-var singleton. Each connected Instagram account
 * sends from its own token, which is the whole point: a workspace's
 * automation must never be able to send as a different workspace's
 * account. No facebook_login fallback exists (or should exist) here —
 * that provider's token is only ever valid against graph.facebook.com
 * for read-only content/insights, never graph.instagram.com for
 * messaging; see this file's own header.
 *
 * No auto-refresh-on-401 retry (unlike the legacy singleton's
 * messagingPost, which this replaces) — there is no per-account refresh
 * mechanism yet (see tokenStore.ts's getMessagingTokenForAccount doc
 * comment); an auth failure here is simply reported on the run, same as
 * every other send failure, rather than retried.
 */
async function messagingPostForAccount<T>(connectedAccountId: string, path: string, body: unknown): Promise<InstagramResult<T>> {
  const current = await getMessagingTokenForAccount(connectedAccountId)
  if (!current) {
    return { ok: false, error: 'No Instagram messaging token is stored for this connected account. Reconnect Instagram for this workspace.' }
  }

  return apiRequest<T>(MESSAGING_API_BASE, current.token, 'Instagram messaging is not configured for this connected account', 'POST', path, {}, body)
}

export interface InstagramAccountCredentials {
  /** social_connected_accounts.external_account_id — the Instagram
   * Business Account id to query, resolved per-workspace by
   * src/lib/instagram/contentAccountResolution.ts. Never a global/env
   * default. */
  instagramAccountId: string
  /** The decrypted content/insights token for that same account. */
  accessToken: string
  /** Which OAuth product issued accessToken — determines which Graph
   * API host to call (see contentAccountResolution.ts's
   * ResolvedContentAccount.provider). Defaults to 'facebook_login' so
   * every pre-Phase-G caller is unchanged. */
  provider?: 'facebook_login' | 'instagram_login'
}

function hostForProvider(provider: InstagramAccountCredentials['provider']): string {
  return provider === 'instagram_login' ? MESSAGING_API_BASE : CONTENT_API_BASE
}

/**
 * Fetches every media item on the given account, newest first, following
 * pagination. Views are NOT requested here — verified against Meta's
 * current IG Media reference that the base-field equivalent
 * (`view_count`) is "Available for Business Discovery API only" (i.e.
 * never for our own account's own media); the real current source for
 * this number is the `views` INSIGHTS metric, fetched per-media by
 * fetchMediaInsights below.
 *
 * Takes the account/token explicitly — the caller (a workspace-scoped API
 * route) is responsible for resolving which account that is, via
 * resolveContentAccountForWorkspace. This function has no concept of
 * "the" Instagram account and never falls back to one.
 */
export async function fetchAllAccountMedia({ instagramAccountId, accessToken, provider }: InstagramAccountCredentials): Promise<InstagramResult<InstagramMedia[]>> {
  const fields = 'id,permalink,caption,media_type,media_product_type,timestamp,like_count,comments_count,media_url,thumbnail_url'
  const all: InstagramMedia[] = []
  let after: string | undefined
  const host = hostForProvider(provider)

  for (let page = 0; page < 20; page++) {
    const params: Record<string, string> = { fields, limit: '50' }
    if (after) params.after = after

    const result = await graphGet<{ data: InstagramMedia[]; paging?: { cursors?: { after?: string }; next?: string } }>(
      accessToken,
      `${instagramAccountId}/media`,
      params,
      host
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
  /** Was a base media field (`fields=...,views,...`) until this fix —
   * verified against Meta's current IG Media reference that the
   * equivalent base field is actually `view_count`, and is documented
   * as "Available for Business Discovery API only" (i.e. not for our
   * own account's own media at all). `views` the INSIGHTS metric,
   * requested here, is Meta's real current source for this number —
   * confirmed current (per Meta's Insights guide) as universally
   * available across Feed and Reels media, the same as reach/shares. */
  views: number | null
}

/** Verified against Meta's current Instagram Platform Insights guide:
 * these four are each valid for every media type this app ever syncs
 * (Feed — IMAGE/VIDEO/CAROUSEL_ALBUM — and REELS); `saved` specifically
 * is Feed+Reels-only but that already covers everything we sync (we
 * never sync ephemeral Stories as pb_content_items). Kept as one list
 * — rather than branching by media type — because every entry here is
 * already valid for every type we have; INSIGHTS_METRICS_INDIVIDUAL
 * below exists only as the per-metric fallback if Meta ever rejects the
 * combined request for a specific media (e.g. a future media type, or a
 * metric Meta changes/retires again) — see fetchMediaInsights. */
const INSIGHTS_METRICS = ['reach', 'saved', 'shares', 'views']

/**
 * Fetch of the engagement metrics that are only available via
 * /insights, not on the media object itself. Never throws — a missing
 * insight for one post must not abort syncing the rest, since Meta's
 * supported metric set varies by media type and has changed release to
 * release — but UNLIKE before, a failure is now logged with safe
 * structured diagnostics (never silently converted to zero without a
 * trace) and, on a combined-request failure, retried one metric at a
 * time so a single Meta-rejected metric can't zero out the other three.
 *
 * Takes the access token explicitly, same as fetchAllAccountMedia — a
 * media id alone doesn't reveal which workspace's account it belongs to,
 * so the caller must pass the token it already resolved for that media's
 * sync run.
 */
export async function fetchMediaInsights({
  mediaId,
  accessToken,
  provider,
  mediaType,
}: { mediaId: string; accessToken: string; mediaType?: string | null } & Pick<InstagramAccountCredentials, 'provider'>): Promise<InstagramMediaInsights> {
  const host = hostForProvider(provider)
  const empty: InstagramMediaInsights = { reach: null, saved: null, shares: null, views: null }

  const result = await graphGet<{ data: { name: string; values: { value: number }[] }[] }>(
    accessToken,
    `${mediaId}/insights`,
    { metric: INSIGHTS_METRICS.join(',') },
    host
  )

  if (result.ok) {
    const byName: Record<string, number | null> = {}
    for (const metric of result.data.data || []) {
      byName[metric.name] = metric.values?.[0]?.value ?? null
    }
    return { reach: byName.reach ?? null, saved: byName.saved ?? null, shares: byName.shares ?? null, views: byName.views ?? null }
  }

  console.error('[Instagram Insights]', 'instagram_insights_metric_unsupported', JSON.stringify({ mediaId, mediaType: mediaType ?? 'unknown', requestedMetrics: INSIGHTS_METRICS, error: result.error, code: result.code }))

  // Fall back to one metric at a time — Meta's combined-request
  // behavior rejects the WHOLE call if even one requested metric isn't
  // valid for this specific media, so this is what actually salvages
  // the metrics that ARE valid instead of returning every one as null.
  const recovered: Record<string, number | null> = {}
  for (const metric of INSIGHTS_METRICS) {
    const single = await graphGet<{ data: { name: string; values: { value: number }[] }[] }>(accessToken, `${mediaId}/insights`, { metric }, host)
    if (single.ok) {
      recovered[metric] = single.data.data?.[0]?.values?.[0]?.value ?? null
    } else {
      recovered[metric] = null
    }
  }

  const anyRecovered = Object.values(recovered).some((v) => v !== null)
  if (!anyRecovered) {
    console.error('[Instagram Insights]', 'instagram_insights_fetch_failure', JSON.stringify({ mediaId, mediaType: mediaType ?? 'unknown', requestedMetrics: INSIGHTS_METRICS }))
    return empty
  }

  return { reach: recovered.reach ?? null, saved: recovered.saved ?? null, shares: recovered.shares ?? null, views: recovered.views ?? null }
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
 * Login (graph.instagram.com), using `connectedAccountId`'s OWN stored
 * token — never a global token — not the Facebook Login content API
 * above; see the file-level comment.
 */
export async function sendPrivateReplyToComment(
  connectedAccountId: string,
  commentId: string,
  message: string,
  button: MessageButton | null = null
): Promise<InstagramResult<{ id: string }>> {
  return messagingPostForAccount(connectedAccountId, 'me/messages', {
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
 * per-account Instagram Login messaging path (graph.instagram.com) as
 * the rest of this section, since `instagram_business_manage_comments`
 * is part of that token's scope.
 */
export async function replyToComment(connectedAccountId: string, commentId: string, message: string): Promise<InstagramResult<{ id: string }>> {
  return messagingPostForAccount(connectedAccountId, `${commentId}/replies`, { message })
}

/**
 * Sends a direct message to an Instagram-scoped user id — used for
 * inbound-DM-keyword replies, story-reply replies, and every follow-up
 * step in a drip sequence. Only deliverable within Meta's standard
 * 24-hour messaging window since the recipient's last message; a
 * follow-up scheduled further out than that will fail at send time (see
 * docs/INSTAGRAM_AUTOMATIONS_SETUP.md) — this function surfaces that as
 * an ordinary `{ ok: false }` result rather than throwing, so the
 * follow-up cron can record it on the run and move on. Same per-account
 * Instagram Login messaging path as sendPrivateReplyToComment above —
 * `connectedAccountId` determines whose token (and therefore whose
 * Instagram account) actually sends this message.
 */
export async function sendDirectMessage(
  connectedAccountId: string,
  recipientIgId: string,
  message: string,
  button: MessageButton | null = null
): Promise<InstagramResult<{ id: string }>> {
  return messagingPostForAccount(connectedAccountId, 'me/messages', {
    recipient: { id: recipientIgId },
    message: buildMessagePayload(message, button),
  })
}

/** The webhook fields this app actually consumes — see
 * src/app/api/webhooks/instagram/route.ts's own entry.changes[]/
 * entry.messaging[] handling. Keep this list and that route in sync;
 * subscribing to a field we don't parse just means Meta calls the
 * webhook for events we silently ignore. */
export const INSTAGRAM_WEBHOOK_SUBSCRIBED_FIELDS = ['comments', 'messages']

/**
 * Per-account webhook opt-in, required by Meta on top of (and separate
 * from) the app-level field checkboxes in the Dashboard's Webhooks
 * product — verified against Meta's current Instagram Platform docs
 * (developers.facebook.com/docs/instagram-platform/instagram-api-with-
 * instagram-login/webhooks): "Your app must enable subscriptions by
 * sending a POST request to the /me/subscribed_apps endpoint with the
 * subscribed_fields parameter". Checking a field in the Dashboard only
 * declares what the APP is capable of receiving; Meta still won't
 * deliver events for a given professional account until that
 * account's own token has called this. This was the missing step for
 * Direct Instagram Login — the connect flow exchanged tokens and saved
 * the account but never called this, which is exactly consistent with
 * why `messages` never arrived while `comments` did (an earlier,
 * narrower subscription already existed for comments; messages never
 * got one). Takes the account's own long-lived Instagram Login access
 * token — `/me` resolves to whichever account the token belongs to.
 */
export async function subscribeInstagramAccountToWebhooks(accessToken: string): Promise<InstagramResult<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>(
    MESSAGING_API_BASE,
    accessToken,
    'Instagram messaging access token is required to subscribe to webhooks',
    'POST',
    'me/subscribed_apps',
    { subscribed_fields: INSTAGRAM_WEBHOOK_SUBSCRIBED_FIELDS.join(',') }
  )
}

export interface InstagramWebhookSubscriptionEntry {
  /** The Meta App id this subscription belongs to — safe to return (not
   * a secret), and the only way to tell whether the account's current
   * subscription is actually tied to the Direct Instagram Login app vs.
   * a stale one from the legacy Facebook Login app. */
  id: string
  subscribed_fields?: string[]
}

/**
 * GET counterpart to subscribeInstagramAccountToWebhooks — Meta's own
 * record of which field(s) this account's token is CURRENTLY subscribed
 * to, per app. Read-only diagnostic only (never called from the
 * send/automation hot path): lets a "messages never arrives" report be
 * checked against Meta's live state directly instead of trusting a past
 * log line or assuming success from a 200 response alone.
 */
export async function getInstagramAccountWebhookSubscriptions(accessToken: string): Promise<InstagramResult<{ data: InstagramWebhookSubscriptionEntry[] }>> {
  return apiRequest<{ data: InstagramWebhookSubscriptionEntry[] }>(
    MESSAGING_API_BASE,
    accessToken,
    'Instagram messaging access token is required to check webhook subscriptions',
    'GET',
    'me/subscribed_apps',
    {}
  )
}
