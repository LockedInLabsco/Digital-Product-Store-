import { NextRequest, NextResponse } from 'next/server'
import { parseAnalyticsRequest } from '@/src/lib/analytics/adminAnalyticsRequest'
import { percentChange } from '@/src/lib/analytics/dateRange'
import {
  isPostHogServerConfigured,
  getVisitorSummary,
  getFunnelEntryCounts,
  getVisitorsTimeSeries,
} from '@/src/lib/analytics/posthogServer'
import {
  getBusinessSummary,
  getConfirmedFunnelStages,
  getRevenueByDay,
  getFreeDownloadsByDay,
} from '@/src/lib/analytics/businessAnalytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const parsed = parseAnalyticsRequest(request)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  try {
    const { from, to, previousFrom, previousTo } = parsed.range
    const fromIso = from.toISOString()
    const toIso = to.toISOString()
    const postHogConfigured = isPostHogServerConfigured()

    const [
      businessSummary,
      previousBusinessSummary,
      confirmedFunnel,
      revenueByDay,
      downloadsByDay,
      visitorSummaryResult,
      previousVisitorSummaryResult,
      funnelEntryResult,
      timeSeriesResult,
    ] = await Promise.all([
      getBusinessSummary(from, to),
      getBusinessSummary(previousFrom, previousTo),
      getConfirmedFunnelStages(from, to),
      getRevenueByDay(from, to),
      getFreeDownloadsByDay(from, to),
      postHogConfigured ? getVisitorSummary(fromIso, toIso) : Promise.resolve(null),
      postHogConfigured
        ? getVisitorSummary(previousFrom.toISOString(), previousTo.toISOString())
        : Promise.resolve(null),
      postHogConfigured ? getFunnelEntryCounts(fromIso, toIso) : Promise.resolve(null),
      postHogConfigured ? getVisitorsTimeSeries(fromIso, toIso) : Promise.resolve(null),
    ])

    const visitorSummary = visitorSummaryResult?.ok ? visitorSummaryResult.data : null
    const previousVisitorSummary = previousVisitorSummaryResult?.ok ? previousVisitorSummaryResult.data : null
    const funnelEntry = funnelEntryResult?.ok ? funnelEntryResult.data : null
    const timeSeries = timeSeriesResult?.ok ? timeSeriesResult.data : []

    // Surface the *actual* reason a configured PostHog integration came
    // back empty, instead of collapsing every failure into "not
    // configured" — see postHogFetch() in posthogServer.ts for the
    // detailed server-side log this is drawn from.
    const postHogError =
      postHogConfigured && !visitorSummary && visitorSummaryResult && !visitorSummaryResult.ok
        ? visitorSummaryResult.error
        : undefined

    if (postHogConfigured && postHogError) {
      console.error('[GET /api/admin/analytics/overview] PostHog configured but query failed:', postHogError)
    }

    const totalVisitors = visitorSummary?.uniqueVisitors ?? null
    const overallConversionRate =
      totalVisitors && totalVisitors > 0
        ? Math.round(
            ((businessSummary.freeDownloadsCompleted + businessSummary.paidPurchasesCompleted) /
              totalVisitors) *
              1000
          ) / 10
        : null

    const revenueByDate = new Map(revenueByDay.map((r) => [r.date, r]))
    const downloadsByDate = new Map(downloadsByDay.map((d) => [d.date, d.downloads]))
    const dateKeys = new Set<string>([
      ...timeSeries.map((p) => p.date),
      ...revenueByDay.map((r) => r.date),
      ...downloadsByDay.map((d) => d.date),
    ])

    const mergedTimeSeries = Array.from(dateKeys)
      .sort()
      .map((date) => {
        const visitorPoint = timeSeries.find((p) => p.date === date)
        return {
          date,
          visitors: visitorPoint?.visitors ?? null,
          pageViews: visitorPoint?.pageViews ?? null,
          downloads: downloadsByDate.get(date) ?? 0,
          purchases: revenueByDate.get(date)?.purchases ?? 0,
          revenue: revenueByDate.get(date)?.revenue ?? 0,
        }
      })

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      postHogConfigured,
      postHogAvailable: Boolean(visitorSummary),
      postHogError,
      overview: {
        uniqueVisitors: totalVisitors,
        sessions: visitorSummary?.sessions ?? null,
        pageViews: visitorSummary?.pageViews ?? null,
        productPageViews: funnelEntry?.productViews ?? null,
        freeDownloads: businessSummary.freeDownloadsCompleted,
        paidPurchases: businessSummary.paidPurchasesCompleted,
        grossRevenue: businessSummary.grossRevenue,
        overallConversionRate,
        averageOrderValue: businessSummary.averageOrderValue,
        returningVisitorPercentage: visitorSummary?.returningVisitorPercentage ?? null,
        avgEngagedSessionSeconds: visitorSummary?.avgSessionSeconds ?? null,
        totalKnownCustomers: businessSummary.totalKnownCustomers,
        newCustomers: businessSummary.newCustomers,
      },
      changeVsPreviousPeriod: {
        uniqueVisitors: previousVisitorSummary
          ? percentChange(totalVisitors || 0, previousVisitorSummary.uniqueVisitors)
          : null,
        freeDownloads: percentChange(
          businessSummary.freeDownloadsCompleted,
          previousBusinessSummary.freeDownloadsCompleted
        ),
        paidPurchases: percentChange(
          businessSummary.paidPurchasesCompleted,
          previousBusinessSummary.paidPurchasesCompleted
        ),
        grossRevenue: percentChange(businessSummary.grossRevenue, previousBusinessSummary.grossRevenue),
      },
      funnel: {
        free: [
          { label: 'Visitors', count: totalVisitors },
          { label: 'Product views', count: funnelEntry?.productViews ?? null },
          { label: 'Free download started', count: funnelEntry?.freeDownloadStarts ?? null },
          { label: 'Free download completed', count: confirmedFunnel.freeDownloadsCompleted },
        ],
        paid: [
          { label: 'Visitors', count: totalVisitors },
          { label: 'Product views', count: funnelEntry?.productViews ?? null },
          { label: 'Checkout started', count: funnelEntry?.paidCheckoutStarts ?? null },
          { label: 'Purchase completed', count: confirmedFunnel.paidPurchasesCompleted },
        ],
      },
      timeSeries: mergedTimeSeries,
    })
  } catch (error) {
    console.error('[GET /api/admin/analytics/overview] Exception', error)
    return NextResponse.json({ error: 'Failed to load analytics overview' }, { status: 500 })
  }
}
