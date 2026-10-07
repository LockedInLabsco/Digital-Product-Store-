/**
 * Resolves the Instagram content/insights account + token for ONE
 * already-authorized Social Workspace — the per-workspace replacement for
 * reading INSTAGRAM_ACCESS_TOKEN/INSTAGRAM_BUSINESS_ACCOUNT_ID globally
 * (see src/lib/instagram/client.ts's updated file header). Callers must
 * resolve and authorize `workspaceId` themselves first (e.g. via
 * getActiveWorkspaceContext() in src/lib/admin/activeSocialWorkspace.ts) — this
 * function trusts the id it's given, exactly like
 * resolveConnectedAccountIdsForWorkspaces in
 * src/lib/social/automationAccountScope.ts.
 *
 * Deliberately separate from src/lib/instagram/accountResolution.ts,
 * which resolves the OTHER direction (an inbound webhook's entry.id ->
 * connected account) for the messaging/Auto-DM system — not touched here.
 *
 * Fails closed on every ambiguous or incomplete state (no connected
 * account, more than one active connected account, no stored content
 * token, a token that fails to decrypt) rather than guessing — there is
 * no "pick the first" branch anywhere in this file.
 *
 * Phase G (Direct Instagram Login) addition: a connected account may now
 * have TWO content-capable tokens — 'instagram_login' (graph.instagram.com,
 * no Facebook Page involved) and/or 'facebook_login' (graph.facebook.com,
 * the original flow). Verified against Meta's current Instagram Platform
 * docs that the Instagram Login product's scopes (instagram_business_basic
 * + instagram_business_manage_comments) do cover media + insights reads,
 * not just messaging — so when both exist, 'instagram_login' is preferred
 * (one fewer product dependency, no Page requirement); 'facebook_login' is
 * the proven, backwards-compatible fallback. Every existing connected
 * account (e.g. @alx.lifelogs) has only a 'facebook_login' row and keeps
 * resolving to it completely unchanged.
 */
import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { decryptToken } from './tokenCrypto'

const PREFERRED_PROVIDER_ORDER = ['instagram_login', 'facebook_login'] as const
export type ContentTokenProvider = (typeof PREFERRED_PROVIDER_ORDER)[number]

export interface ResolvedContentAccount {
  connectedAccountId: string
  /** social_connected_accounts.external_account_id — the Instagram
   * Business Account id used by the content/insights Graph API calls. */
  instagramAccountId: string
  accessToken: string
  /** Which Graph API host this token is valid against — see
   * src/lib/instagram/client.ts's fetchAllAccountMedia/fetchMediaInsights,
   * which route on this field instead of assuming graph.facebook.com. */
  provider: ContentTokenProvider
}

export type ContentAccountResolution =
  | { ok: true; account: ResolvedContentAccount }
  | {
      ok: false
      /** not_connected: no active connected account yet (400 — tell the
       * UI to connect Instagram). ambiguous_accounts: more than one active
       * connected account matched (409 — never seen today, since
       * social_connected_accounts_one_active_per_platform_idx prevents it
       * at the database level, but this function never relies on that
       * alone). token_missing: a connected account exists but has no
       * usable content token (400 — needs reconnecting). lookup_failed:
       * a database error occurred (500). */
      reason: 'not_connected' | 'ambiguous_accounts' | 'token_missing' | 'lookup_failed'
      error: string
    }

/**
 * workspaceId -> active instagram social_connected_accounts row ->
 * facebook_login social_account_tokens row -> decrypted token. Every step
 * returns a distinct, explicit failure reason instead of falling through
 * to any global/env-var credential.
 */
export async function resolveContentAccountForWorkspace(workspaceId: string): Promise<ContentAccountResolution> {
  const { data: accountRow, error: accountError } = await supabaseServer
    .from('social_connected_accounts')
    .select('id, external_account_id')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'instagram')
    .eq('status', 'active')
    .maybeSingle()

  if (accountError) {
    // maybeSingle() itself errors (rather than returning an arbitrary row)
    // if more than one row matches — surfaced here as ambiguous when
    // recognizable, lookup_failed otherwise. Either way, nothing below
    // this branch ever runs.
    const isMultipleRows = accountError.code === 'PGRST116'
    console.error('[Instagram Content Account] Connected account lookup failed', accountError.message)
    return isMultipleRows
      ? {
          ok: false,
          reason: 'ambiguous_accounts',
          error: 'This workspace has more than one active connected Instagram account. Account selection is not supported yet — disconnect the extra account before syncing.',
        }
      : { ok: false, reason: 'lookup_failed', error: 'Failed to look up this workspace’s connected Instagram account' }
  }

  if (!accountRow) {
    return {
      ok: false,
      reason: 'not_connected',
      error: 'This workspace has no connected Instagram account yet. Connect Instagram before syncing content.',
    }
  }

  const { data: tokenRows, error: tokenError } = await supabaseServer
    .from('social_account_tokens')
    .select('provider, encrypted_access_token')
    .eq('connected_account_id', accountRow.id)
    .in('provider', PREFERRED_PROVIDER_ORDER)

  if (tokenError) {
    console.error('[Instagram Content Account] Token lookup failed', tokenError.message)
    return { ok: false, reason: 'lookup_failed', error: 'Failed to look up this workspace’s Instagram content token' }
  }

  const tokenByProvider = new Map((tokenRows || []).map((row) => [row.provider, row.encrypted_access_token]))
  const provider = PREFERRED_PROVIDER_ORDER.find((candidate) => tokenByProvider.has(candidate))

  if (!provider) {
    return {
      ok: false,
      reason: 'token_missing',
      error: 'No Instagram content/insights token is stored for this workspace’s connected account. Reconnect Instagram for this workspace.',
    }
  }

  try {
    const accessToken = decryptToken(tokenByProvider.get(provider)!)
    return {
      ok: true,
      account: {
        connectedAccountId: accountRow.id,
        instagramAccountId: accountRow.external_account_id,
        accessToken,
        provider,
      },
    }
  } catch (error) {
    console.error('[Instagram Content Account] Failed to decrypt stored content token', error instanceof Error ? error.message : error)
    return {
      ok: false,
      reason: 'token_missing',
      error: 'This workspace’s stored Instagram content token could not be decrypted. Reconnect Instagram for this workspace.',
    }
  }
}

/** Maps a ContentAccountResolution failure reason to the HTTP status an API route should return. */
export function contentAccountFailureStatus(reason: Exclude<ContentAccountResolution, { ok: true }>['reason']): number {
  switch (reason) {
    case 'not_connected':
    case 'token_missing':
      return 400
    case 'ambiguous_accounts':
      return 409
    case 'lookup_failed':
      return 500
  }
}
