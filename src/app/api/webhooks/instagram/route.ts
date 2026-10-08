import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/src/lib/instagram/webhookVerify'
import { processTrigger } from '@/src/lib/instagram/processTrigger'
import { resolveConnectedAccountFromWebhookEntryId, type ResolvedWebhookAccount } from '@/src/lib/instagram/accountResolution'
import { maskId, previewText, webhookDebug } from '@/src/lib/instagram/webhookDebug'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'
import type { IgTriggerType } from '@/src/types/instagramAutomation'

interface CommentValue {
  id: string
  text?: string
  from?: { id: string }
  // ID and product type of the IG Media the comment was created on — per
  // Meta's Instagram webhooks reference (graph-api/webhooks/reference/
  // instagram), the media id lives at value.media.id, not a top-level
  // value.media_id.
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

// GET — Meta's one-time webhook verification handshake: echo back
// hub.challenge if hub.verify_token matches what's configured in the
// Meta app. Runs once, when the webhook URL is first registered (or
// re-registered).
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// POST — every comment/message/story-reply event on the connected
// account. Verifies Meta's signature before touching the body (so a
// forged request can never trigger an automated DM), then fans each
// event out to processTrigger(). Always responds 200 once the signature
// is valid — even if no rule matched anything — since a non-200 makes
// Meta retry the same event, and de-duping is handled downstream anyway
// by processTrigger's unique constraint, not by the HTTP status here.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  const appSecret = process.env.INSTAGRAM_APP_SECRET || ''

  if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
    console.error('[Instagram Webhook] Invalid signature — rejecting request')
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const entries: any[] = payload.entry || []

  for (const entry of entries) {
    // Temporary diagnostic — tells us which container the event actually
    // arrived in (changes[] vs messaging[]) and which fields Meta sent,
    // which is the one thing the webhook's 200 response can't tell us.
    webhookDebug('entry', {
      object: payload.object,
      entryKeys: Object.keys(entry || {}),
      changeFields: (entry.changes || []).map((c: any) => c?.field),
      messagingCount: (entry.messaging || []).length,
    })
    logConnectStage('instagram_webhook_received', {
      entryId: entry?.id ?? null,
      changeFields: (entry.changes || []).map((c: any) => c?.field),
      messagingCount: (entry.messaging || []).length,
    })

    // Multi-account/multi-workspace routing — resolves Meta's entry.id
    // to the ONE connected account this event belongs to, server-side,
    // from the event itself (never the browser/workspace cookie — this
    // is a server-to-server callback with no session at all). An
    // unresolved entry.id means zero automation execution for this
    // entry — never a global/first-account fallback. See
    // src/lib/instagram/accountResolution.ts for the full contract.
    const resolved: ResolvedWebhookAccount | null = await resolveConnectedAccountFromWebhookEntryId(entry?.id)
    if (!resolved) {
      logConnectStage('instagram_webhook_account_unresolved', { entryId: entry?.id ?? null })
      continue
    }
    logConnectStage('instagram_webhook_account_resolved', {
      connectedAccountId: resolved.connectedAccountId,
      workspaceId: resolved.workspaceId,
    })

    for (const change of entry.changes || []) {
      if (change.field === 'comments') {
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
        })
      } else if (change.field === 'messages') {
        await handleMessageEnvelope(change.value as MessageEnvelope, 'changes.messages', resolved)
      }
    }

    for (const item of entry.messaging || []) {
      await handleMessageEnvelope(item as MessageEnvelope, 'messaging', resolved)
    }
  }

  return NextResponse.json({ received: true })
}

async function handleMessageEnvelope(envelope: MessageEnvelope, source: string, account: ResolvedWebhookAccount): Promise<void> {
  const message = envelope.message
  const senderId = envelope.sender?.id

  // Temporary diagnostic — shows whether this envelope actually has the
  // shape the parser above expects (sender.id + message.mid/text), which
  // is what decides whether a DM ever reaches processTrigger at all.
  webhookDebug('envelope', {
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
    webhookDebug('skipped', {
      source,
      reason: !message?.mid ? 'no-message-mid' : !senderId ? 'no-sender-id' : 'is-echo',
    })
    return
  }

  const isStoryReply = Boolean(message.reply_to?.story)
  const triggerType: IgTriggerType = isStoryReply ? 'story_reply' : 'dm_keyword'

  webhookDebug('dispatch', { source, triggerType, isStoryReply, sender: maskId(senderId) })
  logConnectStage('instagram_dm_received', {
    connectedAccountId: account.connectedAccountId,
    messageId: message.mid,
    triggerType,
    isStoryReply,
  })

  const event = {
    triggerType,
    sourceType: isStoryReply ? ('story_reply' as const) : ('dm' as const),
    sourceId: message.mid,
    recipientIgId: senderId,
    text: message.text ?? null,
    connectedAccountId: account.connectedAccountId,
  }
  logConnectStage('instagram_dm_trigger_created', { connectedAccountId: account.connectedAccountId, messageId: message.mid, triggerType })

  await processTrigger(event)
}
