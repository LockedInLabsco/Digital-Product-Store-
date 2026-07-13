import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { getSignedDownloadUrl, verifyProductFileExists } from '@/src/lib/supabase/downloads'
import { sendDownloadEmail } from '@/src/lib/email/resend'
import {
  verifyPaddleWebhookSignature,
  getPaddleCustomerEmail,
  getPaddleCustomerEmailFromApi,
  getPaddleCustomerId,
  getPaddlePriceId,
  getPaddleCustomData,
  getPaddleWebhookSecretDebugInfo,
  logPaddleEvent,
} from '@/src/lib/paddle'

export const runtime = 'nodejs'

const EMAIL_SIGNED_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour

async function findProductForTransaction(priceId: string | null, customData: Record<string, any>) {
  const selectFields = 'id, title, slug, price, is_active, file_path, paddle_price_id'

  if (priceId) {
    console.log('[Paddle Webhook] Looking up Supabase product by paddle_price_id', {
      priceId,
    })

    const { data, error } = await supabaseServer
      .from('products')
      .select(selectFields)
      .eq('paddle_price_id', priceId)
      .eq('is_active', true)
      .gt('price', 0)
      .maybeSingle()

    if (error) {
      console.error('[Paddle Webhook] Product lookup by price ID failed', error)
    }

    if (data) {
      return { product: data, lookupMethod: 'paddle_price_id' }
    }
  }

  if (customData?.product_id) {
    console.log('[Paddle Webhook] Looking up Supabase product by custom_data.product_id', {
      productId: customData.product_id,
    })

    const { data, error } = await supabaseServer
      .from('products')
      .select(selectFields)
      .eq('id', customData.product_id)
      .eq('is_active', true)
      .gt('price', 0)
      .maybeSingle()

    if (error) {
      console.error('[Paddle Webhook] Product lookup by custom_data.product_id failed', error)
    }

    if (data) {
      return { product: data, lookupMethod: 'custom_data.product_id' }
    }
  }

  if (customData?.product_slug) {
    console.log('[Paddle Webhook] Looking up Supabase product by custom_data.product_slug', {
      productSlug: customData.product_slug,
    })

    const { data, error } = await supabaseServer
      .from('products')
      .select(selectFields)
      .eq('slug', customData.product_slug)
      .eq('is_active', true)
      .gt('price', 0)
      .maybeSingle()

    if (error) {
      console.error('[Paddle Webhook] Product lookup by custom_data.product_slug failed', error)
    }

    if (data) {
      return { product: data, lookupMethod: 'custom_data.product_slug' }
    }
  }

  return { product: null, lookupMethod: null }
}

export async function POST(request: NextRequest) {
  console.log('\n[Paddle Webhook] Paddle webhook received')

  try {
    const rawBody = await request.text()
    const signature =
      request.headers.get('Paddle-Signature') ||
      request.headers.get('paddle-signature') ||
      ''
    const webhookSecretDebugInfo = getPaddleWebhookSecretDebugInfo()

    console.log('[Paddle Webhook] PADDLE_WEBHOOK_SECRET exists:', webhookSecretDebugInfo.exists)
    console.log('[Paddle Webhook] PADDLE_WEBHOOK_SECRET debug:', webhookSecretDebugInfo)
    console.log('[Paddle Webhook] Paddle signature header exists:', Boolean(signature))
    console.log('[Paddle Webhook] Raw body length:', rawBody.length)

    if (!verifyPaddleWebhookSignature(rawBody, signature)) {
      console.error('[Paddle Webhook] Webhook verification failed')
      console.log('[Paddle Webhook] ===== END WEBHOOK: INVALID SIGNATURE =====\n')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('[Paddle Webhook] Webhook verification success')

    const event = JSON.parse(rawBody)
    const eventType = event?.event_type
    const transaction = event?.data

    console.log('[Paddle Webhook] Parsed event', {
      eventId: event?.event_id || event?.id || 'unknown',
      eventType,
      hasTransactionData: Boolean(transaction),
    })

    if (!eventType || !transaction) {
      console.error('[Paddle Webhook] Missing event_type or transaction data')
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    logPaddleEvent(eventType, transaction)

    if (eventType !== 'transaction.completed') {
      console.log('[Paddle Webhook] Ignoring non-delivery event type', { eventType })
      console.log('[Paddle Webhook] ===== END WEBHOOK: IGNORED =====\n')
      return NextResponse.json({ success: true })
    }

    console.log('[Paddle Webhook] Processing transaction.completed')

    let customerEmail = getPaddleCustomerEmail(transaction)
    const customerId = getPaddleCustomerId(transaction)

    console.log('[Paddle Webhook] Customer email extraction result', {
      customerEmail: customerEmail || 'not found',
      customerId: customerId || 'unknown',
    })

    if (!customerEmail && customerId) {
      customerEmail = await getPaddleCustomerEmailFromApi(customerId)
      console.log('[Paddle Webhook] Customer email Paddle API fallback result', {
        customerId,
        customerEmail: customerEmail || 'not found',
      })
    }

    if (!customerEmail) {
      console.error('[Paddle Webhook] Customer email not found in transaction payload')
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 })
    }

    const priceId = getPaddlePriceId(transaction)
    const customData = getPaddleCustomData(transaction)

    console.log('[Paddle Webhook] Product identifiers extracted', {
      priceId: priceId || 'not found',
      customData,
    })

    const { product, lookupMethod } = await findProductForTransaction(priceId, customData)

    if (!product) {
      console.error('[Paddle Webhook] No matching Supabase product found', {
        priceId,
        customData,
      })
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    console.log('[Paddle Webhook] Matching Supabase product found', {
      lookupMethod,
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      isActive: product.is_active,
      paddlePriceId: product.paddle_price_id,
      filePath: product.file_path,
    })

    if (!product.file_path) {
      console.error('[Paddle Webhook] Product file_path is missing', {
        productId: product.id,
        productTitle: product.title,
      })
      return NextResponse.json({ error: 'Product file not configured' }, { status: 400 })
    }

    const fileExists = await verifyProductFileExists(product.file_path)
    console.log('[Paddle Webhook] Product file existence check complete', {
      filePath: product.file_path,
      fileExists,
    })

    if (!fileExists) {
      return NextResponse.json({ error: 'Product file not found' }, { status: 500 })
    }

    const signedUrl = await getSignedDownloadUrl(
      product.file_path,
      EMAIL_SIGNED_URL_EXPIRY_SECONDS
    )

    console.log('[Paddle Webhook] Signed URL generation result', {
      signedUrlCreated: Boolean(signedUrl),
      filePath: product.file_path,
      expirySeconds: EMAIL_SIGNED_URL_EXPIRY_SECONDS,
    })

    if (!signedUrl) {
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    console.log('[Paddle Webhook] Sending download email with Resend', {
      to: customerEmail,
      productTitle: product.title,
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      fromEmail: process.env.FROM_EMAIL || 'not configured',
    })

    const emailResult = await sendDownloadEmail({
      email: customerEmail,
      productTitle: product.title,
      downloadUrl: signedUrl,
    })

    console.log('[Paddle Webhook] Resend delivery result', emailResult)

    if (!emailResult.success) {
      console.error('[Paddle Webhook] Resend email send failed', {
        error: emailResult.error,
        to: customerEmail,
      })
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    console.log('[Paddle Webhook] Paid product delivery completed successfully')
    console.log('[Paddle Webhook] ===== END WEBHOOK: SUCCESS =====\n')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Paddle Webhook] Unhandled exception', error)
    console.log('[Paddle Webhook] ===== END WEBHOOK: ERROR =====\n')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
