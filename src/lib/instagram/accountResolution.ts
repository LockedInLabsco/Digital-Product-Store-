/**
 * Webhook account resolution — NOW WIRED IN (see
 * src/app/api/webhooks/instagram/route.ts, the only caller). Was
 * previously "prepared, not yet wired in" pending a real
 * 'webhook_entry_id' identifier row existing for at least one connected
 * account — that row now exists (created automatically by the Direct
 * Instagram Login connect flow, see instagramConnectAccount.ts), so the
 * webhook can safely require a match without failing every event
 * closed.
 *
 * Checks, in order, everything this app has ever recorded as "this id
 * means this connected account" — not just 'webhook_entry_id' — because
 * which identifier type Meta's entry.id actually matches is NOT
 * guaranteed to be the same for every connection method (see
 * instagramConnectAccount.ts's own doc comment): a Facebook-Login-only
 * connected account has no 'webhook_entry_id' row at all, only
 * 'graph_business_account_id', and must still resolve correctly here —
 * exactly the same broadened lookup already used for the Deauthorize/
 * Data Deletion callbacks (src/lib/social/instagramAccountLookup.ts),
 * duplicated rather than imported since that file's `status==='active'`
 * handling deliberately differs (that lookup is to find an account to
 * act on even if since disconnected; this one must fail closed on a
 * disconnected account — see below).
 */
import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'

export interface ResolvedWebhookAccount {
  connectedAccountId: string
  workspaceId: string
}

/**
 * Resolves Meta's webhook `entry.id` to the connected account it
 * belongs to — fails CLOSED (returns null, never throws, never guesses)
 * for: no match under ANY identifier, a disconnected account, or a
 * lookup error. There is no fallback branch here that selects "the
 * first" or "the only" account — an unmatched entry.id must result in
 * zero automation execution, per the Phase 2 security requirement.
 */
export async function resolveConnectedAccountFromWebhookEntryId(entryId: string): Promise<ResolvedWebhookAccount | null> {
  if (!entryId) return null

  // 1. Direct join key — both connect flows populate external_account_id
  // with the same real Meta-side account id (see
  // instagramConnectAccount.ts), so this alone already covers the
  // common case for either connection method.
  const { data: byExternalId, error: externalIdError } = await supabaseServer
    .from('social_connected_accounts')
    .select('id, workspace_id, status')
    .eq('platform', 'instagram')
    .eq('external_account_id', entryId)
    .maybeSingle()

  if (externalIdError) {
    console.error('[Instagram Account Resolution] external_account_id lookup failed', externalIdError.message)
    return null
  }

  let account = byExternalId

  // 2. Fall back to the identifiers table, any provider/identifier_type
  // — covers the case where entry.id matches a specific recorded
  // identifier (e.g. 'webhook_entry_id') that differs from
  // external_account_id for this account.
  if (!account) {
    const { data: identifier, error: identifierError } = await supabaseServer
      .from('social_connected_account_identifiers')
      .select('connected_account_id')
      .eq('external_id', entryId)
      .maybeSingle()

    if (identifierError) {
      console.error('[Instagram Account Resolution] Identifier lookup failed', identifierError.message)
      return null
    }
    if (!identifier) return null

    const { data: accountById, error: accountError } = await supabaseServer
      .from('social_connected_accounts')
      .select('id, workspace_id, status')
      .eq('id', identifier.connected_account_id)
      .maybeSingle()

    if (accountError) {
      console.error('[Instagram Account Resolution] Account lookup failed', accountError.message)
      return null
    }
    account = accountById
  }

  // A disconnected account resolves to nothing — see Phase 2 Step 13:
  // disconnected must behave as fully unavailable, not as a stale-but-
  // still-matched account.
  if (!account || account.status !== 'active') return null

  return { connectedAccountId: account.id, workspaceId: account.workspace_id }
}
