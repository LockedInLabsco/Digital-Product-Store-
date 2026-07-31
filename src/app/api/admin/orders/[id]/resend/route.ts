import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/src/lib/admin/auth'
import { supabaseServer } from '@/src/lib/supabase/server'
import { getSignedDownloadUrl, verifyProductFileExists } from '@/src/lib/supabase/downloads'
import { sendDownloadEmail } from '@/src/lib/email/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_SIGNED_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour

async function updateOrderDelivery(
  orderId: string,
  deliveryStatus: 'sent' | 'failed',
  downloadUrlSent: boolean,
  errorMessage: string | null
) {
  const { error } = await supabaseServer
    .from('orders')
    .update({
      delivery_status: deliveryStatus,
      download_url_sent: downloadUrlSent,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    console.error('[POST /api/admin/orders/[id]/resend] Order update failed:', error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id
  console.log('[POST /api/admin/orders/[id]/resend] Resending order email', {
    orderId,
  })

  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[POST /api/admin/orders/[id]/resend] Order not found:', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    let productQuery = supabaseServer
      .from('products')
      .select('id, title, slug, file_path')

    productQuery = order.product_id
      ? productQuery.eq('id', order.product_id)
      : productQuery.eq('slug', order.product_slug)

    const { data: product, error: productError } = await productQuery.maybeSingle()

    if (productError || !product) {
      const message = 'Product not found for order'
      console.error('[POST /api/admin/orders/[id]/resend] Product lookup failed:', {
        productError,
        productId: order.product_id,
        productSlug: order.product_slug,
      })
      await updateOrderDelivery(orderId, 'failed', false, message)
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (!product.file_path) {
      const message = 'Product file_path is missing'
      await updateOrderDelivery(orderId, 'failed', false, message)
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const fileExists = await verifyProductFileExists(product.file_path)

    if (!fileExists) {
      const message = 'Product file not found in Supabase storage'
      await updateOrderDelivery(orderId, 'failed', false, message)
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const signedUrl = await getSignedDownloadUrl(
      product.file_path,
      EMAIL_SIGNED_URL_EXPIRY_SECONDS
    )

    if (!signedUrl) {
      const message = 'Failed to generate download link'
      await updateOrderDelivery(orderId, 'failed', false, message)
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const emailResult = await sendDownloadEmail({
      email: order.customer_email,
      productTitle: product.title || order.product_title,
      downloadUrl: signedUrl,
      isFree: false,
    })

    if (!emailResult.success) {
      await updateOrderDelivery(
        orderId,
        'failed',
        false,
        emailResult.error || 'Email send failed'
      )
      return NextResponse.json(
        { error: emailResult.error || 'Email send failed' },
        { status: 500 }
      )
    }

    await updateOrderDelivery(orderId, 'sent', true, null)

    console.log('[POST /api/admin/orders/[id]/resend] Email resent successfully', {
      orderId,
      customerEmail: order.customer_email,
      productTitle: product.title || order.product_title,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/admin/orders/[id]/resend] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
