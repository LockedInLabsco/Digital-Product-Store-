import { NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, canAccessLegacyUnmigratedAutomationData } from '@/src/lib/admin/socialWorkspaceScope'
import { resolveConnectedAccountIdsForWorkspaces } from '@/src/lib/social/automationAccountScope'

const MAX_RUNS = 200

// GET the most recent automation runs belonging to the caller's
// connected account(s) — what actually fired, matched to which rule,
// whether it's still mid-sequence, and any send error. This is the only
// visibility into the webhook receiver and follow-up cron, neither of
// which an admin ever watches directly.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const scope = await getSocialWorkspaceScope()
    if (!scope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accountIds = await resolveConnectedAccountIdsForWorkspaces(scope.memberWorkspaceIds)
    // TRANSITIONAL — see canAccessLegacyUnmigratedAutomationData's own
    // doc comment. Drop this OR clause once the one-time backfill has run.
    const includeLegacyUnmigrated = canAccessLegacyUnmigratedAutomationData(scope)

    if (accountIds.length === 0 && !includeLegacyUnmigrated) {
      return NextResponse.json({ runs: [] })
    }

    let runsQuery = supabaseServer.from('ig_automation_runs').select('*').order('created_at', { ascending: false }).limit(MAX_RUNS)
    runsQuery =
      accountIds.length > 0 && includeLegacyUnmigrated
        ? runsQuery.or(`connected_account_id.in.(${accountIds.join(',')}),connected_account_id.is.null`)
        : includeLegacyUnmigrated
          ? runsQuery.is('connected_account_id', null)
          : runsQuery.in('connected_account_id', accountIds)

    const [{ data: runs, error: runsError }, { data: rules, error: rulesError }] = await Promise.all([
      runsQuery,
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
