import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateAutomationRuleInput } from '@/src/lib/instagram/validate'

// GET all automation rules, each with its follow-up sequence attached,
// oldest first (matching the order the matching engine uses when more
// than one rule could fire for the same trigger).
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const [{ data: rules, error: rulesError }, { data: followups, error: followupsError }] = await Promise.all([
      supabaseServer.from('ig_automation_rules').select('*').order('created_at', { ascending: true }),
      supabaseServer.from('ig_automation_followups').select('*').order('step_order', { ascending: true }),
    ])

    if (rulesError || followupsError) {
      console.error('[Instagram Automations] Failed to fetch rules', rulesError?.message || followupsError?.message)
      return NextResponse.json({ error: 'Failed to fetch automation rules' }, { status: 500 })
    }

    const followupsByRuleId: Record<string, typeof followups> = {}
    for (const followup of followups || []) {
      if (!followupsByRuleId[followup.rule_id]) followupsByRuleId[followup.rule_id] = []
      followupsByRuleId[followup.rule_id]!.push(followup)
    }

    const rulesWithFollowups = (rules || []).map((rule) => ({
      ...rule,
      followups: followupsByRuleId[rule.id] || [],
    }))

    return NextResponse.json({ rules: rulesWithFollowups })
  } catch (error) {
    console.error('[Instagram Automations] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new automation rule (follow-ups are added separately via
// /automations/[id]/followups once the rule exists).
export async function POST(request: NextRequest) {
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

    const { data, error } = await supabaseServer.from('ig_automation_rules').insert(result.value).select().single()

    if (error) {
      console.error('[Instagram Automations] Insert error', error.message)
      return NextResponse.json({ error: 'Failed to create automation rule' }, { status: 500 })
    }

    return NextResponse.json({ rule: data }, { status: 201 })
  } catch (error) {
    console.error('[Instagram Automations] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
