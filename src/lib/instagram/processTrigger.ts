import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { sendDirectMessage, sendPrivateReplyToComment, replyToComment } from './client'
import { findMatchingRule } from './automations'
import { pickPublicReplyVariationIndex } from './publicReply'
import { maskId, previewText, sanitizeError, webhookDebug } from './webhookDebug'
import { logConnectStage } from './connectDiagnostics'
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
  /** The Instagram media id the comment was made on — only present for
   * comment_keyword events — used to filter rules scoped to one post. */
  mediaId?: string | null
  /** The connected account this event was resolved to BEFORE processTrigger
   * was ever called (see src/lib/instagram/accountResolution.ts and
   * src/app/api/webhooks/instagram/route.ts, the only caller) — rules
   * are matched ONLY within this account, and the eventual send uses
   * ONLY this account's own stored token. Required, never optional:
   * there is no "global" rule-matching or sending left in this
   * function — an event the webhook couldn't resolve to a real
   * connected account never reaches processTrigger at all. */
  connectedAccountId: string
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
    .eq('connected_account_id', event.connectedAccountId)
    .order('created_at', { ascending: true })

  if (rulesError) {
    console.error('[Instagram Webhook] Failed to fetch rules', rulesError.message)
    return
  }

  // Temporary diagnostic — keywords here are admin-authored rule config,
  // not user data, so logging them is safe and is what makes a
  // keyword/normalization mismatch obvious at a glance.
  webhookDebug('rules', {
    triggerType: event.triggerType,
    activeRules: (rules || []).length,
    keywords: ((rules || []) as IgAutomationRule[]).map((r) => r.keyword),
    matchTypes: ((rules || []) as IgAutomationRule[]).map((r) => r.match_type),
    textPreview: previewText(event.text),
  })

  const rule = findMatchingRule((rules || []) as IgAutomationRule[], event.triggerType, event.text, event.mediaId)

  webhookDebug('match', {
    triggerType: event.triggerType,
    matched: Boolean(rule),
    ruleId: rule ? rule.id.slice(0, 8) : 'none',
  })

  // DM-specific structured logs (permanent, unlike webhookDebug above —
  // see connectDiagnostics.ts) — scoped to non-comment event types so
  // the existing comment_keyword path's own logging/behavior is
  // unchanged.
  if (event.sourceType !== 'comment') {
    if (rule) {
      logConnectStage('instagram_dm_rule_matched', { connectedAccountId: event.connectedAccountId, ruleId: rule.id, triggerType: event.triggerType })
    } else {
      logConnectStage('instagram_dm_no_matching_rule', { connectedAccountId: event.connectedAccountId, triggerType: event.triggerType })
    }
  }

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
    webhookDebug('runInsert', { ok: false, duplicate: insertError.code === '23505', code: insertError.code })
    if (insertError.code !== '23505') {
      console.error('[Instagram Webhook] Failed to record run', insertError.message)
    }
    return
  }

  // Public comment reply (e.g. "Check your DMs 👀") — entirely separate
  // from the private-reply DM below, and never allowed to block it: a
  // failed or skipped public reply just leaves publicReplyError set, the
  // private DM is still attempted either way.
  let publicReplyVariationIndex: number | null = null
  let publicReplyError: string | null = null

  if (event.sourceType === 'comment' && rule.public_reply_enabled && rule.public_reply_variations.length > 0) {
    let lastUsedIndex: number | null = null
    if (rule.public_reply_variations.length > 1) {
      const { data: lastPublicReplyRun } = await supabaseServer
        .from('ig_automation_runs')
        .select('public_reply_variation_index')
        .eq('rule_id', rule.id)
        .not('public_reply_variation_index', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lastUsedIndex = lastPublicReplyRun?.public_reply_variation_index ?? null
    }

    publicReplyVariationIndex = pickPublicReplyVariationIndex(rule.public_reply_variations.length, lastUsedIndex)
    const publicReplyResult = await replyToComment(event.connectedAccountId, event.sourceId, rule.public_reply_variations[publicReplyVariationIndex])
    if (!publicReplyResult.ok) {
      publicReplyError = publicReplyResult.error
      console.error('[Instagram Webhook] Public comment reply failed — private DM still proceeds', publicReplyResult.error)
    }
  }

  const button = rule.button_url && rule.button_label ? { url: rule.button_url, label: rule.button_label } : null

  webhookDebug('send', {
    method: event.sourceType === 'comment' ? 'sendPrivateReplyToComment' : 'sendDirectMessage',
    sourceType: event.sourceType,
    ruleId: rule.id.slice(0, 8),
    hasButton: Boolean(button),
    recipient: maskId(event.recipientIgId),
  })

  const sendResult =
    event.sourceType === 'comment'
      ? await sendPrivateReplyToComment(event.connectedAccountId, event.sourceId, rule.reply_message, button)
      : await sendDirectMessage(event.connectedAccountId, event.recipientIgId, rule.reply_message, button)

  if (event.sourceType !== 'comment') {
    logConnectStage(sendResult.ok ? 'instagram_dm_send_success' : 'instagram_dm_send_failure', {
      connectedAccountId: event.connectedAccountId,
      ruleId: rule.id,
      messageId: event.sourceId,
      ...(sendResult.ok ? {} : { reason: sanitizeError(sendResult.error) }),
    })
  }

  webhookDebug('sendResult', {
    sourceType: event.sourceType,
    ok: sendResult.ok,
    error: sendResult.ok ? 'none' : sanitizeError(sendResult.error),
  })

  if (!sendResult.ok) {
    await supabaseServer
      .from('ig_automation_runs')
      .update({
        completed: true,
        last_error: sendResult.error,
        public_reply_variation_index: publicReplyVariationIndex,
        public_reply_error: publicReplyError,
        updated_at: new Date().toISOString(),
      })
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
    .update({
      ...update,
      public_reply_variation_index: publicReplyVariationIndex,
      public_reply_error: publicReplyError,
      updated_at: new Date().toISOString(),
    })
    .eq('id', run.id)
}
