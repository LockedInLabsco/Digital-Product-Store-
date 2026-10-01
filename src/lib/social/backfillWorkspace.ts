import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { encryptToken } from '@/src/lib/instagram/tokenCrypto'

const WORKSPACE_NAME = 'Darshana Personal Brand'
const LEGACY_PROVIDER = 'instagram_login'
const LEGACY_ACCOUNT_ID = 'default'

export interface BackfillResult {
  ok: boolean
  error?: string
  workspace?: { id: string; name: string; created: boolean }
  membership?: { created: boolean }
  contentBackfilled?: { pb_formats: number; pb_content_items: number; pb_ideas: number; pb_experiments: number }
  connectedAccount?: { id: string; created: boolean } | { skipped: true; reason: string }
  automationBackfilled?: { ig_automation_rules: number; ig_automation_runs: number }
  tokenMigration?: {
    instagram_login: 'migrated' | 'already_existed' | 'skipped_no_connected_account' | 'skipped_no_legacy_row'
    facebook_login: 'migrated' | 'already_existed' | 'skipped_no_connected_account' | 'skipped_missing_env'
  }
}

/**
 * Idempotent, server-only migration of the one existing (GLOBAL) Personal
 * Brand / Instagram automation dataset into the first real Social
 * Workspace. Safe to call more than once — every step either no-ops or
 * only touches rows still in their pre-migration (NULL/unmigrated)
 * state. Never logs or returns a token value.
 *
 * Deliberately does NOT guess which admin is "the" owner: requires
 * exactly one active admin_users row holding the 'owner' role, and
 * fails loudly (returns ok:false, writes nothing) otherwise — see the
 * Social Media Multi-Workspace Audit's explicit "do not randomly choose"
 * requirement. Called from a requirePermission('social:manage_workspaces')
 * -gated route — see src/app/api/admin/social/_internal/backfill-workspace/route.ts.
 */
export async function backfillSocialWorkspace(): Promise<BackfillResult> {
  // 1. Resolve the unique active owner — never guessed.
  const { data: owners, error: ownersError } = await supabaseServer
    .from('admin_users')
    .select('id, email')
    .contains('roles', ['owner'])
    .eq('status', 'active')

  if (ownersError) {
    return { ok: false, error: `Failed to resolve owner identity: ${ownersError.message}` }
  }
  if (!owners || owners.length !== 1) {
    return {
      ok: false,
      error:
        owners && owners.length > 1
          ? `Found ${owners.length} active admin accounts holding the 'owner' role — cannot determine the correct identity automatically. Provide the exact admin_users.id to use and resolve this manually.`
          : `Found no active admin account holding the 'owner' role — cannot create the initial workspace. Provide the exact admin_users.id to use and resolve this manually.`,
    }
  }
  const ownerAdminUserId = owners[0].id

  // 2. Idempotent workspace creation.
  const { data: existingWorkspace } = await supabaseServer
    .from('social_workspaces')
    .select('id, name')
    .ilike('name', WORKSPACE_NAME)
    .maybeSingle()

  let workspaceId: string
  let workspaceCreated = false

  if (existingWorkspace) {
    workspaceId = existingWorkspace.id
  } else {
    const { data: created, error: createError } = await supabaseServer
      .from('social_workspaces')
      .insert({ name: WORKSPACE_NAME, created_by: ownerAdminUserId })
      .select('id')
      .single()
    if (createError || !created) {
      return { ok: false, error: `Failed to create workspace: ${createError?.message}` }
    }
    workspaceId = created.id
    workspaceCreated = true
  }

  // 3. Idempotent membership — owner role for the resolved owner identity.
  const { data: existingMembership } = await supabaseServer
    .from('social_workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('admin_user_id', ownerAdminUserId)
    .maybeSingle()

  let membershipCreated = false
  if (!existingMembership) {
    const { error: memberError } = await supabaseServer
      .from('social_workspace_members')
      .insert({ workspace_id: workspaceId, admin_user_id: ownerAdminUserId, workspace_role: 'owner' })
    if (memberError) {
      return { ok: false, error: `Failed to create workspace membership: ${memberError.message}` }
    }
    membershipCreated = true
  }

  // 4. Backfill workspace_id on existing Content OS rows still unassigned.
  const contentBackfilled = { pb_formats: 0, pb_content_items: 0, pb_ideas: 0, pb_experiments: 0 }
  for (const table of ['pb_formats', 'pb_content_items', 'pb_ideas', 'pb_experiments'] as const) {
    const { data: updated, error: updateError } = await supabaseServer
      .from(table)
      .update({ workspace_id: workspaceId })
      .is('workspace_id', null)
      .select('id')
    if (updateError) {
      return { ok: false, error: `Failed to backfill ${table}: ${updateError.message}` }
    }
    contentBackfilled[table] = updated?.length ?? 0
  }

  // 5. Connected account — only if the Facebook Login account id is
  // actually available in THIS runtime's environment. If not, every
  // step below is skipped (not failed) and can be completed later by
  // re-running this same idempotent function in an environment where
  // it's configured.
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  let connectedAccountResult: BackfillResult['connectedAccount']
  let connectedAccountId: string | null = null

  if (!businessAccountId) {
    connectedAccountResult = { skipped: true, reason: 'INSTAGRAM_BUSINESS_ACCOUNT_ID is not set in this environment' }
  } else {
    const { data: existingAccount } = await supabaseServer
      .from('social_connected_accounts')
      .select('id')
      .eq('platform', 'instagram')
      .eq('external_account_id', businessAccountId)
      .maybeSingle()

    if (existingAccount) {
      connectedAccountId = existingAccount.id
      connectedAccountResult = { id: existingAccount.id, created: false }
    } else {
      const { data: createdAccount, error: accountError } = await supabaseServer
        .from('social_connected_accounts')
        .insert({
          workspace_id: workspaceId,
          platform: 'instagram',
          external_account_id: businessAccountId,
          status: 'active',
          connected_by: ownerAdminUserId,
          connected_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (accountError || !createdAccount) {
        return { ok: false, error: `Failed to create connected account: ${accountError?.message}` }
      }
      connectedAccountId = createdAccount.id
      connectedAccountResult = { id: createdAccount.id, created: true }
    }

    // Record the one identifier we actually have confirmed — the
    // Facebook Login / Graph API side. The Instagram Login side's own
    // identifier (what webhook routing will need — see
    // 0026_social_connected_account_identifiers.sql and the Phase 2
    // report's Step 1) is deliberately NOT written here: we have no
    // confirmed value for it yet, and this function must never guess one.
    await supabaseServer
      .from('social_connected_account_identifiers')
      .upsert(
        { connected_account_id: connectedAccountId, provider: 'facebook_login', identifier_type: 'graph_business_account_id', external_id: businessAccountId },
        { onConflict: 'provider,identifier_type,external_id', ignoreDuplicates: true }
      )
  }

  // 6. Backfill connected_account_id on existing automation rows, only
  // if a connected account was resolved above.
  const automationBackfilled = { ig_automation_rules: 0, ig_automation_runs: 0 }
  if (connectedAccountId) {
    for (const table of ['ig_automation_rules', 'ig_automation_runs'] as const) {
      const { data: updated, error: updateError } = await supabaseServer
        .from(table)
        .update({ connected_account_id: connectedAccountId })
        .is('connected_account_id', null)
        .select('id')
      if (updateError) {
        return { ok: false, error: `Failed to backfill ${table}: ${updateError.message}` }
      }
      automationBackfilled[table] = updated?.length ?? 0
    }
  }

  // 7. Token migration — re-key the existing instagram_login row (copy
  // its ciphertext as-is, never decrypted here) and seed a new
  // facebook_login row from the env var, both only once a connected
  // account id exists to attach them to.
  const tokenMigration: BackfillResult['tokenMigration'] = {
    instagram_login: 'skipped_no_connected_account',
    facebook_login: 'skipped_no_connected_account',
  }

  if (connectedAccountId) {
    const { data: existingIgLoginToken } = await supabaseServer
      .from('social_account_tokens')
      .select('id')
      .eq('connected_account_id', connectedAccountId)
      .eq('provider', LEGACY_PROVIDER)
      .maybeSingle()

    if (existingIgLoginToken) {
      tokenMigration.instagram_login = 'already_existed'
    } else {
      const { data: legacyRow } = await supabaseServer
        .from('instagram_integration_credentials')
        .select('encrypted_access_token, token_type, expires_at, last_refreshed_at, refresh_status, last_refresh_error')
        .eq('provider', LEGACY_PROVIDER)
        .eq('account_id', LEGACY_ACCOUNT_ID)
        .maybeSingle()

      if (!legacyRow) {
        tokenMigration.instagram_login = 'skipped_no_legacy_row'
      } else {
        const { error: insertTokenError } = await supabaseServer.from('social_account_tokens').insert({
          connected_account_id: connectedAccountId,
          provider: LEGACY_PROVIDER,
          encrypted_access_token: legacyRow.encrypted_access_token,
          token_type: legacyRow.token_type,
          expires_at: legacyRow.expires_at,
          last_refreshed_at: legacyRow.last_refreshed_at,
          refresh_status: legacyRow.refresh_status,
          last_refresh_error: legacyRow.last_refresh_error,
        })
        if (insertTokenError) {
          return { ok: false, error: `Failed to migrate instagram_login token: ${insertTokenError.message}` }
        }
        tokenMigration.instagram_login = 'migrated'
      }
    }

    const { data: existingFbLoginToken } = await supabaseServer
      .from('social_account_tokens')
      .select('id')
      .eq('connected_account_id', connectedAccountId)
      .eq('provider', 'facebook_login')
      .maybeSingle()

    if (existingFbLoginToken) {
      tokenMigration.facebook_login = 'already_existed'
    } else if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
      tokenMigration.facebook_login = 'skipped_missing_env'
    } else {
      const { error: insertFbTokenError } = await supabaseServer.from('social_account_tokens').insert({
        connected_account_id: connectedAccountId,
        provider: 'facebook_login',
        encrypted_access_token: encryptToken(process.env.INSTAGRAM_ACCESS_TOKEN),
        token_type: 'unknown',
        refresh_status: 'unknown',
      })
      if (insertFbTokenError) {
        return { ok: false, error: `Failed to seed facebook_login token: ${insertFbTokenError.message}` }
      }
      tokenMigration.facebook_login = 'migrated'
    }
  }

  return {
    ok: true,
    workspace: { id: workspaceId, name: WORKSPACE_NAME, created: workspaceCreated },
    membership: { created: membershipCreated },
    contentBackfilled,
    connectedAccount: connectedAccountResult,
    automationBackfilled,
    tokenMigration,
  }
}
