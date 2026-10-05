/**
 * Composes the EXISTING workspace resolver with self-service
 * provisioning — this is not a second workspace-resolution mechanism,
 * it's a thin wrapper that only ever acts in the one case
 * resolveDefaultWritableWorkspaceId() can't already resolve safely:
 * zero membership anywhere. Every other case (one writable workspace,
 * two-or-more writable workspaces, a member-but-read-only-elsewhere
 * admin) passes straight through to the unmodified existing resolver,
 * so none of its fail-closed guarantees change.
 *
 * socialWorkspaceScope.ts itself is intentionally untouched — see the
 * implementation report for why provisioning belongs in a separate,
 * narrowly-scoped file rather than growing that one.
 */
import 'server-only'
import { resolveDefaultWritableWorkspaceId, type SocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { provisionOwnWorkspace } from './provisionWorkspace'

export type EnsureWritableWorkspaceResult = { ok: true; workspaceId: string } | { ok: false; error: string }

/**
 * - Zero memberships at all (scope.memberWorkspaceIds.length === 0):
 *   this admin has never belonged to ANY Social Workspace — the one
 *   genuinely unambiguous case where creating exactly one new workspace
 *   for them is correct, not a guess. Provisions it, then returns it.
 * - One or more existing memberships: delegates entirely to
 *   resolveDefaultWritableWorkspaceId(scope) — an admin who already
 *   belongs to a workspace (even as a read-only analyst elsewhere) never
 *   gets a second one created on their behalf, and an admin with 2+
 *   writable workspaces still fails closed exactly as before.
 */
export async function ensureWritableSocialWorkspace(scope: SocialWorkspaceScope, adminEmail: string): Promise<EnsureWritableWorkspaceResult> {
  if (scope.memberWorkspaceIds.length > 0) {
    return resolveDefaultWritableWorkspaceId(scope)
  }

  const provisioned = await provisionOwnWorkspace(scope.adminUserId, adminEmail)
  if (!provisioned.ok) {
    return { ok: false, error: provisioned.error }
  }

  return { ok: true, workspaceId: provisioned.workspace.workspaceId }
}
