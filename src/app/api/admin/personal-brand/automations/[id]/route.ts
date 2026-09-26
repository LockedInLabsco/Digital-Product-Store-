import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateAutomationRuleInput } from '@/src/lib/instagram/validate'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const result = validateAutomationRuleInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid automation rule' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('ig_automation_rules')
      .update({ ...result.value, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Instagram Automations] Update error', error.message)
      return NextResponse.json({ error: 'Failed to update automation rule' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }

    return NextResponse.json({ rule: data })
  } catch (error) {
    console.error('[Instagram Automations] Exception in PUT', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — cascades to the rule's follow-ups and runs (see the
// on-delete-cascade FKs in 0017_instagram_automations.sql).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer.from('ig_automation_rules').delete().eq('id', params.id).select()

    if (error) {
      console.error('[Instagram Automations] Delete error', error.message)
      return NextResponse.json({ error: 'Failed to delete automation rule' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Instagram Automations] Exception in DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
