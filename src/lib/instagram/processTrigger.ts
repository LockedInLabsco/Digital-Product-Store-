import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { sendDirectMessage, sendPrivateReplyToComment } from './client'
import { findMatchingRule } from './automations'
import type { IgAutomationRule, IgRunSourceType, IgTriggerType } from '@/src/types/instagramAutomation'

export interface TriggerEvent {
  triggerType: IgTriggerType
  sourceType: IgRunSourceType
  /** The comment id (for comment_keyword) or message id (for dm_keyword
   * / story_reply) — the hard de-dupe key, so the same event is never
   * processed twice even if Meta redelivers the webhook. */
  sourceId: string
  recipientIgId: string
  text: string | null
}

/**
 * The webhook receiver's core logic: find a matching active rule, claim
 * the event (de-duped by source id), send the initial reply, and queue
 * the first follow-up step if the rule has one. Never throws — a failed
 * send is recorded on the run row, not retried, since Meta does not
 * redeliver on a 200 response and a background retry loop is more
 * complexity than a personal-brand-scale volume of DMs needs.
 */
export async function processTrigger(event: TriggerEvent): Promise<void> {
  const { data: rules, error: rulesError } = await supabaseServer
    .from('ig_automation_rules')
    .select('*')
    .eq('trigger_type', event.triggerType)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (rulesError) {
    console.error('[Instagram Webhook] Failed to fetch rules', rulesError.message)
    return
  }

  const rule = findMatchingRule((rules || []) as IgAutomationRule[], event.triggerType, event.text)
  if (!rule) return

  const { data: run, error: insertError } = await supabaseServer
    .from('ig_automation_runs')
    .insert({
      rule_id: rule.id,
      source_type: event.sourceType,
      source_id: event.sourceId,
      recipient_ig_id: event.recipientIgId,
    })
    .select()
    .single()

  if (insertError) {
    // 23505 = unique violation on (source_type, source_id) — this exact
    // comment/message was already processed (e.g. a redelivered
    // webhook). Not an error, just a no-op.
    if (insertError.code !== '23505') {
      console.error('[Instagram Webhook] Failed to record run', insertError.message)
    }
    return
  }

  const sendResult =
    event.sourceType === 'comment'
      ? await sendPrivateReplyToComment(event.sourceId, rule.reply_message)
      : await sendDirectMessage(event.recipientIgId, rule.reply_message)

  if (!sendResult.ok) {
    await supabaseServer
      .from('ig_automation_runs')
      .update({ completed: true, last_error: sendResult.error, updated_at: new Date().toISOString() })
      .eq('id', run.id)
    return
  }

  const { data: firstFollowup } = await supabaseServer
    .from('ig_automation_followups')
    .select('*')
    .eq('rule_id', rule.id)
    .order('step_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  const update = firstFollowup
    ? {
        initial_sent_at: new Date().toISOString(),
        next_step: firstFollowup.step_order,
        next_due_at: new Date(Date.now() + firstFollowup.delay_hours * 60 * 60 * 1000).toISOString(),
      }
    : {
        initial_sent_at: new Date().toISOString(),
        completed: true,
        next_due_at: null,
      }

  await supabaseServer
    .from('ig_automation_runs')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', run.id)
}
