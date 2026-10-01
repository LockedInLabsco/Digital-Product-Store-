import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import type { WkActivityAction, WkActivityEntityType } from '@/src/types/work'

/**
 * The ONLY code path that writes to wk_activity_log — every Work API
 * route that mutates something important calls this instead of its own
 * insert, so the shape stays consistent and callers can't accidentally
 * log more than intended. actorAdminUserId must come from a resolved
 * WorkScope/CurrentAdmin, never from request input — the client can
 * never submit an arbitrary audit entry, since there is no route that
 * writes to this table directly from a request body.
 *
 * Failures are logged and swallowed, not thrown: an audit-log write
 * failing should never roll back or fail the mutation it's describing
 * (the mutation has already succeeded by the time this is called),
 * matching how the rest of this codebase treats best-effort side effects
 * (e.g. the invite-email failure handling in /api/admin/team).
 */
export async function logWorkActivity(params: {
  actorAdminUserId: string
  action: WkActivityAction
  entityType: WkActivityEntityType
  entityId?: string | null
  /** Small, specific change context only — e.g. { status: { from, to } }.
   * Never the full entity row. */
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabaseServer.from('wk_activity_log').insert({
    actor_admin_user_id: params.actorAdminUserId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  })

  if (error) {
    console.error('[logWorkActivity] Failed to write activity log entry', params.action, error.message)
  }
}
