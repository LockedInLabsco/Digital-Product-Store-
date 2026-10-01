import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'

/**
 * True if demoting-to-member or removing `memberRowId` (a wk_team_members
 * row id) would leave its team with zero leads. Mirrors
 * isLastActiveOwner() in src/lib/admin/teamGuards.ts exactly — same
 * "never let a required invariant collapse to zero" shape — checked
 * server-side before any role-change or removal, never just disabled in
 * the UI. Unlike owner, a team is allowed to have had zero leads from
 * the start (team creation doesn't auto-assign one) — this only blocks
 * going from exactly one lead to zero, not enforces one always exists.
 */
export async function wouldRemoveLastTeamLead(memberRowId: string): Promise<boolean> {
  const { data: target } = await supabaseServer
    .from('wk_team_members')
    .select('team_id, team_role')
    .eq('id', memberRowId)
    .maybeSingle()

  if (!target || target.team_role !== 'lead') return false

  const { count } = await supabaseServer
    .from('wk_team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', target.team_id)
    .eq('team_role', 'lead')
    .neq('id', memberRowId)

  return (count ?? 0) === 0
}
