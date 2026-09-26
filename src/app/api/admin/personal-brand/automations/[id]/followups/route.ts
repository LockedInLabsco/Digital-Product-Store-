import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateAutomationFollowupInput } from '@/src/lib/instagram/validate'

// POST add a follow-up step to a rule's drip sequence.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: rule } = await supabaseServer.from('ig_automation_rules').select('id').eq('id', params.id).maybeSingle()
    if (!rule) {
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
