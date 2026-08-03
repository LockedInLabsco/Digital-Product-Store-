import { NextRequest, NextResponse } from 'next/server'
import { parseAnalyticsRequest } from '@/src/lib/analytics/adminAnalyticsRequest'
import { isPostHogServerConfigured, getProductViewCounts } from '@/src/lib/analytics/posthogServer'
import { getProductBusinessData } from '@/src/lib/analytics/businessAnalytics'
import { supabaseServer } from '@/src/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const parsed = parseAnalyticsRequest(request)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  try {
    const { from, to } = parsed.range
    const postHogConfigured = isPostHogServerConfigured()

    const [businessRows, productViewsResult] = await Promise.all([
      getProductBusinessData(from, to),
      postHogConfigured
        ? getProductViewCounts(from.toISOString(), to.toISOString())
        : Promise.resolve(null),
    ])

    const productViews = productViewsResult?.ok ? productViewsResult.data : new Map<string, number>()

    // PostHog view counts are keyed by product_slug — join in slugs for
    // the products referenced in this period's Supabase business rows.
    const productIds = businessRows.map((row) => row.productId).filter((id): id is string => Boolean(id))
    const { data: products } = productIds.length
      ? await supabaseServer.from('products').select('id, slug').in('id', productIds)
      : { data: [] as { id: string; slug: string }[] }

    const slugById = new Map((products || []).map((p) => [p.id, p.slug]))

    const rows = businessRows.map((row) => {
      const slug = row.productId ? slugById.get(row.productId) : undefined
      const views = slug ? productViews.get(slug) ?? null : null

      return {
        productId: row.productId,
        productTitle: row.productTitle,
        views,
        freeDownloads: row.freeDownloads,
        purchases: row.purchases,
        revenue: row.revenue,
        viewToDownloadRate: views && views > 0 ? Math.round((row.freeDownloads / views) * 1000) / 10 : null,
        viewToPurchaseRate: views && views > 0 ? Math.round((row.purchases / views) * 1000) / 10 : null,
      }
    })

    rows.sort((a, b) => b.revenue - a.revenue || b.purchases - a.purchases)

    const postHogError =
      postHogConfigured && productViewsResult && !productViewsResult.ok ? productViewsResult.error : undefined
    if (postHogError) {
      console.error('[GET /api/admin/analytics/products] PostHog configured but query failed:', postHogError)
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      postHogConfigured,
      postHogAvailable: Boolean(productViewsResult?.ok),
      postHogError,
      rows,
    })
  } catch (error) {
    console.error('[GET /api/admin/analytics/products] Exception', error)
    return NextResponse.json({ error: 'Failed to load product performance' }, { status: 500 })
  }
}
