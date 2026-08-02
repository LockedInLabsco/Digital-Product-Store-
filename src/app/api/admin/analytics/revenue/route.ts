import { NextRequest, NextResponse } from 'next/server'
import { parseAnalyticsRequest } from '@/src/lib/analytics/adminAnalyticsRequest'
import {
  getBusinessSummary,
  getRevenueByDay,
  getProductBusinessData,
  getTrafficSourceBusinessData,
  getRecentPurchases,
} from '@/src/lib/analytics/businessAnalytics'

export const dynamic = 'force-dynamic'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  const parsed = parseAnalyticsRequest(request)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  const pageParam = Number(parsed.searchParams.get('page') || '1')
  const pageSizeParam = Number(parsed.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE))

  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam >= 1
      ? Math.min(Math.floor(pageSizeParam), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE

  try {
    const { from, to } = parsed.range

    const [summary, revenueByDay, byProduct, bySource, recentPurchases] = await Promise.all([
      getBusinessSummary(from, to),
      getRevenueByDay(from, to),
      getProductBusinessData(from, to),
      getTrafficSourceBusinessData(from, to),
      getRecentPurchases(from, to, page, pageSize),
    ])

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalKnownCustomers: summary.totalKnownCustomers,
        newCustomers: summary.newCustomers,
        totalPaidTransactions: summary.paidPurchasesCompleted,
        grossRevenue: summary.grossRevenue,
        averageOrderValue: summary.averageOrderValue,
      },
      revenueByDay,
      revenueByProduct: byProduct
        .filter((p) => p.revenue > 0)
        .map((p) => ({ productTitle: p.productTitle, revenue: p.revenue, purchases: p.purchases })),
      revenueBySource: bySource
        .filter((s) => s.revenue > 0)
        .map((s) => ({ source: s.source, revenue: s.revenue, purchases: s.purchases })),
      recentPurchases: {
        rows: recentPurchases.rows,
        page,
        pageSize,
        total: recentPurchases.total,
        totalPages: Math.max(1, Math.ceil(recentPurchases.total / pageSize)),
      },
    })
  } catch (error) {
    console.error('[GET /api/admin/analytics/revenue] Exception', error)
    return NextResponse.json({ error: 'Failed to load revenue data' }, { status: 500 })
  }
}
