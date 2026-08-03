'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import DateRangePicker, { RangePreset } from '@/src/components/admin/analytics/DateRangePicker'
import StatCard from '@/src/components/admin/analytics/StatCard'
import MiniChart from '@/src/components/admin/analytics/MiniChart'
import SortableTable, { ColumnDef } from '@/src/components/admin/analytics/SortableTable'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatCurrency(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `$${value.toFixed(2)}`
  }
}

function formatNumber(value: number | null): string {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('en-US').format(value)
}

function formatPercent(value: number | null): string {
  return value === null || value === undefined ? '—' : `${value}%`
}

function formatSeconds(value: number | null): string {
  if (value === null || value === undefined) return '—'
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

interface FetchState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

function useAdminFetch<T>(path: string | null): FetchState<T> & { reload: () => void } {
  const router = useRouter()
  const [state, setState] = useState<FetchState<T>>({ data: null, isLoading: true, error: null })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!path) return
    let cancelled = false

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    fetch(path)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (cancelled) return

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('admin_token')
            router.push('/admin/login')
            return
          }
          setState({ data: null, isLoading: false, error: body.error || 'Failed to load data' })
          return
        }

        setState({ data: body, isLoading: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ data: null, isLoading: false, error: err instanceof Error ? err.message : 'Network error' })
      })

    return () => {
      cancelled = true
    }
  }, [path, reloadToken, router])

  return { ...state, reload: () => setReloadToken((t) => t + 1) }
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [preset, setPreset] = useState<RangePreset>('7d')
  const [customFrom, setCustomFrom] = useState(todayIso())
  const [customTo, setCustomTo] = useState(todayIso())
  const [revenuePage, setRevenuePage] = useState(1)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
      return
    }
    setIsAuthChecked(true)
  }, [router])

  useEffect(() => {
    setRevenuePage(1)
  }, [preset, customFrom, customTo])

  const rangeQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.set('range', preset)
    if (preset === 'custom') {
      if (!customFrom || !customTo) return null
      params.set('from', customFrom)
      params.set('to', customTo)
    }
    return params.toString()
  }, [preset, customFrom, customTo])

  const withTick = useCallback(
    (base: string | null) => (base && isAuthChecked ? `${base}&_t=${refreshTick}` : null),
    [isAuthChecked, refreshTick]
  )

  const overview = useAdminFetch<any>(withTick(rangeQuery && `/api/admin/analytics/overview?${rangeQuery}`))
  const traffic = useAdminFetch<any>(withTick(rangeQuery && `/api/admin/analytics/traffic?${rangeQuery}`))
  const products = useAdminFetch<any>(withTick(rangeQuery && `/api/admin/analytics/products?${rangeQuery}`))
  const revenue = useAdminFetch<any>(
    withTick(rangeQuery && `/api/admin/analytics/revenue?${rangeQuery}&page=${revenuePage}&pageSize=10`)
  )
  const engagement = useAdminFetch<any>(withTick(rangeQuery && `/api/admin/analytics/engagement?${rangeQuery}`))
  const sessionReplays = useAdminFetch<any>(withTick('/api/admin/analytics/session-replays'))

  useEffect(() => {
    if (!overview.isLoading) {
      setLastRefreshed(new Date().toISOString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview.isLoading])

  const handleRefresh = () => {
    setRefreshTick((t) => t + 1)
  }

  if (!isAuthChecked) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  const ov = overview.data?.overview
  const change = overview.data?.changeVsPreviousPeriod
  const postHogUnavailable = overview.data && !overview.data.postHogConfigured

  // Distinguishes "genuinely not configured" (env vars missing) from
  // "configured but the query failed" (e.g. the Personal API Key is
  // missing a scope) — both used to collapse into the same misleading
  // "Not configured" label.
  const postHogCardProps =
    overview.data && !overview.data.postHogAvailable
      ? {
          unavailable: true,
          unavailableLabel: overview.data.postHogConfigured ? 'Unavailable' : 'Not configured',
          unavailableReason: overview.data.postHogConfigured
            ? overview.data.postHogError || 'PostHog query failed — check server logs'
            : undefined,
        }
      : { unavailable: false }

  const trafficColumns: ColumnDef<any>[] = [
    { key: 'source', header: 'Source', accessor: (r) => r.source },
    { key: 'medium', header: 'Medium', accessor: (r) => r.medium },
    { key: 'campaign', header: 'Campaign', accessor: (r) => r.campaign },
    {
      key: 'visitors',
      header: 'Visitors',
      accessor: (r) => formatNumber(r.visitors),
      sortValue: (r) => r.visitors ?? -1,
      align: 'right',
    },
    { key: 'downloads', header: 'Downloads', accessor: (r) => r.downloads, sortValue: (r) => r.downloads, align: 'right' },
    { key: 'purchases', header: 'Purchases', accessor: (r) => r.purchases, sortValue: (r) => r.purchases, align: 'right' },
    {
      key: 'revenue',
      header: 'Revenue',
      accessor: (r) => formatCurrency(r.revenue),
      sortValue: (r) => r.revenue,
      align: 'right',
    },
    {
      key: 'downloadConversionRate',
      header: 'Visitor→Download',
      accessor: (r) => formatPercent(r.downloadConversionRate),
      sortValue: (r) => r.downloadConversionRate ?? -1,
      align: 'right',
    },
    {
      key: 'purchaseConversionRate',
      header: 'Visitor→Purchase',
      accessor: (r) => formatPercent(r.purchaseConversionRate),
      sortValue: (r) => r.purchaseConversionRate ?? -1,
      align: 'right',
    },
  ]

  const productColumns: ColumnDef<any>[] = [
    { key: 'productTitle', header: 'Product', accessor: (r) => r.productTitle },
    { key: 'views', header: 'Views', accessor: (r) => formatNumber(r.views), sortValue: (r) => r.views ?? -1, align: 'right' },
    {
      key: 'freeDownloads',
      header: 'Free downloads',
      accessor: (r) => r.freeDownloads,
      sortValue: (r) => r.freeDownloads,
      align: 'right',
    },
    { key: 'purchases', header: 'Purchases', accessor: (r) => r.purchases, sortValue: (r) => r.purchases, align: 'right' },
    {
      key: 'revenue',
      header: 'Revenue',
      accessor: (r) => formatCurrency(r.revenue),
      sortValue: (r) => r.revenue,
      align: 'right',
    },
    {
      key: 'viewToDownloadRate',
      header: 'View→Download',
      accessor: (r) => formatPercent(r.viewToDownloadRate),
      sortValue: (r) => r.viewToDownloadRate ?? -1,
      align: 'right',
    },
    {
      key: 'viewToPurchaseRate',
      header: 'View→Purchase',
      accessor: (r) => formatPercent(r.viewToPurchaseRate),
      sortValue: (r) => r.viewToPurchaseRate ?? -1,
      align: 'right',
    },
  ]

  const recentPurchaseColumns: ColumnDef<any>[] = [
    { key: 'productTitle', header: 'Product', accessor: (r) => r.productTitle },
    { key: 'customerEmail', header: 'Customer', accessor: (r) => r.customerEmail },
    {
      key: 'amount',
      header: 'Amount',
      accessor: (r) => formatCurrency(r.amount, r.currency || 'USD'),
      sortValue: (r) => r.amount,
      align: 'right',
    },
    { key: 'status', header: 'Status', accessor: (r) => r.status },
    { key: 'source', header: 'Source', accessor: (r) => r.source || 'direct' },
    {
      key: 'createdAt',
      header: 'Date',
      accessor: (r) => new Date(r.createdAt).toLocaleString(),
      sortValue: (r) => new Date(r.createdAt).getTime(),
    },
  ]

  const topPagesColumns: ColumnDef<any>[] = [
    { key: 'path', header: 'Page', accessor: (r) => r.path },
    { key: 'views', header: 'Views', accessor: (r) => r.views, sortValue: (r) => r.views, align: 'right' },
    { key: 'visitors', header: 'Visitors', accessor: (r) => r.visitors, sortValue: (r) => r.visitors, align: 'right' },
  ]

  const exitPagesColumns: ColumnDef<any>[] = [
    { key: 'path', header: 'Page', accessor: (r) => r.path },
    { key: 'exits', header: 'Exits', accessor: (r) => r.exits, sortValue: (r) => r.exits, align: 'right' },
  ]

  const ctaColumns: ColumnDef<any>[] = [
    { key: 'location', header: 'Button location', accessor: (r) => r.location },
    { key: 'clicks', header: 'Clicks', accessor: (r) => r.clicks, sortValue: (r) => r.clicks, align: 'right' },
  ]

  const sectionColumns: ColumnDef<any>[] = [
    { key: 'sectionId', header: 'Section', accessor: (r) => r.sectionId },
    { key: 'views', header: 'Views', accessor: (r) => r.views, sortValue: (r) => r.views, align: 'right' },
    {
      key: 'avgEngagedSeconds',
      header: 'Avg. engaged time',
      accessor: (r) => formatSeconds(r.avgEngagedSeconds),
      sortValue: (r) => r.avgEngagedSeconds,
      align: 'right',
    },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <Container className="flex items-center justify-between py-4">
          <div>
            <Link href="/admin" className="text-xs text-gray-500 hover:text-black">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
        </Container>
      </div>

      <Container className="space-y-10 py-10">
        <DateRangePicker
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={setPreset}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          onRefresh={handleRefresh}
          isRefreshing={overview.isLoading}
          lastRefreshed={lastRefreshed}
        />

        {postHogUnavailable && (
          <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            PostHog is not configured. Business metrics from Supabase are shown below; visitor,
            traffic-source, and engagement metrics will appear once{' '}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_POSTHOG_KEY</code>,{' '}
            <code className="rounded bg-amber-100 px-1">POSTHOG_PERSONAL_API_KEY</code>, and{' '}
            <code className="rounded bg-amber-100 px-1">POSTHOG_PROJECT_ID</code> are set. See
            docs/ANALYTICS_SETUP.md.
          </div>
        )}

        {overview.data?.postHogConfigured && !overview.data?.postHogAvailable && (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">PostHog is configured, but the query failed.</p>
            <p className="mt-1">
              {overview.data.postHogError || 'Unknown error — check the server logs for [PostHog] entries.'}
            </p>
            <p className="mt-1 text-red-700">
              This is usually a missing scope on the Personal API Key (most commonly{' '}
              <code className="rounded bg-red-100 px-1">query:read</code>) rather than a missing
              environment variable — see docs/ANALYTICS_SETUP.md.
            </p>
          </div>
        )}

        {/* Overview cards */}
        <section>
          <h2 className="mb-4 text-lg font-bold">Overview</h2>
          {overview.error ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {overview.error}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <StatCard
                label="Unique visitors"
                value={formatNumber(ov?.uniqueVisitors)}
                change={change?.uniqueVisitors}
                {...postHogCardProps}
              />
              <StatCard label="Sessions" value={formatNumber(ov?.sessions)} {...postHogCardProps} />
              <StatCard label="Page views" value={formatNumber(ov?.pageViews)} {...postHogCardProps} />
              <StatCard
                label="Product-page views"
                value={formatNumber(ov?.productPageViews)}
                {...postHogCardProps}
              />
              <StatCard label="Free downloads" value={formatNumber(ov?.freeDownloads)} change={change?.freeDownloads} />
              <StatCard label="Paid purchases" value={formatNumber(ov?.paidPurchases)} change={change?.paidPurchases} />
              <StatCard
                label="Gross revenue"
                value={ov ? formatCurrency(ov.grossRevenue) : '—'}
                change={change?.grossRevenue}
              />
              <StatCard label="Average order value" value={ov ? formatCurrency(ov.averageOrderValue) : '—'} />
              <StatCard
                label="Overall conversion rate"
                value={formatPercent(ov?.overallConversionRate)}
                {...postHogCardProps}
              />
              <StatCard
                label="Returning visitors"
                value={formatPercent(ov?.returningVisitorPercentage)}
                {...postHogCardProps}
              />
              <StatCard
                label="Avg. engaged session time"
                value={formatSeconds(ov?.avgEngagedSessionSeconds)}
                {...postHogCardProps}
              />
              <StatCard label="Known customers" value={formatNumber(ov?.totalKnownCustomers)} />
            </div>
          )}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Visitors over time</h3>
            <MiniChart
              ariaLabel="Unique visitors over time"
              data={(overview.data?.timeSeries || [])
                .filter((p: any) => p.visitors !== null)
                .map((p: any) => ({ label: p.date, value: p.visitors }))}
            />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Revenue over time</h3>
            <MiniChart
              color="#16a34a"
              ariaLabel="Revenue over time"
              formatValue={(v) => formatCurrency(v)}
              data={(overview.data?.timeSeries || []).map((p: any) => ({ label: p.date, value: p.revenue }))}
            />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Downloads over time</h3>
            <MiniChart
              color="#a855f7"
              ariaLabel="Free downloads over time"
              data={(overview.data?.timeSeries || []).map((p: any) => ({ label: p.date, value: p.downloads }))}
            />
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Purchases over time</h3>
            <MiniChart
              color="#f59e0b"
              ariaLabel="Purchases over time"
              data={(overview.data?.timeSeries || []).map((p: any) => ({ label: p.date, value: p.purchases }))}
            />
          </div>
        </section>

        {/* Funnels */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FunnelCard title="Free download funnel" stages={overview.data?.funnel?.free} />
          <FunnelCard title="Paid purchase funnel" stages={overview.data?.funnel?.paid} />
        </section>

        {/* Traffic sources */}
        <section>
          <h2 className="mb-4 text-lg font-bold">Traffic sources</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <SortableTable
              columns={trafficColumns}
              rows={traffic.data?.rows || []}
              rowKey={(r) => `${r.source}-${r.medium}-${r.campaign}`}
              isLoading={traffic.isLoading}
              error={traffic.error || (traffic.data?.postHogConfigured ? traffic.data.postHogError : null)}
              defaultSortKey="revenue"
              emptyMessage={
                traffic.data && !traffic.data.postHogConfigured
                  ? 'Analytics not configured'
                  : 'No data for this period'
              }
            />
          </div>
        </section>

        {/* Product performance */}
        <section>
          <h2 className="mb-4 text-lg font-bold">Product performance</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <SortableTable
              columns={productColumns}
              rows={products.data?.rows || []}
              rowKey={(r) => r.productId || r.productTitle}
              isLoading={products.isLoading}
              error={products.error || (products.data?.postHogConfigured ? products.data.postHogError : null)}
              defaultSortKey="revenue"
              emptyMessage={
                products.data && !products.data.postHogConfigured
                  ? 'Analytics not configured'
                  : 'No data for this period'
              }
            />
          </div>
        </section>

        {/* Customer & revenue */}
        <section>
          <h2 className="mb-4 text-lg font-bold">Customers & revenue</h2>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Known customers" value={formatNumber(revenue.data?.summary?.totalKnownCustomers)} />
            <StatCard label="New customers" value={formatNumber(revenue.data?.summary?.newCustomers)} />
            <StatCard label="Paid transactions" value={formatNumber(revenue.data?.summary?.totalPaidTransactions)} />
            <StatCard
              label="Gross revenue"
              value={revenue.data ? formatCurrency(revenue.data.summary.grossRevenue) : '—'}
            />
          </div>

          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Recent purchases</h3>
            <SortableTable
              columns={recentPurchaseColumns}
              rows={revenue.data?.recentPurchases?.rows || []}
              rowKey={(r) => r.id}
              isLoading={revenue.isLoading}
              error={revenue.error}
              defaultSortKey="createdAt"
              emptyMessage="No purchases in this period"
            />
            {revenue.data?.recentPurchases && revenue.data.recentPurchases.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  disabled={revenuePage <= 1}
                  onClick={() => setRevenuePage((p) => Math.max(1, p - 1))}
                  className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-gray-500">
                  Page {revenue.data.recentPurchases.page} of {revenue.data.recentPurchases.totalPages}
                </span>
                <button
                  type="button"
                  disabled={revenuePage >= revenue.data.recentPurchases.totalPages}
                  onClick={() => setRevenuePage((p) => p + 1)}
                  className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Site engagement */}
        <section>
          <h2 className="mb-4 text-lg font-bold">Site engagement</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Most-viewed pages</h3>
              <SortableTable
                columns={topPagesColumns}
                rows={engagement.data?.topPages || []}
                rowKey={(r) => r.path}
                isLoading={engagement.isLoading}
                error={engagement.error || (engagement.data?.postHogConfigured ? engagement.data.postHogError : null)}
                defaultSortKey="views"
                emptyMessage={
                  engagement.data && !engagement.data.postHogConfigured
                    ? 'Analytics not configured'
                    : 'No data for this period'
                }
              />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Exit pages</h3>
              <SortableTable
                columns={exitPagesColumns}
                rows={engagement.data?.exitPages || []}
                rowKey={(r) => r.path}
                isLoading={engagement.isLoading}
                error={engagement.error || (engagement.data?.postHogConfigured ? engagement.data.postHogError : null)}
                defaultSortKey="exits"
                emptyMessage={
                  engagement.data && !engagement.data.postHogConfigured
                    ? 'Analytics not configured'
                    : 'No data for this period'
                }
              />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Most-clicked CTAs</h3>
              <SortableTable
                columns={ctaColumns}
                rows={engagement.data?.topCtaClicks || []}
                rowKey={(r) => r.location}
                isLoading={engagement.isLoading}
                error={engagement.error || (engagement.data?.postHogConfigured ? engagement.data.postHogError : null)}
                defaultSortKey="clicks"
                emptyMessage={
                  engagement.data && !engagement.data.postHogConfigured
                    ? 'Analytics not configured'
                    : 'No data for this period'
                }
              />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Homepage section engagement</h3>
              <SortableTable
                columns={sectionColumns}
                rows={engagement.data?.sectionEngagement || []}
                rowKey={(r) => r.sectionId}
                isLoading={engagement.isLoading}
                error={engagement.error || (engagement.data?.postHogConfigured ? engagement.data.postHogError : null)}
                defaultSortKey="views"
                emptyMessage={
                  engagement.data && !engagement.data.postHogConfigured
                    ? 'Analytics not configured'
                    : 'No data for this period'
                }
              />
            </div>
          </div>
        </section>

        {/* Session replays */}
        <section>
          <h2 className="mb-4 text-lg font-bold">Session replays</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            {!sessionReplays.data?.postHogConfigured ? (
              <p className="text-sm text-gray-500">
                Analytics not configured — set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID to
                enable session replay links.
              </p>
            ) : (
              <>
                {sessionReplays.data.projectReplayUrl && (
                  <a
                    href={sessionReplays.data.projectReplayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-4 inline-block rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Open session replays in PostHog ↗
                  </a>
                )}
                {!sessionReplays.data.postHogAvailable && sessionReplays.data.postHogError && (
                  <p className="mb-4 text-sm text-red-700">
                    Could not list recent recordings: {sessionReplays.data.postHogError}
                  </p>
                )}
                {sessionReplays.data.recordings?.length > 0 ? (
                  <ul className="divide-y divide-gray-100 text-sm">
                    {sessionReplays.data.recordings.map((rec: any) => (
                      <li key={rec.id} className="flex items-center justify-between py-2">
                        <span>
                          {rec.personLabel || 'Anonymous visitor'} —{' '}
                          {rec.startTime ? new Date(rec.startTime).toLocaleString() : 'Unknown time'}
                          {rec.durationSeconds ? ` · ${Math.round(rec.durationSeconds)}s` : ''}
                        </span>
                        <a href={rec.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Open ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No recent recordings found.</p>
                )}
              </>
            )}
          </div>
        </section>
      </Container>
    </main>
  )
}

function FunnelCard({ title, stages }: { title: string; stages?: { label: string; count: number | null }[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{title}</h3>
      {!stages ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <ol className="space-y-3">
          {stages.map((stage, index) => {
            const first = stages[0]?.count
            const conversion =
              first && first > 0 && stage.count !== null ? Math.round((stage.count / first) * 1000) / 10 : null
            const previous = index > 0 ? stages[index - 1].count : null
            const dropOff =
              previous && previous > 0 && stage.count !== null
                ? Math.round(((previous - stage.count) / previous) * 1000) / 10
                : null

            return (
              <li key={stage.label} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{stage.label}</p>
                  {index > 0 && dropOff !== null && (
                    <p className="text-xs text-gray-400">{dropOff}% drop-off from previous stage</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatNumber(stage.count)}</p>
                  {conversion !== null && <p className="text-xs text-gray-400">{conversion}% of visitors</p>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
