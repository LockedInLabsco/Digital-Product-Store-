/**
 * Server-side lifecycle management for the Instagram Login messaging
 * token (graph.instagram.com, historically a manually-pasted
 * INSTAGRAM_MESSAGING_ACCESS_TOKEN that quietly expired every ~60 days).
 * See supabase/migrations/0023_instagram_token_store.sql for the table
 * and docs/INSTAGRAM_AUTOMATIONS_SETUP.md for the background.
 *
 * This file owns three things:
 * 1. Reading the current messaging token for outbound sends
 *    (getCurrentMessagingToken) — src/lib/instagram/client.ts calls this
 *    instead of reading INSTAGRAM_MESSAGING_ACCESS_TOKEN directly.
 * 2. One-time bootstrap of the env-var token into the database
 *    (bootstrapMessagingTokenIfNeeded), run lazily on first read.
 * 3. Checking/refreshing the stored token
 *    (refreshMessagingTokenIfDue) — called by the daily cron
 *    (/api/cron/instagram-token-refresh), the admin "Refresh token"
 *    button, and once automatically by the messaging client itself after
 *    an auth failure (see client.ts's messagingPost, via
 *    refreshAfterAuthFailure).
 *
 * Deliberately untouched by any of this: INSTAGRAM_ACCESS_TOKEN, the
 * separate Facebook Graph API token used only by the read-only
 * Insights/content sync. That token keeps reading straight from
 * process.env, exactly as before.
 */
import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { encryptToken, decryptToken } from './tokenCrypto'

const PROVIDER = 'instagram_login'
const ACCOUNT_ID = 'default'
const TABLE = 'instagram_integration_credentials'

// Meta's own rules for this product: a long-lived token can be refreshed
// for another ~60 days via ig_refresh_token, but only once it's at least
// 24 hours old and still unexpired. Refreshing at 10-days-remaining
// (checked daily) leaves wide margin on both ends.
const REFRESH_THRESHOLD_DAYS = 10
const MIN_TOKEN_AGE_HOURS = 24
const LONG_LIVED_SECONDS_FALLBACK = 60 * 24 * 60 * 60 // ~60 days, used only if Meta ever omits expires_in

const INSTAGRAM_OAUTH_BASE = 'https://graph.instagram.com'
const REQUEST_TIMEOUT_MS = 15000

export type TokenType = 'short_lived' | 'long_lived' | 'unknown'
export type RefreshStatus = 'unknown' | 'ok' | 'failed'

interface CredentialRow {
  id: string
  encrypted_access_token: string
  token_type: TokenType
  expires_at: string | null
  last_refreshed_at: string | null
  refresh_status: RefreshStatus
  last_refresh_error: string | null
  created_at: string
  updated_at: string
}

export interface MessagingTokenStatus {
  configured: boolean
  connected: boolean
  needs_reconnect: boolean
  token_type: TokenType | null
  expires_at: string | null
  days_remaining: number | null
  last_refreshed_at: string | null
  refresh_status: RefreshStatus | null
  last_refresh_error: string | null
}

export interface RefreshOutcome {
  status: 'ok' | 'not_due' | 'too_new_to_refresh' | 'refresh_failed' | 'not_configured'
  refreshed: boolean
  token_status: MessagingTokenStatus
}

/**
 * Strips anything that looks like it could be a stray token/secret from
 * Meta error text before it's ever stored or logged. Meta's own error
 * messages are static descriptions, not echoes of the request, so this
 * is defense-in-depth rather than a known leak — but a stored/displayed
 * error string is exactly the kind of place a token must never end up.
 */
function sanitizeMetaError(message: string | null | undefined): string {
  const fallback = 'Instagram API request failed'
  if (!message || typeof message !== 'string') return fallback
  const redacted = message.replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]')
  return redacted.slice(0, 300)
}

async function getRow(): Promise<CredentialRow | null> {
  const { data, error } = await supabaseServer
    .from(TABLE)
    .select('*')
    .eq('provider', PROVIDER)
    .eq('account_id', ACCOUNT_ID)
    .maybeSingle()

  if (error) {
    console.error('[Instagram Token] Failed to read stored token', error.message)
    return null
  }
  return data as CredentialRow | null
}

type OAuthResult = { ok: true; accessToken: string; expiresInSeconds: number | null } | { ok: false; error: string }

async function callInstagramOAuth(path: string, params: Record<string, string>): Promise<OAuthResult> {
  const url = new URL(`${INSTAGRAM_OAUTH_BASE}/${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), { method: 'GET', signal: controller.signal })
    const json = await response.json().catch(() => null)

    if (!response.ok || !json?.access_token) {
      return { ok: false, error: sanitizeMetaError(json?.error?.message || `request failed (status ${response.status})`) }
    }

    return { ok: true, accessToken: json.access_token, expiresInSeconds: typeof json.expires_in === 'number' ? json.expires_in : null }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return { ok: false, error: isAbort ? 'Instagram token request timed out' : 'Instagram token request failed' }
  } finally {
    clearTimeout(timeout)
  }
}

/** `ig_refresh_token` — only succeeds on a token that is already long-lived and >=24h old. */
function callRefreshEndpoint(currentToken: string): Promise<OAuthResult> {
  return callInstagramOAuth('refresh_access_token', { grant_type: 'ig_refresh_token', access_token: currentToken })
}

/** `ig_exchange_token` — converts a short-lived (or not-yet-confirmed) token into a long-lived one. */
function callExchangeEndpoint(currentToken: string): Promise<OAuthResult> {
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appSecret) return Promise.resolve({ ok: false, error: 'INSTAGRAM_APP_SECRET is not configured' })
  return callInstagramOAuth('access_token', { grant_type: 'ig_exchange_token', client_secret: appSecret, access_token: currentToken })
}

function computeExpiresAt(expiresInSeconds: number | null): string {
  const seconds = expiresInSeconds ?? LONG_LIVED_SECONDS_FALLBACK
  return new Date(Date.now() + seconds * 1000).toISOString()
}

/**
 * Determines whether a raw token is (or can become) long-lived, without
 * assuming which one it already is: tries the refresh endpoint first
 * (the correct call if it's already a long-lived, >=24h-old token — and
 * the one call that both confirms long-lived status AND extends it in a
 * single request), then falls back to the exchange endpoint (correct for
 * a genuinely short-lived token). Used by both bootstrap and the manual
 * "Refresh token" retry path for a token stuck in 'unknown'/'short_lived'.
 */
async function resolveToLongLivedToken(currentToken: string): Promise<OAuthResult> {
  const refreshed = await callRefreshEndpoint(currentToken)
  if (refreshed.ok) return refreshed
  return callExchangeEndpoint(currentToken)
}

function toTokenStatus(row: CredentialRow | null): MessagingTokenStatus {
  if (!row) {
    return {
      configured: false,
      connected: false,
      needs_reconnect: false,
      token_type: null,
      expires_at: null,
      days_remaining: null,
      last_refreshed_at: null,
      refresh_status: null,
      last_refresh_error: null,
    }
  }

  const daysRemaining = row.expires_at ? (new Date(row.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000) : null
  const isExpired = daysRemaining !== null && daysRemaining <= 0
  // A failed refresh alone isn't fatal — messaging keeps working on the
  // still-valid stored token. Only surface "needs reconnect" once that
  // token has actually run out (or we never managed to identify/store a
  // usable expiry for it in the first place).
  const needsReconnect = row.refresh_status === 'failed' && (isExpired || row.token_type === 'unknown')

  return {
    configured: true,
    connected: !needsReconnect,
    needs_reconnect: needsReconnect,
    token_type: row.token_type,
    expires_at: row.expires_at,
    days_remaining: daysRemaining !== null ? Math.round(daysRemaining) : null,
    last_refreshed_at: row.last_refreshed_at,
    refresh_status: row.refresh_status,
    last_refresh_error: row.last_refresh_error,
  }
}

/**
 * Seeds the database from INSTAGRAM_MESSAGING_ACCESS_TOKEN the first
 * time there's no stored row for this account — a one-time migration
 * path, not an ongoing dependency. Safe to call on every read: it's a
 * no-op once a row exists. Never logs or throws the token itself.
 *
 * Deliberately swallows every failure (missing encryption key, migration
 * 0023 not yet applied, a transient DB error): this runs on the hot path
 * of every outbound send via getCurrentMessagingToken, and a bootstrap
 * problem must degrade to "keep using the env var directly" — the exact
 * behavior this project had before this file existed — never to a broken
 * send. getCurrentMessagingToken's own env-var fallback is what actually
 * keeps messaging working while this stays unresolved.
 */
export async function bootstrapMessagingTokenIfNeeded(): Promise<void> {
  try {
    const existing = await getRow()
    if (existing) return

    const bootstrapToken = process.env.INSTAGRAM_MESSAGING_ACCESS_TOKEN
    if (!bootstrapToken) return

    const resolved = await resolveToLongLivedToken(bootstrapToken)
    const now = new Date().toISOString()

    interface InsertPayload {
      provider: string
      account_id: string
      encrypted_access_token: string
      token_type: TokenType
      expires_at: string | null
      last_refreshed_at: string | null
      refresh_status: RefreshStatus
      last_refresh_error: string | null
    }

    const insertPayload: InsertPayload = resolved.ok
      ? {
          provider: PROVIDER,
          account_id: ACCOUNT_ID,
          encrypted_access_token: encryptToken(resolved.accessToken),
          token_type: 'long_lived',
          expires_at: computeExpiresAt(resolved.expiresInSeconds),
          last_refreshed_at: now,
          refresh_status: 'ok',
          last_refresh_error: null,
        }
      : {
          // Couldn't confirm long-lived status server-side (e.g. app
          // secret missing, or Meta rejected both calls) — store the raw
          // bootstrap token as-is rather than blocking messaging entirely.
          // It keeps working until it actually expires; refresh_status
          // records why it isn't being auto-managed yet.
          provider: PROVIDER,
          account_id: ACCOUNT_ID,
          encrypted_access_token: encryptToken(bootstrapToken),
          token_type: 'unknown',
          expires_at: null,
          last_refreshed_at: null,
          refresh_status: 'failed',
          last_refresh_error: resolved.error,
        }

    const { error } = await supabaseServer.from(TABLE).insert(insertPayload)
    if (error && error.code !== '23505') {
      // 23505 (unique violation) means a concurrent request already
      // bootstrapped it — fine, nothing further to do.
      console.error('[Instagram Token] Bootstrap insert failed', error.message)
    }
  } catch (error) {
    console.error('[Instagram Token] Bootstrap failed', error instanceof Error ? error.message : error)
  }
}

export interface CurrentMessagingToken {
  token: string
  rowId: string | null
}

/**
 * The token outbound sends should use right now. Once a database row
 * exists it is the only source of truth; INSTAGRAM_MESSAGING_ACCESS_TOKEN
 * is consulted only to bootstrap that row the first time, or as a last
 * resort if the database itself is unreachable (keeps a transient DB
 * blip from taking down messaging outright).
 */
export async function getCurrentMessagingToken(): Promise<CurrentMessagingToken | null> {
  await bootstrapMessagingTokenIfNeeded()
  const row = await getRow()

  if (row) {
    try {
      return { token: decryptToken(row.encrypted_access_token), rowId: row.id }
    } catch (error) {
      // A decrypt failure (e.g. INSTAGRAM_TOKEN_ENCRYPTION_KEY rotated or
      // missing) must not take messaging down — fall through to the env
      // var below rather than throwing out of a send.
      console.error('[Instagram Token] Failed to decrypt stored token', error instanceof Error ? error.message : error)
    }
  }

  const fallback = process.env.INSTAGRAM_MESSAGING_ACCESS_TOKEN
  return fallback ? { token: fallback, rowId: null } : null
}

/** decryptToken, but turns a bad key/corrupt row into a sanitized failure instead of an uncaught throw. */
function safeDecrypt(encrypted: string): { ok: true; token: string } | { ok: false; error: string } {
  try {
    return { ok: true, token: decryptToken(encrypted) }
  } catch (error) {
    console.error('[Instagram Token] Decrypt failed', error instanceof Error ? error.message : error)
    return { ok: false, error: 'Stored token could not be decrypted (check INSTAGRAM_TOKEN_ENCRYPTION_KEY)' }
  }
}

async function applyRefreshResult(rowId: string, result: OAuthResult): Promise<MessagingTokenStatus> {
  const now = new Date().toISOString()

  if (result.ok) {
    await supabaseServer
      .from(TABLE)
      .update({
        encrypted_access_token: encryptToken(result.accessToken),
        token_type: 'long_lived',
        expires_at: computeExpiresAt(result.expiresInSeconds),
        last_refreshed_at: now,
        refresh_status: 'ok',
        last_refresh_error: null,
        updated_at: now,
      })
      .eq('id', rowId)
  } else {
    // Never touch encrypted_access_token/expires_at on failure — the
    // previously stored token must keep working until it actually
    // expires. Only the status/error fields change.
    await supabaseServer
      .from(TABLE)
      .update({ refresh_status: 'failed', last_refresh_error: result.error, updated_at: now })
      .eq('id', rowId)
  }

  return toTokenStatus(await getRow())
}

/**
 * Checks whether the stored token needs refreshing and refreshes it if
 * so. This is the single entry point used by:
 * - the daily cron (no args — only refreshes when within the threshold)
 * - the admin "Refresh token" button (`force: true` — refresh now,
 *   subject only to Meta's real 24h-minimum-age rule)
 * - the messaging client's own one-shot retry after an auth failure
 *   (`force: true`, since a 401 means "don't wait for the schedule")
 */
export async function refreshMessagingTokenIfDue(options: { force?: boolean } = {}): Promise<RefreshOutcome> {
  await bootstrapMessagingTokenIfNeeded()
  const row = await getRow()

  if (!row) {
    return { status: 'not_configured', refreshed: false, token_status: toTokenStatus(null) }
  }

  const decrypted = safeDecrypt(row.encrypted_access_token)
  if (!decrypted.ok) {
    const status = await applyRefreshResult(row.id, decrypted)
    return { status: 'refresh_failed', refreshed: false, token_status: status }
  }
  const currentToken = decrypted.token

  // Not yet confirmed long-lived (bootstrap couldn't resolve it, or a
  // previous refresh attempt on an unknown/short-lived token also
  // failed) — retry the same resolve-then-store path rather than the
  // plain refresh call, since a plain refresh would just fail again on
  // a token Meta hasn't confirmed as long-lived.
  if (row.token_type !== 'long_lived' || !row.expires_at) {
    const resolved = await resolveToLongLivedToken(currentToken)
    const status = await applyRefreshResult(row.id, resolved)
    return { status: resolved.ok ? 'ok' : 'refresh_failed', refreshed: resolved.ok, token_status: status }
  }

  const daysRemaining = (new Date(row.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  if (!options.force && daysRemaining > REFRESH_THRESHOLD_DAYS) {
    return { status: 'not_due', refreshed: false, token_status: toTokenStatus(row) }
  }

  const issuedAt = row.last_refreshed_at || row.created_at
  const ageHours = (Date.now() - new Date(issuedAt).getTime()) / (60 * 60 * 1000)
  if (ageHours < MIN_TOKEN_AGE_HOURS) {
    // Meta rejects ig_refresh_token on a token younger than 24h —
    // skip the doomed call rather than record a confusing failure.
    return { status: 'too_new_to_refresh', refreshed: false, token_status: toTokenStatus(row) }
  }

  const result = await callRefreshEndpoint(currentToken)
  const status = await applyRefreshResult(row.id, result)
  return { status: result.ok ? 'ok' : 'refresh_failed', refreshed: result.ok, token_status: status }
}

export async function getMessagingTokenStatus(): Promise<MessagingTokenStatus> {
  await bootstrapMessagingTokenIfNeeded()
  return toTokenStatus(await getRow())
}

/**
 * The "Reconnect Instagram" action for a token that's become
 * unrecoverable (needs_reconnect: true) — not a full OAuth flow, just a
 * server-side re-seed: drops the stale stored row and re-runs the same
 * bootstrap resolve-or-store logic against whatever
 * INSTAGRAM_MESSAGING_ACCESS_TOKEN currently holds. The admin is expected
 * to have pasted a freshly generated token into that env var (Meta App
 * Dashboard → Instagram product → API setup with Instagram login) and
 * redeployed before clicking this — see the admin UI's own copy.
 */
export async function reconnectMessagingTokenFromEnv(): Promise<RefreshOutcome> {
  const row = await getRow()
  if (row) {
    const { error } = await supabaseServer.from(TABLE).delete().eq('id', row.id)
    if (error) {
      console.error('[Instagram Token] Failed to clear stale token before reconnect', error.message)
    }
  }

  await bootstrapMessagingTokenIfNeeded()
  const status = await getMessagingTokenStatus()
  return { status: status.connected ? 'ok' : 'refresh_failed', refreshed: status.connected, token_status: status }
}

/**
 * Called by the messaging client after a send comes back with an
 * auth/token error: forces one refresh attempt for the *specific* row
 * the failing call used (by id, not "whatever's current"), so a
 * concurrent bootstrap/refresh elsewhere can't be raced. Returns the
 * fresh token to retry with, or null if refresh couldn't recover it —
 * callers must not retry again after null.
 */
// ---------------------------------------------------------------------
// Phase F (Social Workspace Foundation) — account-aware token
// resolution, additive only. Everything above this line is UNCHANGED:
// the webhook (src/app/api/webhooks/instagram/route.ts), the follow-up
// cron, and client.ts's messagingPost() all still call the zero-arg
// getCurrentMessagingToken() above, reading the single legacy
// instagram_integration_credentials row exactly as before. Nothing here
// is wired into that live send path yet — see the Social Workspace
// Foundation implementation report's "Next Phase" section for when it
// will be. These functions read from the NEW social_account_tokens
// table (keyed by connected_account_id) instead.
// ---------------------------------------------------------------------

export interface AccountScopedMessagingToken {
  token: string
  rowId: string
}

/** The set of providers social_account_tokens can hold a messaging-capable token under — see supabase/migrations/0032_instagram_dm_provider.sql. */
export type MessagingTokenProvider = 'instagram_login' | 'instagram_dm'

/**
 * The messaging token for ONE specific connected account — no env-var
 * bootstrap/fallback (that concept only applies to the legacy singleton
 * row above); a connected account with no row for the requested
 * `provider` simply returns null — deliberately NO fallback to a
 * different provider here. This matters for the new N4N DM Automations
 * app: callers validating that app independently must pass
 * `provider: 'instagram_dm'` explicitly and get a clean null (never a
 * silent fall-through to the existing instagram_login token) when that
 * app's own token is missing or broken — see client.ts's
 * messagingPostForAccount, the one call site that threads this through.
 * Every pre-existing call site omits `provider` and keeps getting the
 * original instagram_login-only behavior, completely unchanged.
 */
export async function getMessagingTokenForAccount(connectedAccountId: string, provider: MessagingTokenProvider = 'instagram_login'): Promise<AccountScopedMessagingToken | null> {
  const { data, error } = await supabaseServer
    .from('social_account_tokens')
    .select('id, encrypted_access_token')
    .eq('connected_account_id', connectedAccountId)
    .eq('provider', provider)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('[Instagram Token] Failed to read account-scoped token', error.message)
    return null
  }

  try {
    return { token: decryptToken(data.encrypted_access_token), rowId: data.id }
  } catch (decryptError) {
    console.error('[Instagram Token] Failed to decrypt account-scoped token', decryptError instanceof Error ? decryptError.message : decryptError)
    return null
  }
}

/**
 * TRANSITIONAL compatibility resolver — for a caller not yet updated to
 * receive an explicit connected_account_id (e.g. the current webhook,
 * before account-routing is built — see the Social Media Multi-Workspace
 * Audit's Phase 2). Resolves the one connected account that actually has
 * a migrated instagram_login token row.
 *
 * Deliberately UNSAFE-BY-DEFAULT rather than convenient: if more than one
 * connected account has a migrated token, this throws instead of picking
 * one — "just select first active account" is exactly the failure mode
 * this function exists to prevent once a second real account exists.
 * Returns null (not an error) only when zero accounts have migrated yet,
 * since that's a legitimate pre-migration state, not an ambiguity.
 */
export async function resolveLegacySingleConnectedAccountId(): Promise<string | null> {
  const { data, error } = await supabaseServer.from('social_account_tokens').select('connected_account_id').eq('provider', PROVIDER)

  if (error) {
    console.error('[Instagram Token] Failed to resolve legacy single connected account', error.message)
    return null
  }

  const distinctIds = Array.from(new Set((data || []).map((r) => r.connected_account_id)))
  if (distinctIds.length > 1) {
    throw new Error(
      'Multiple connected Instagram accounts have migrated tokens — legacy zero-arg token resolution is no longer unambiguous. Callers must be updated to pass an explicit connected_account_id.'
    )
  }
  return distinctIds[0] ?? null
}

export async function refreshAfterAuthFailure(rowId: string): Promise<string | null> {
  try {
    const { data } = await supabaseServer.from(TABLE).select('*').eq('id', rowId).maybeSingle()
    const row = data as CredentialRow | null
    if (!row) return null

    const decrypted = safeDecrypt(row.encrypted_access_token)
    if (!decrypted.ok) {
      await applyRefreshResult(rowId, decrypted)
      return null
    }

    const result = row.token_type === 'long_lived' ? await callRefreshEndpoint(decrypted.token) : await resolveToLongLivedToken(decrypted.token)
    await applyRefreshResult(rowId, result)
    return result.ok ? result.accessToken : null
  } catch (error) {
    // Never let a refresh-after-failure attempt throw out of a send — the
    // caller (messagingPost) must always get back a clean null and report
    // the sanitized "requires reconnection" message, not an unhandled
    // rejection.
    console.error('[Instagram Token] refreshAfterAuthFailure threw', error instanceof Error ? error.message : error)
    return null
  }
}
