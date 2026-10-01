/**
 * Webhook account resolution — PREPARED, NOT YET WIRED IN. See the
 * Social Workspace Phase 2 report: Step 2 (switching
 * src/app/api/webhooks/instagram/route.ts to call this) is explicitly
 * blocked until the connected-account backfill (Step 0) has actually run
 * and a real 'webhook_entry_id' identifier row exists for the migrated
 * account — flipping the webhook to require a match before that row
 * exists would fail every single incoming event closed, taking down the
 * currently-working Auto DM system. src/app/api/webhooks/instagram/route.ts
 * is untouched; this file exists so the resolution logic itself can be
 * built and tested now, ready to wire in as soon as Step 0 is unblocked.
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
 * for: no matching identifier row, a disconnected account, or a lookup
 * error. There is no fallback branch here that selects "the first" or
 * "the only" account — an unmatched entry.id must result in zero
 * automation execution, per the Phase 2 security requirement.
 */
export async function resolveConnectedAccountFromWebhookEntryId(entryId: string): Promise<ResolvedWebhookAccount | null> {
  if (!entryId) return null

  const { data: identifier, error: identifierError } = await supabaseServer
    .from('social_connected_account_identifiers')
    .select('connected_account_id')
    .eq('identifier_type', 'webhook_entry_id')
    .eq('external_id', entryId)
    .maybeSingle()

  if (identifierError) {
    console.error('[Instagram Account Resolution] Identifier lookup failed', identifierError.message)
    return null
  }
  if (!identifier) return null

  const { data: account, error: accountError } = await supabaseServer
    .from('social_connected_accounts')
    .select('id, workspace_id, status')
    .eq('id', identifier.connected_account_id)
    .maybeSingle()

  if (accountError) {
    console.error('[Instagram Account Resolution] Account lookup failed', accountError.message)
    return null
  }
  // A disconnected account resolves to nothing — see Phase 2 Step 13:
  // disconnected must behave as fully unavailable, not as a stale-but-
  // still-matched account.
  if (!account || account.status !== 'active') return null

  return { connectedAccountId: account.id, workspaceId: account.workspace_id }
}
