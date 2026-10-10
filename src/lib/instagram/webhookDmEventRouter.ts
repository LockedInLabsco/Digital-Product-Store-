/**
 * Shared entry/changes/messaging event-loop logic for the N4N DM
 * Automations webhook route (src/app/api/webhooks/instagram/dm/route.ts).
 *
 * This is a DELIBERATE, near-identical copy of the thin event-loop
 * (~60 lines) inlined in src/app/api/webhooks/instagram/route.ts's own
 * POST handler — NOT an extraction that also modifies that existing,
 * working route. Per the repository audit (§10/§23): the real
 * reusable logic (signature verification, account resolution, rule
 * matching, dedupe, sending) already lives in standalone shared
 * modules — verifyWebhookSignature/verifyInstagramWebhookSignature,
 * resolveConnectedAccountFromWebhookEntryId, processTrigger — and this
 * file imports and reuses ALL of those directly, unchanged. The only
 * genuinely route-local code (parsing Meta's entry/changes/messaging
 * shape into a TriggerEvent) is isolated HERE instead of being
 * duplicated inline a second time inside the new route file, so it has
 * exactly one place to be read/maintained going forward — but the
 * existing /api/webhooks/instagram route.ts is intentionally left
 * exactly as it was, not refactored to call this. The one behavioral
 * difference from that route's inline logic: every TriggerEvent built
 * here carries `provider: 'instagram_dm'` explicitly, so
 * processTrigger's eventual send uses the N4N DM Automations app's own
 * stored token (social_account_tokens, provider='instagram_dm') — see
 * processTrigger.ts's TriggerEvent.provider doc comment — and fails
 * cleanly, never silently falling back to the existing instagram_login
 * token, if that token is missing or broken.
 */
import { processTrigger } from './processTrigger'
import { resolveConnectedAccountFromWebhookEntryId, type ResolvedWebhookAccount } from './accountResolution'
import { maskId, previewText, webhookDebug } from './webhookDebug'
import { logConnectStage } from './connectDiagnostics'
import type { IgTriggerType } from '@/src/types/instagramAutomation'

interface CommentValue {
  id: string
  text?: string
  from?: { id: string }
  media?: { id: string }
}

interface MessageEnvelope {
  sender?: { id: string }
  message?: {
    mid: string
    text?: string
    is_echo?: boolean
    reply_to?: { story?: unknown }
  }
}

/**
 * Processes Meta's `payload.entry` array for the DM app's webhook —
 * same shape/semantics as the existing route's inline loop (comments →
 * comment_keyword, messaging[]/changes[field='messages'] → dm_keyword or
 * story_reply, is_echo filtered, unresolved entry.id skipped entirely,
 * never a global/first-account fallback), except every resulting
 * TriggerEvent is tagged `provider: 'instagram_dm'`.
 */
export async function processInstagramDmWebhookEntries(entries: any[], payloadObject: unknown): Promise<void> {
  for (const entry of entries) {
    webhookDebug('dm_entry', {
      object: payloadObject,
      entryKeys: Object.keys(entry || {}),
      changeFields: (entry.changes || []).map((c: any) => c?.field),
      messagingCount: (entry.messaging || []).length,
    })
    logConnectStage('instagram_dm_webhook_received', {
      entryId: entry?.id ?? null,
      changeFields: (entry.changes || []).map((c: any) => c?.field),
      messagingCount: (entry.messaging || []).length,
    })

    const resolved: ResolvedWebhookAccount | null = await resolveConnectedAccountFromWebhookEntryId(entry?.id)
    if (!resolved) {
      logConnectStage('instagram_dm_webhook_account_unresolved', { entryId: entry?.id ?? null })
      continue
    }
    logConnectStage('instagram_dm_webhook_account_resolved', {
      connectedAccountId: resolved.connectedAccountId,
      workspaceId: resolved.workspaceId,
    })

    for (const change of entry.changes || []) {
      if (change.field === 'comments') {
        logConnectStage('instagram_dm_webhook_event_type', { type: 'comment' })
        const value = change.value as CommentValue
        if (!value?.id || !value.from?.id) continue
        await processTrigger({
          triggerType: 'comment_keyword',
          sourceType: 'comment',
          sourceId: value.id,
          recipientIgId: value.from.id,
          text: value.text ?? null,
          mediaId: value.media?.id ?? null,
          connectedAccountId: resolved.connectedAccountId,
          provider: 'instagram_dm',
        })
      } else if (change.field === 'messages') {
        logConnectStage('instagram_dm_webhook_event_type', { type: 'message' })
        await handleDmMessageEnvelope(change.value as MessageEnvelope, 'changes.messages', resolved)
      }
    }

    for (const item of entry.messaging || []) {
      logConnectStage('instagram_dm_webhook_event_type', { type: 'message' })
      await handleDmMessageEnvelope(item as MessageEnvelope, 'messaging', resolved)
    }
  }
}

async function handleDmMessageEnvelope(envelope: MessageEnvelope, source: string, account: ResolvedWebhookAccount): Promise<void> {
  const message = envelope.message
  const senderId = envelope.sender?.id

  webhookDebug('dm_envelope', {
    source,
    envelopeKeys: Object.keys(envelope || {}),
    messageKeys: message ? Object.keys(message) : [],
    hasSender: Boolean(senderId),
    hasMid: Boolean(message?.mid),
    isEcho: Boolean(message?.is_echo),
    hasText: typeof message?.text === 'string',
    textPreview: previewText(message?.text),
    sender: maskId(senderId),
  })

  // is_echo means this is our own outgoing message being echoed back —
  // must be skipped, or an automated reply could trigger itself in a loop.
  if (!message?.mid || !senderId || message.is_echo) {
    webhookDebug('dm_skipped', {
      source,
      reason: !message?.mid ? 'no-message-mid' : !senderId ? 'no-sender-id' : 'is-echo',
    })
    return
  }

  const isStoryReply = Boolean(message.reply_to?.story)
  const triggerType: IgTriggerType = isStoryReply ? 'story_reply' : 'dm_keyword'

  webhookDebug('dm_dispatch', { source, triggerType, isStoryReply, sender: maskId(senderId) })
  logConnectStage('instagram_dm_webhook_dm_received', {
    connectedAccountId: account.connectedAccountId,
    messageId: message.mid,
    triggerType,
    isStoryReply,
  })

  await processTrigger({
    triggerType,
    sourceType: isStoryReply ? ('story_reply' as const) : ('dm' as const),
    sourceId: message.mid,
    recipientIgId: senderId,
    text: message.text ?? null,
    connectedAccountId: account.connectedAccountId,
    provider: 'instagram_dm',
  })
}
