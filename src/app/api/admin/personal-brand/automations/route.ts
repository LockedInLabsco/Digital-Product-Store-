import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { canAccessLegacyUnmigratedAutomationData } from '@/src/lib/admin/socialWorkspaceScope'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse, roleCanWrite } from '@/src/lib/admin/activeSocialWorkspace'
import { resolveConnectedAccountIdsForWorkspaces } from '@/src/lib/social/automationAccountScope'
import { validateAutomationRuleInput } from '@/src/lib/instagram/validate'

// GET all automation rules belonging to the caller's active Social
// Workspace's connected account, each with its follow-up sequence
// attached, oldest first (matching the order the matching engine uses
// when more than one rule could fire for the same trigger).
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }
    const { scope, workspaceId } = active.context

    const accountIds = await resolveConnectedAccountIdsForWorkspaces([workspaceId])
    // TRANSITIONAL — see canAccessLegacyUnmigratedAutomationData's own
    // doc comment. Drop this OR clause once the one-time backfill has
    // run with INSTAGRAM_BUSINESS_ACCOUNT_ID configured.
    const includeLegacyUnmigrated = canAccessLegacyUnmigratedAutomationData(scope)

    if (accountIds.length === 0 && !includeLegacyUnmigrated) {
      return NextResponse.json({ rules: [] })
    }

    let rulesQuery = supabaseServer.from('ig_automation_rules').select('*').order('created_at', { ascending: true })
    rulesQuery =
      accountIds.length > 0 && includeLegacyUnmigrated
        ? rulesQuery.or(`connected_account_id.in.(${accountIds.join(',')}),connected_account_id.is.null`)
        : includeLegacyUnmigrated
          ? rulesQuery.is('connected_account_id', null)
          : rulesQuery.in('connected_account_id', accountIds)

    const [{ data: rules, error: rulesError }, { data: followups, error: followupsError }] = await Promise.all([
      rulesQuery,
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
// /automations/[id]/followups once the rule exists). Associated with the
// caller's one writable workspace's active connected Instagram account,
// if one exists yet — left null otherwise (a rule may be authored before
// a Meta connection exists, same as today's behavior; see the Social
// Media Multi-Workspace Audit's Phase F token-refactor prep).
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }
    if (!roleCanWrite(active.context.role)) {
      return NextResponse.json({ error: 'You do not have write access to this Social Workspace' }, { status: 403 })
    }

    const { data: connectedAccount } = await supabaseServer
      .from('social_connected_accounts')
      .select('id')
      .eq('workspace_id', active.context.workspaceId)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .maybeSingle()

    const body = await request.json().catch(() => ({}))
    const result = validateAutomationRuleInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid automation rule' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('ig_automation_rules')
      .insert({ ...result.value, connected_account_id: connectedAccount?.id ?? null })
      .select()
      .single()

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
