import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'

/**
 * True if `adminUserId` is the only active owner left. Used before any
 * action that would remove owner status or active status from someone
 * — a role change, a disable, or a removal — to guarantee the system
 * never ends up with zero active owners. Checked server-side on every
 * write (not just disabled in the UI), per the task's owner-safety
 * requirement. An admin can hold 'owner' alongside other roles, so this
 * checks membership in the roles array, not equality.
 */
export async function isLastActiveOwner(adminUserId: string): Promise<boolean> {
  const { data: target } = await supabaseServer
    .from('admin_users')
    .select('roles, status')
    .eq('id', adminUserId)
    .maybeSingle()

  if (!target || !target.roles.includes('owner') || target.status !== 'active') {
    return false
  }

  const { count } = await supabaseServer
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .contains('roles', ['owner'])
    .eq('status', 'active')
    .neq('id', adminUserId)

  return (count ?? 0) === 0
}
