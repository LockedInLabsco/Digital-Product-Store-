import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { sendDirectMessage } from '@/src/lib/instagram/client'

const MAX_RUNS_PER_INVOCATION = 100

/**
 * Sends every due follow-up step. Meant to be hit on a schedule by an
 * external pinger (Vercel Cron on Hobby only runs daily, too coarse for
 * hour-scale delays — see docs/INSTAGRAM_AUTOMATIONS_SETUP.md for the
 * recommended setup), protected by CRON_SECRET rather than admin auth
 * since the caller is never a logged-in admin.
 *
 * Follow-ups are only deliverable within Meta's 24-hour messaging
 * window since the recipient's last message — a step scheduled further
 * out than that will fail at send time. That's recorded as
 * `last_error`, not retried; see sendDirectMessage's own doc comment.
 */
export async function GET(request: NextRequest) {
  const providedSecret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: dueRuns, error: dueError } = await supabaseServer
    .from('ig_automation_runs')
    .select('*')
    .eq('completed', false)
    .lte('next_due_at', new Date().toISOString())
    .limit(MAX_RUNS_PER_INVOCATION)

  if (dueError) {
    console.error('[Instagram Follow-ups] Failed to fetch due runs', dueError.message)
    return NextResponse.json({ error: 'Failed to fetch due follow-ups' }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const run of dueRuns || []) {
    const { data: step } = await supabaseServer
      .from('ig_automation_followups')
      .select('*')
      .eq('rule_id', run.rule_id)
      .eq('step_order', run.next_step)
      .maybeSingle()

    if (!step) {
      await supabaseServer
        .from('ig_automation_runs')
        .update({ completed: true, next_due_at: null, updated_at: new Date().toISOString() })
        .eq('id', run.id)
      continue
    }

    const result = await sendDirectMessage(run.recipient_ig_id, step.message)

    if (!result.ok) {
      failed++
      await supabaseServer
        .from('ig_automation_runs')
        .update({ completed: true, last_error: result.error, updated_at: new Date().toISOString() })
        .eq('id', run.id)
      continue
    }

    sent++

    const { data: nextStep } = await supabaseServer
      .from('ig_automation_followups')
      .select('*')
      .eq('rule_id', run.rule_id)
      .gt('step_order', run.next_step)
      .order('step_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    const update = nextStep
      ? {
          next_step: nextStep.step_order,
          next_due_at: new Date(Date.now() + nextStep.delay_hours * 60 * 60 * 1000).toISOString(),
        }
      : { completed: true, next_due_at: null }

    await supabaseServer
      .from('ig_automation_runs')
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq('id', run.id)
  }

  return NextResponse.json({ checked: dueRuns?.length || 0, sent, failed })
}
