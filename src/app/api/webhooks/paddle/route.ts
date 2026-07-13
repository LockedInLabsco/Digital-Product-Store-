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
  getPaddleTransactionAmount,
  getPaddleTransactionCurrency,
  getPaddleTransactionId,
  getPaddleTransactionStatus,
  getPaddleCustomData,
  getPaddleWebhookSecretDebugInfo,
  logPaddleEvent,
} from '@/src/lib/paddle'

export const runtime = 'nodejs'

const EMAIL_SIGNED_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour

interface OrderRecordInput {
  product: any
  customerEmail: string
  transactionId: string
  customerId: string | null
  priceId: string | null
  amount: string | null
  currency: string | null
  status: string
  deliveryStatus: 'pending' | 'sent' | 'failed'
  downloadUrlSent: boolean
  errorMessage?: string | null
}

async function getExistingOrder(transactionId: string) {
  const { data, error } = await supabaseServer
    .from('orders')
    .select('*')
    .eq('paddle_transaction_id', transactionId)
    .maybeSingle()

  if (error) {
    console.error('[Paddle Webhook] Existing order lookup failed', error)
  }

  return data || null
}

async function saveOrderRecord({
  product,
  customerEmail,
  transactionId,
  customerId,
  priceId,
  amount,
  currency,
  status,
  deliveryStatus,
  downloadUrlSent,
  errorMessage = null,
}: OrderRecordInput) {
  const orderPayload = {
    product_id: product?.id || null,
    product_title: product?.title || 'Unknown product',
    product_slug: product?.slug || '',
    customer_email: customerEmail,
    paddle_transaction_id: transactionId,
    paddle_customer_id: customerId,
    paddle_price_id: priceId,
    amount,
    currency,
    status,
    delivery_status: deliveryStatus,
    download_url_sent: downloadUrlSent,
    error_message: errorMessage,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseServer
    .from('orders')
    .upsert(orderPayload, { onConflict: 'paddle_transaction_id' })
    .select()
    .single()

  if (error) {
    console.error('[Paddle Webhook] Order save failed', error)
    return { order: null, error }
  }

  console.log('[Paddle Webhook] Order saved', {
    orderId: data?.id,
    transactionId,
    deliveryStatus,
    downloadUrlSent,
  })

  return { order: data, error: null }
}

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

    const transactionId = getPaddleTransactionId(transaction)
    const priceId = getPaddlePriceId(transaction)
    const amount = getPaddleTransactionAmount(transaction)
    const currency = getPaddleTransactionCurrency(transaction)
    const transactionStatus = getPaddleTransactionStatus(transaction)

    console.log('[Paddle Webhook] Transaction identifiers extracted', {
      transactionId: transactionId || 'not found',
      priceId: priceId || 'not found',
      amount: amount || 'not found',
      currency: currency || 'not found',
      transactionStatus,
    })

    if (!transactionId) {
      console.error('[Paddle Webhook] Paddle transaction ID not found')
      return NextResponse.json({ error: 'Transaction ID not found' }, { status: 400 })
    }

    const existingOrder = await getExistingOrder(transactionId)

    if (existingOrder?.delivery_status === 'sent' && existingOrder.download_url_sent) {
      console.log('[Paddle Webhook] Duplicate completed transaction already delivered', {
        orderId: existingOrder.id,
        transactionId,
      })
      console.log('[Paddle Webhook] ===== END WEBHOOK: DUPLICATE SUCCESS =====\n')
      return NextResponse.json({ success: true, duplicate: true })
    }

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
      await saveOrderRecord({
        product: {
          id: customData?.product_id || null,
          title: customData?.product_title || 'Unknown product',
          slug: customData?.product_slug || '',
        },
        customerEmail,
        transactionId,
        customerId,
        priceId,
        amount,
        currency,
        status: transactionStatus,
        deliveryStatus: 'failed',
        downloadUrlSent: false,
        errorMessage: 'Product not found for Paddle transaction',
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
      await saveOrderRecord({
        product,
        customerEmail,
        transactionId,
        customerId,
        priceId,
        amount,
        currency,
        status: transactionStatus,
        deliveryStatus: 'failed',
        downloadUrlSent: false,
        errorMessage: 'Product file_path is missing',
      })
      return NextResponse.json({ error: 'Product file not configured' }, { status: 400 })
    }

    const fileExists = await verifyProductFileExists(product.file_path)
    console.log('[Paddle Webhook] Product file existence check complete', {
      filePath: product.file_path,
      fileExists,
    })

    if (!fileExists) {
      await saveOrderRecord({
        product,
        customerEmail,
        transactionId,
        customerId,
        priceId,
        amount,
        currency,
        status: transactionStatus,
        deliveryStatus: 'failed',
        downloadUrlSent: false,
        errorMessage: 'Product file not found in Supabase storage',
      })
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
      await saveOrderRecord({
        product,
        customerEmail,
        transactionId,
        customerId,
        priceId,
        amount,
        currency,
        status: transactionStatus,
        deliveryStatus: 'failed',
        downloadUrlSent: false,
        errorMessage: 'Failed to generate signed download URL',
      })
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
      await saveOrderRecord({
        product,
        customerEmail,
        transactionId,
        customerId,
        priceId,
        amount,
        currency,
        status: transactionStatus,
        deliveryStatus: 'failed',
        downloadUrlSent: false,
        errorMessage: emailResult.error || 'Email send failed',
      })
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
    }

    await saveOrderRecord({
      product,
      customerEmail,
      transactionId,
      customerId,
      priceId,
      amount,
      currency,
      status: transactionStatus,
      deliveryStatus: 'sent',
      downloadUrlSent: true,
      errorMessage: null,
    })

    console.log('[Paddle Webhook] Paid product delivery completed successfully')
    console.log('[Paddle Webhook] ===== END WEBHOOK: SUCCESS =====\n')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Paddle Webhook] Unhandled exception', error)
    console.log('[Paddle Webhook] ===== END WEBHOOK: ERROR =====\n')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
