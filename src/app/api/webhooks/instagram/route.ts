import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/src/lib/instagram/webhookVerify'
import { processTrigger } from '@/src/lib/instagram/processTrigger'

interface CommentValue {
  id: string
  text?: string
  from?: { id: string }
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
        })
      } else if (change.field === 'messages') {
        await handleMessageEnvelope(change.value as MessageEnvelope)
      }
    }

    for (const item of entry.messaging || []) {
      await handleMessageEnvelope(item as MessageEnvelope)
    }
  }

  return NextResponse.json({ received: true })
}

async function handleMessageEnvelope(envelope: MessageEnvelope): Promise<void> {
  const message = envelope.message
  const senderId = envelope.sender?.id
  // is_echo means this is our own outgoing message being echoed back —
  // must be skipped, or an automated reply could trigger itself in a loop.
  if (!message?.mid || !senderId || message.is_echo) return

  const isStoryReply = Boolean(message.reply_to?.story)

  await processTrigger({
    triggerType: isStoryReply ? 'story_reply' : 'dm_keyword',
    sourceType: isStoryReply ? 'story_reply' : 'dm',
    sourceId: message.mid,
    recipientIgId: senderId,
    text: message.text ?? null,
  })
}
