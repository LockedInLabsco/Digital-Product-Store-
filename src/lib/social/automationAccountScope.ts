import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { canAccessLegacyUnmigratedAutomationData, type SocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'

/**
 * Resolves every social_connected_accounts.id reachable from a set of
 * workspace ids — the scoping unit ig_automation_rules/runs actually use
 * (connected_account_id, not workspace_id directly; see the Social Media
 * Multi-Workspace Audit §12). Shared by every Auto DM admin route so
 * this query/decision isn't re-implemented per file.
 */
export async function resolveConnectedAccountIdsForWorkspaces(workspaceIds: string[]): Promise<string[]> {
  if (workspaceIds.length === 0) return []
  const { data } = await supabaseServer.from('social_connected_accounts').select('id').in('workspace_id', workspaceIds)
  return (data || []).map((r) => r.id)
}

/**
 * Can this scope access an automation rule/run whose connectedAccountId
 * is `accountId` (possibly null — a pre-migration legacy row). `accountIds`
 * must already be resolved for the relevant permission level (read:
 * scope.memberWorkspaceIds: write: scope.writableWorkspaceIds — these
 * genuinely differ, so the caller passes the right one rather than this
 * function guessing). The null branch is TRANSITIONAL — see
 * canAccessLegacyUnmigratedAutomationData's own doc comment.
 */
export function canAccessAutomationAccount(scope: SocialWorkspaceScope, accountIds: string[], connectedAccountId: string | null): boolean {
  if (connectedAccountId) return accountIds.includes(connectedAccountId)
  return canAccessLegacyUnmigratedAutomationData(scope)
}
