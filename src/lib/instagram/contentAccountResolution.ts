/**
 * Resolves the Instagram content/insights account + token for ONE
 * already-authorized Social Workspace — the per-workspace replacement for
 * reading INSTAGRAM_ACCESS_TOKEN/INSTAGRAM_BUSINESS_ACCOUNT_ID globally
 * (see src/lib/instagram/client.ts's updated file header). Callers must
 * resolve and authorize `workspaceId` themselves first (e.g. via
 * getSocialWorkspaceScope()/resolveDefaultWritableWorkspaceId()) — this
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
 */
import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { decryptToken } from './tokenCrypto'

const CONTENT_TOKEN_PROVIDER = 'facebook_login'

export interface ResolvedContentAccount {
  connectedAccountId: string
  /** social_connected_accounts.external_account_id — the Instagram
   * Business Account id used by the content/insights Graph API calls. */
  instagramAccountId: string
  accessToken: string
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

  const { data: tokenRow, error: tokenError } = await supabaseServer
    .from('social_account_tokens')
    .select('encrypted_access_token')
    .eq('connected_account_id', accountRow.id)
    .eq('provider', CONTENT_TOKEN_PROVIDER)
    .maybeSingle()

  if (tokenError) {
    console.error('[Instagram Content Account] Token lookup failed', tokenError.message)
    return { ok: false, reason: 'lookup_failed', error: 'Failed to look up this workspace’s Instagram content token' }
  }

  if (!tokenRow) {
    return {
      ok: false,
      reason: 'token_missing',
      error: 'No Instagram content/insights token is stored for this workspace’s connected account. Reconnect Instagram for this workspace.',
    }
  }

  try {
    const accessToken = decryptToken(tokenRow.encrypted_access_token)
    return {
      ok: true,
      account: {
        connectedAccountId: accountRow.id,
        instagramAccountId: accountRow.external_account_id,
        accessToken,
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
