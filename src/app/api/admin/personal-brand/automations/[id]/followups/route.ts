import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { resolveConnectedAccountIdsForWorkspaces, canAccessAutomationAccount } from '@/src/lib/social/automationAccountScope'
import { validateAutomationFollowupInput } from '@/src/lib/instagram/validate'

// POST add a follow-up step to a rule's drip sequence. Ownership is
// inherited through the parent rule_id (ig_automation_followups has no
// connected_account_id of its own by design), so the parent rule's
// connected_account_id is checked before anything is written.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const scope = await getSocialWorkspaceScope()
    if (!scope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: rule } = await supabaseServer.from('ig_automation_rules').select('id, connected_account_id').eq('id', params.id).maybeSingle()
    if (!rule) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }
    const writableAccountIds = await resolveConnectedAccountIdsForWorkspaces(scope.writableWorkspaceIds)
    if (!canAccessAutomationAccount(scope, writableAccountIds, rule.connected_account_id)) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const result = validateAutomationFollowupInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid follow-up step' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('ig_automation_followups')
      .insert({ ...result.value, rule_id: params.id })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A follow-up already exists at this step order' }, { status: 409 })
      }
      console.error('[Instagram Automations] Follow-up insert error', error.message)
      return NextResponse.json({ error: 'Failed to create follow-up step' }, { status: 500 })
    }

    return NextResponse.json({ followup: data }, { status: 201 })
  } catch (error) {
    console.error('[Instagram Automations] Exception in POST followups', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
