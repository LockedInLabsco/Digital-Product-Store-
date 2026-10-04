/**
 * The DB-writing half of the "Connect Instagram" flow — everything after
 * Meta has already handed back a resolved Instagram professional account
 * + Page Access Token (see src/lib/instagram/facebookOAuth.ts for that
 * part). Writes exclusively to the tables
 * src/lib/instagram/contentAccountResolution.ts already reads:
 * social_connected_accounts, social_account_tokens (provider=
 * 'facebook_login'), social_connected_account_identifiers
 * (identifier_type='graph_business_account_id') — the same identifier
 * type src/lib/social/backfillWorkspace.ts already writes, so a
 * self-serve-connected account and a legacy-backfilled one look
 * identical to every downstream reader.
 *
 * No new identifier types invented here: 'webhook_entry_id' (the other
 * allowed identifier_type, per supabase/migrations/0026) belongs to the
 * separate Instagram Login/messaging OAuth product and isn't produced by
 * this flow — see src/lib/instagram/accountResolution.ts's own header.
 */
import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { encryptToken } from '@/src/lib/instagram/tokenCrypto'

const PLATFORM = 'instagram'
const CONTENT_TOKEN_PROVIDER = 'facebook_login'
const IDENTIFIER_TYPE = 'graph_business_account_id'

export interface ResolvedInstagramAccount {
  instagramAccountId: string
  username: string | null
  displayName: string | null
  pageAccessToken: string
  /** ISO timestamp or null if Meta didn't return an expiry for this token. */
  tokenExpiresAt: string | null
}

export type UpsertConnectedAccountResult =
  | {
      ok: true
      connectedAccountId: string
      /** true if this resolved to the SAME external account already connected to this workspace (a plain re-authorization — token refreshed, nothing replaced). */
      reauthorized: boolean
      /** true if a DIFFERENT account was previously active for this workspace and has now been marked disconnected. */
      replacedPreviousAccount: boolean
    }
  | {
      ok: false
      reason: 'already_connected_elsewhere' | 'write_failed'
      error: string
    }

/**
 * workspaceId must already be authorized (the caller's own writable
 * workspace, resolved server-side) — this function trusts it, same
 * convention as resolveContentAccountForWorkspace /
 * resolveConnectedAccountIdsForWorkspaces.
 *
 * Never silently overwrites another workspace's connection: the real
 * Meta-side account id is globally unique across every workspace (DB
 * constraint social_connected_accounts_external_id_unique), so if the
 * account being connected already belongs to a DIFFERENT workspace, this
 * fails closed with already_connected_elsewhere rather than moving it.
 */
export async function upsertConnectedInstagramAccount(
  workspaceId: string,
  adminUserId: string,
  resolved: ResolvedInstagramAccount
): Promise<UpsertConnectedAccountResult> {
  const now = new Date().toISOString()

  const { data: existingByExternalId, error: lookupError } = await supabaseServer
    .from('social_connected_accounts')
    .select('id, workspace_id')
    .eq('platform', PLATFORM)
    .eq('external_account_id', resolved.instagramAccountId)
    .maybeSingle()

  if (lookupError) {
    console.error('[Instagram Connect] Failed to look up existing connected account', lookupError.message)
    return { ok: false, reason: 'write_failed', error: 'Failed to check for an existing connection for this Instagram account' }
  }

  if (existingByExternalId && existingByExternalId.workspace_id !== workspaceId) {
    return {
      ok: false,
      reason: 'already_connected_elsewhere',
      error: 'This Instagram account is already connected to a different Social Workspace. Disconnect it there first.',
    }
  }

  let connectedAccountId: string
  let reauthorized: boolean
  let replacedPreviousAccount = false

  if (existingByExternalId) {
    // Same account, same workspace — a plain re-authorization (token
    // refresh, or the admin clicked Reconnect without actually changing
    // which Instagram account they picked in Meta's dialog).
    const { error: updateError } = await supabaseServer
      .from('social_connected_accounts')
      .update({
        status: 'active',
        username: resolved.username,
        display_name: resolved.displayName,
        connected_by: adminUserId,
        connected_at: now,
        updated_at: now,
      })
      .eq('id', existingByExternalId.id)

    if (updateError) {
      console.error('[Instagram Connect] Failed to reauthorize connected account', updateError.message)
      return { ok: false, reason: 'write_failed', error: 'Failed to update the connected Instagram account' }
    }

    connectedAccountId = existingByExternalId.id
    reauthorized = true
  } else {
    // A genuinely different (or first-ever) account for this workspace.
    // If one is already active, it's being explicitly replaced — never
    // left as a second "active" row (the database's own
    // social_connected_accounts_one_active_per_platform_idx would reject
    // that anyway) and never deleted, so its historical
    // ig_automation_rules/runs rows keep a valid connected_account_id.
    const { data: existingActiveForWorkspace, error: activeLookupError } = await supabaseServer
      .from('social_connected_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', PLATFORM)
      .eq('status', 'active')
      .maybeSingle()

    if (activeLookupError) {
      console.error('[Instagram Connect] Failed to look up this workspace’s active account', activeLookupError.message)
      return { ok: false, reason: 'write_failed', error: 'Failed to check this workspace’s existing Instagram connection' }
    }

    if (existingActiveForWorkspace) {
      const { error: disconnectOldError } = await supabaseServer
        .from('social_connected_accounts')
        .update({ status: 'disconnected', updated_at: now })
        .eq('id', existingActiveForWorkspace.id)

      if (disconnectOldError) {
        console.error('[Instagram Connect] Failed to disconnect the previous account', disconnectOldError.message)
        return { ok: false, reason: 'write_failed', error: 'Failed to replace the previous Instagram connection' }
      }
      replacedPreviousAccount = true
    }

    const { data: created, error: insertError } = await supabaseServer
      .from('social_connected_accounts')
      .insert({
        workspace_id: workspaceId,
        platform: PLATFORM,
        external_account_id: resolved.instagramAccountId,
        username: resolved.username,
        display_name: resolved.displayName,
        status: 'active',
        connected_by: adminUserId,
        connected_at: now,
      })
      .select('id')
      .single()

    if (insertError || !created) {
      console.error('[Instagram Connect] Failed to create connected account', insertError?.message)
      return { ok: false, reason: 'write_failed', error: 'Failed to create the connected Instagram account' }
    }

    connectedAccountId = created.id
    reauthorized = false
  }

  const { error: tokenError } = await supabaseServer.from('social_account_tokens').upsert(
    {
      connected_account_id: connectedAccountId,
      provider: CONTENT_TOKEN_PROVIDER,
      encrypted_access_token: encryptToken(resolved.pageAccessToken),
      token_type: resolved.tokenExpiresAt ? 'long_lived' : 'unknown',
      expires_at: resolved.tokenExpiresAt,
      last_refreshed_at: now,
      refresh_status: 'ok',
      last_refresh_error: null,
      updated_at: now,
    },
    { onConflict: 'connected_account_id,provider' }
  )

  if (tokenError) {
    console.error('[Instagram Connect] Failed to store content token', tokenError.message)
    return { ok: false, reason: 'write_failed', error: 'Account connected, but failed to store its access token — try reconnecting' }
  }

  const { error: identifierError } = await supabaseServer.from('social_connected_account_identifiers').upsert(
    {
      connected_account_id: connectedAccountId,
      provider: CONTENT_TOKEN_PROVIDER,
      identifier_type: IDENTIFIER_TYPE,
      external_id: resolved.instagramAccountId,
    },
    // Same convention as backfillWorkspace.ts: the identifier value never
    // changes for a given (provider, identifier_type, external_id), so a
    // repeat connect/reauthorize is a no-op here, not an update.
    { onConflict: 'provider,identifier_type,external_id', ignoreDuplicates: true }
  )

  if (identifierError) {
    // Non-fatal for content sync (which only needs external_account_id,
    // already stored above) — only future webhook-routing work would
    // depend on this row. Logged, not surfaced as a connect failure.
    console.error('[Instagram Connect] Failed to store account identifier', identifierError.message)
  }

  return { ok: true, connectedAccountId, reauthorized, replacedPreviousAccount }
}

export type DisconnectInstagramAccountResult = { ok: true } | { ok: false; reason: 'not_connected' | 'write_failed'; error: string }

/**
 * Soft-disconnect: marks the workspace's active connected account
 * 'disconnected' and removes its stored token(s) — but never touches
 * pb_content_items/pb_content_metrics (workspace-scoped, not account-
 * scoped) or ig_automation_rules/ig_automation_runs (kept, still valid
 * via their connected_account_id FK; just stop matching any `status =
 * 'active'` filter going forward, same as every other reader in this
 * codebase). Tokens are deleted rather than merely ignored: an encrypted
 * row with no further purpose is a liability, not a convenience, and
 * reconnecting always fetches a fresh one via OAuth anyway.
 * social_connected_account_identifiers rows are left in place —
 * harmless, and reconnecting the same account re-upserts them.
 */
export async function disconnectInstagramAccount(workspaceId: string): Promise<DisconnectInstagramAccountResult> {
  const { data: account, error: lookupError } = await supabaseServer
    .from('social_connected_accounts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform', PLATFORM)
    .eq('status', 'active')
    .maybeSingle()

  if (lookupError) {
    console.error('[Instagram Disconnect] Failed to look up connected account', lookupError.message)
    return { ok: false, reason: 'write_failed', error: 'Failed to look up this workspace’s connected Instagram account' }
  }

  if (!account) {
    return { ok: false, reason: 'not_connected', error: 'This workspace has no connected Instagram account to disconnect' }
  }

  const { error: updateError } = await supabaseServer
    .from('social_connected_accounts')
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('id', account.id)

  if (updateError) {
    console.error('[Instagram Disconnect] Failed to mark account disconnected', updateError.message)
    return { ok: false, reason: 'write_failed', error: 'Failed to disconnect this Instagram account' }
  }

  const { error: deleteTokenError } = await supabaseServer.from('social_account_tokens').delete().eq('connected_account_id', account.id)

  if (deleteTokenError) {
    // The account is already marked disconnected (the part every reader
    // actually checks) — a leftover encrypted token row is unused but
    // not unsafe; logged for cleanup, not retried, since retrying a
    // delete inside an already-reported failure risks masking the real
    // error with a new one.
    console.error('[Instagram Disconnect] Failed to delete stored token(s)', deleteTokenError.message)
  }

  return { ok: true }
}
