/**
 * Best-effort "which connected account does this Meta user_id mean"
 * lookup, shared by the Deauthorize and Data Deletion callbacks (see
 * src/app/api/admin/social/instagram/deauthorize/route.ts and
 * .../data-deletion/route.ts).
 *
 * HONEST LIMITATION, documented rather than silently assumed away: Meta's
 * own docs describe the signed_request's `user_id` as an app-scoped id
 * for classic Facebook Login, but do not specify what it is for an app
 * using Instagram Login specifically — and src/lib/instagram/instagramLoginOAuth.ts's
 * own header already documents that Instagram Login's OWN token-exchange
 * response returns an app-scoped `user_id` that is NOT the same as the
 * stable Instagram professional account id (external_account_id). This
 * codebase does not currently store that app-scoped id anywhere (Phase G
 * deliberately excluded it as untrustworthy for its own purposes), and
 * this task is explicitly scoped to NOT touch the OAuth connect flow to
 * add that mapping. So this function checks every id this app DOES
 * already store that a deauthorize/deletion user_id could plausibly
 * match, and returns "no match" rather than guessing if none do — never
 * disconnecting or deleting the wrong account, and still always letting
 * the calling route return Meta's required response either way.
 */
import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'

export interface MatchedConnectedAccount {
  connectedAccountId: string
  workspaceId: string
}

export async function findConnectedAccountByMetaUserId(metaUserId: string): Promise<MatchedConnectedAccount | null> {
  const { data: byExternalId, error: externalIdError } = await supabaseServer
    .from('social_connected_accounts')
    .select('id, workspace_id')
    .eq('platform', 'instagram')
    .eq('external_account_id', metaUserId)
    .maybeSingle()

  if (externalIdError) {
    console.error('[Instagram Account Lookup] external_account_id lookup failed', externalIdError.message)
  }
  if (byExternalId) {
    return { connectedAccountId: byExternalId.id, workspaceId: byExternalId.workspace_id }
  }

  const { data: byIdentifier, error: identifierError } = await supabaseServer
    .from('social_connected_account_identifiers')
    .select('connected_account_id')
    .eq('external_id', metaUserId)
    .maybeSingle()

  if (identifierError) {
    console.error('[Instagram Account Lookup] identifier lookup failed', identifierError.message)
    return null
  }
  if (!byIdentifier) {
    return null
  }

  const { data: account, error: accountError } = await supabaseServer
    .from('social_connected_accounts')
    .select('id, workspace_id')
    .eq('id', byIdentifier.connected_account_id)
    .maybeSingle()

  if (accountError || !account) {
    if (accountError) console.error('[Instagram Account Lookup] connected account lookup failed', accountError.message)
    return null
  }

  return { connectedAccountId: account.id, workspaceId: account.workspace_id }
}
