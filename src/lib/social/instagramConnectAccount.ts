/**
 * The DB-writing half of BOTH "Connect Instagram" flows — everything
 * after Meta has already handed back a resolved Instagram professional
 * account + access token, whether that came from Facebook Login (see
 * src/lib/instagram/facebookOAuth.ts) or, as of Phase G, direct
 * Instagram Login (see src/lib/instagram/instagramLoginOAuth.ts). The
 * account-dedup/already_connected_elsewhere logic is identical either
 * way — it operates on social_connected_accounts keyed by
 * (platform, external_account_id), which has no concept of which OAuth
 * product resolved that id — so one function serves both, parameterized
 * only on which token `provider`/identifier type to write:
 *
 * - 'facebook_login' (default, unchanged from before Phase G): writes
 *   social_account_tokens provider='facebook_login' and
 *   social_connected_account_identifiers identifier_type='graph_business_account_id'
 *   — the same identifier type src/lib/social/backfillWorkspace.ts
 *   already writes, so a self-serve-connected account and a
 *   legacy-backfilled one still look identical to every downstream
 *   reader.
 * - 'instagram_login': writes social_account_tokens
 *   provider='instagram_login' and social_connected_account_identifiers
 *   identifier_type='webhook_entry_id' — verified against Meta's current
 *   docs (see instagramLoginOAuth.ts's header) that the Instagram
 *   professional account id resolved via Instagram Login IS the same id
 *   Meta sends back as the recipient/entry id on an Instagram-Login-
 *   routed webhook, so 'webhook_entry_id' (not 'graph_business_account_id')
 *   is the correct type here — no new identifier type invented, this is
 *   the other value supabase/migrations/0026 already allows.
 *
 * Does NOT assume a Facebook-Login-resolved external_account_id and an
 * Instagram-Login-resolved one are the same value for what's really the
 * same Instagram account — src/lib/instagram/client.ts's own file header
 * documents that Meta does not guarantee this. The lookup below is
 * exactly as safe either way it turns out: if the ids do match, this
 * naturally lands on the reauthorize path (adding a second token row,
 * one per provider, to the SAME connected account — exactly the
 * consolidation Phase G wants); if they don't, it creates a second,
 * independent connected_accounts row, the same known limitation this
 * codebase already lives with via already_connected_elsewhere/Request
 * Access for any two accidentally-duplicate connections.
 */
import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { encryptToken } from '@/src/lib/instagram/tokenCrypto'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'

/**
 * Production-safe logging only — the fine-grained per-write-step/error-
 * code diagnostics used to root-cause the business_management/no_pages
 * issue have been removed now that it's fixed. Real failures still go
 * to console.error with a Postgres error code (never removed, never a
 * secret), just not duplicated into logConnectStage anymore.
 */

const PLATFORM = 'instagram'

export type ContentConnectionProvider = 'facebook_login' | 'instagram_login'

function identifierTypeFor(provider: ContentConnectionProvider): 'graph_business_account_id' | 'webhook_entry_id' {
  return provider === 'instagram_login' ? 'webhook_entry_id' : 'graph_business_account_id'
}

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
      /** The replaced account's username, if it had one and replacedPreviousAccount is true — lets the UI say "Replaced @old with @new" instead of a generic message. */
      previousUsername: string | null
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
  resolved: ResolvedInstagramAccount,
  provider: ContentConnectionProvider = 'facebook_login'
): Promise<UpsertConnectedAccountResult> {
  const now = new Date().toISOString()

  const { data: existingByExternalId, error: lookupError } = await supabaseServer
    .from('social_connected_accounts')
    .select('id, workspace_id')
    .eq('platform', PLATFORM)
    .eq('external_account_id', resolved.instagramAccountId)
    .maybeSingle()

  if (lookupError) {
    console.error('[Instagram Connect] Failed to look up existing connected account', lookupError.code, lookupError.message)
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
  let previousUsername: string | null = null

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
      console.error('[Instagram Connect] Failed to reauthorize connected account', updateError.code, updateError.message)
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
      .select('id, username')
      .eq('workspace_id', workspaceId)
      .eq('platform', PLATFORM)
      .eq('status', 'active')
      .maybeSingle()

    if (activeLookupError) {
      console.error('[Instagram Connect] Failed to look up this workspace’s active account', activeLookupError.code, activeLookupError.message)
      return { ok: false, reason: 'write_failed', error: 'Failed to check this workspace’s existing Instagram connection' }
    }

    if (existingActiveForWorkspace) {
      const { error: disconnectOldError } = await supabaseServer
        .from('social_connected_accounts')
        .update({ status: 'disconnected', updated_at: now })
        .eq('id', existingActiveForWorkspace.id)

      if (disconnectOldError) {
        console.error('[Instagram Connect] Failed to disconnect the previous account', disconnectOldError.code, disconnectOldError.message)
        return { ok: false, reason: 'write_failed', error: 'Failed to replace the previous Instagram connection' }
      }
      replacedPreviousAccount = true
      previousUsername = existingActiveForWorkspace.username
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
      console.error('[Instagram Connect] Failed to create connected account', insertError?.code, insertError?.message)
      return { ok: false, reason: 'write_failed', error: 'Failed to create the connected Instagram account' }
    }

    connectedAccountId = created.id
    reauthorized = false
  }

  const { error: tokenError } = await supabaseServer.from('social_account_tokens').upsert(
    {
      connected_account_id: connectedAccountId,
      provider,
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
    console.error('[Instagram Connect] Failed to store content token', tokenError.code, tokenError.message)
    return { ok: false, reason: 'write_failed', error: 'Account connected, but failed to store its access token — try reconnecting' }
  }

  const { error: identifierError } = await supabaseServer.from('social_connected_account_identifiers').upsert(
    {
      connected_account_id: connectedAccountId,
      provider,
      identifier_type: identifierTypeFor(provider),
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
    console.error('[Instagram Connect] Failed to store account identifier', identifierError.code, identifierError.message)
  }

  logConnectStage(reauthorized ? 'account_reauthorized' : 'account_connected', { connectedAccountId, replacedPreviousAccount })
  return { ok: true, connectedAccountId, reauthorized, replacedPreviousAccount, previousUsername }
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

  logConnectStage('account_disconnected', { connectedAccountId: account.id })
  return { ok: true }
}
