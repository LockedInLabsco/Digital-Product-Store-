import { NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse, roleCanWrite } from '@/src/lib/admin/activeSocialWorkspace'
import { resolveConnectedAccountIdsForWorkspaces, canAccessAutomationAccount } from '@/src/lib/social/automationAccountScope'

export async function DELETE(request: Request, { params }: { params: { id: string; followupId: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }
    const { scope, workspaceId, role } = active.context
    if (!roleCanWrite(role)) {
      return NextResponse.json({ error: 'You do not have write access to this Social Workspace' }, { status: 403 })
    }

    const { data: rule } = await supabaseServer.from('ig_automation_rules').select('connected_account_id').eq('id', params.id).maybeSingle()
    if (!rule) {
      return NextResponse.json({ error: 'Follow-up step not found' }, { status: 404 })
    }
    const writableAccountIds = await resolveConnectedAccountIdsForWorkspaces([workspaceId])
    if (!canAccessAutomationAccount(scope, writableAccountIds, rule.connected_account_id)) {
      return NextResponse.json({ error: 'Follow-up step not found' }, { status: 404 })
    }

    const { data, error } = await supabaseServer
      .from('ig_automation_followups')
      .delete()
      .eq('id', params.followupId)
      .eq('rule_id', params.id)
      .select()

    if (error) {
      console.error('[Instagram Automations] Follow-up delete error', error.message)
      return NextResponse.json({ error: 'Failed to delete follow-up step' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Follow-up step not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Instagram Automations] Exception in DELETE followup', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
