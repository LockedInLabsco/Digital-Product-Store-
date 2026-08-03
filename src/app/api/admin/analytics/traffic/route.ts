import { NextRequest, NextResponse } from 'next/server'
import { parseAnalyticsRequest } from '@/src/lib/analytics/adminAnalyticsRequest'
import { isPostHogServerConfigured, getTrafficSources } from '@/src/lib/analytics/posthogServer'
import { getTrafficSourceBusinessData } from '@/src/lib/analytics/businessAnalytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const parsed = parseAnalyticsRequest(request)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  try {
    const { from, to } = parsed.range
    const postHogConfigured = isPostHogServerConfigured()

    const [visitorRowsResult, businessRows] = await Promise.all([
      postHogConfigured ? getTrafficSources(from.toISOString(), to.toISOString()) : Promise.resolve(null),
      getTrafficSourceBusinessData(from, to),
    ])

    const visitorRows = visitorRowsResult?.ok ? visitorRowsResult.data : []
    const businessByKey = new Map(
      businessRows.map((row) => [`${row.source}::${row.medium}::${row.campaign}`, row])
    )

    const keys = new Set<string>([
      ...visitorRows.map((r) => `${r.source}::${r.medium}::${r.campaign}`),
      ...businessRows.map((r) => `${r.source}::${r.medium}::${r.campaign}`),
    ])

    const rows = Array.from(keys).map((key) => {
      const [source, medium, campaign] = key.split('::')
      const visitorRow = visitorRows.find((r) => `${r.source}::${r.medium}::${r.campaign}` === key)
      const businessRow = businessByKey.get(key)
      const visitors = visitorRow?.visitors ?? null
      const downloads = businessRow?.downloads ?? 0
      const purchases = businessRow?.purchases ?? 0

      return {
        source,
        medium,
        campaign,
        visitors,
        downloads,
        purchases,
        revenue: businessRow?.revenue ?? 0,
        downloadConversionRate: visitors && visitors > 0 ? Math.round((downloads / visitors) * 1000) / 10 : null,
        purchaseConversionRate: visitors && visitors > 0 ? Math.round((purchases / visitors) * 1000) / 10 : null,
      }
    })

    rows.sort((a, b) => b.revenue - a.revenue || (b.visitors || 0) - (a.visitors || 0))

    const postHogError =
      postHogConfigured && visitorRowsResult && !visitorRowsResult.ok ? visitorRowsResult.error : undefined
    if (postHogError) {
      console.error('[GET /api/admin/analytics/traffic] PostHog configured but query failed:', postHogError)
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      postHogConfigured,
      postHogAvailable: Boolean(visitorRowsResult?.ok),
      postHogError,
      rows,
    })
  } catch (error) {
    console.error('[GET /api/admin/analytics/traffic] Exception', error)
    return NextResponse.json({ error: 'Failed to load traffic sources' }, { status: 500 })
  }
}
