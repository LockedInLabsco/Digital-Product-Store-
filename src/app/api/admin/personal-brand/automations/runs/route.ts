import { NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'

const MAX_RUNS = 200

// GET the most recent automation runs — what actually fired, matched to
// which rule, whether it's still mid-sequence, and any send error. This
// is the only visibility into the webhook receiver and follow-up cron,
// neither of which an admin ever watches directly.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const [{ data: runs, error: runsError }, { data: rules, error: rulesError }] = await Promise.all([
      supabaseServer.from('ig_automation_runs').select('*').order('created_at', { ascending: false }).limit(MAX_RUNS),
      supabaseServer.from('ig_automation_rules').select('id, name'),
    ])

    if (runsError || rulesError) {
      console.error('[Instagram Automations] Failed to fetch runs', runsError?.message || rulesError?.message)
      return NextResponse.json({ error: 'Failed to fetch automation runs' }, { status: 500 })
    }

    const ruleNameById: Record<string, string> = {}
    for (const rule of rules || []) ruleNameById[rule.id] = rule.name

    const runsWithRuleName = (runs || []).map((run) => ({ ...run, rule_name: ruleNameById[run.rule_id] || null }))

    return NextResponse.json({ runs: runsWithRuleName })
  } catch (error) {
    console.error('[Instagram Automations] Exception in GET runs', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
