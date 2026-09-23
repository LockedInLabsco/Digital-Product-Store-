'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DateRangePicker, { RangePreset } from './DateRangePicker'
import StatCard from './StatCard'
import MiniChart from './MiniChart'
import SortableTable, { ColumnDef } from './SortableTable'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('en-US').format(value)
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`
}

interface SourceRow {
  source: string
  signups: number
}

interface AttributionRow {
  source: string
  deviceCategory: string
  visitors: number
}

interface WaitlistAnalyticsResponse {
  waitlist: { id: string; slug: string; name: string }
  supabase: {
    totalSignups: number
    signupsToday: number
    signupsThisWeek: number
    signupsInRange: number
    timeSeries: { date: string; signups: number }[]
    sourceBreakdown: SourceRow[]
  }
  postHogConfigured: boolean
  postHogAvailable: boolean
  postHogError?: string
  behavior: {
    uniqueVisitors: number | null
    signupStarted: number | null
    signupCompleted: number | null
    signupFailed: number | null
    conversionRate: number | null
    conversionRateDefinition: string
    visitorAttribution: AttributionRow[]
  }
}

/**
 * Analytics tab of the waitlist detail page (admin/waitlists/[id]) — a
 * per-waitlist view built from the same StatCard/MiniChart/SortableTable/
 * DateRangePicker components as the store-wide /admin/analytics
 * dashboard, so it reads as part of the same admin panel rather than a
 * one-off. Deliberately does not touch that dashboard or its routes.
 */
export default function WaitlistAnalyticsPanel({ waitlistId }: { waitlistId: string }) {
  const router = useRouter()
  const [preset, setPreset] = useState<RangePreset>('7d')
  const [customFrom, setCustomFrom] = useState(todayIso())
  const [customTo, setCustomTo] = useState(todayIso())
  const [data, setData] = useState<WaitlistAnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

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

  const fetchAnalytics = useCallback(async () => {
    if (!rangeQuery) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/waitlists/${waitlistId}/analytics?${rangeQuery}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('admin_token')
          router.push('/admin/login')
          return
        }
        throw new Error(body.error || 'Failed to load analytics')
      }
      setData(body)
      setLastRefreshed(new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [rangeQuery, waitlistId, router])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics, refreshTick])

  const postHogUnavailable = data && !data.postHogConfigured

  const sourceColumns: ColumnDef<SourceRow>[] = [
    { key: 'source', header: 'Source', accessor: (r) => r.source },
    {
      key: 'signups',
      header: 'Signups',
      accessor: (r) => formatNumber(r.signups),
      sortValue: (r) => r.signups,
      align: 'right',
    },
  ]

  const attributionColumns: ColumnDef<AttributionRow>[] = [
    { key: 'source', header: 'Source', accessor: (r) => r.source },
    { key: 'deviceCategory', header: 'Device', accessor: (r) => r.deviceCategory },
    {
      key: 'visitors',
      header: 'Visitors',
      accessor: (r) => formatNumber(r.visitors),
      sortValue: (r) => r.visitors,
      align: 'right',
    },
  ]

  return (
    <div className="space-y-8">
      <DateRangePicker
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        onPresetChange={setPreset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onRefresh={() => setRefreshTick((t) => t + 1)}
        isRefreshing={isLoading}
        lastRefreshed={lastRefreshed}
      />

      {error && <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {postHogUnavailable && (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          PostHog is not configured, so unique visitors, funnel, and traffic/device breakdowns aren&apos;t
          available. Signup counts and source breakdown below come from Supabase and are unaffected.
        </div>
      )}

      {data?.postHogConfigured && !data.postHogAvailable && data.postHogError && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">PostHog is configured, but the query failed.</p>
          <p className="mt-1">{data.postHogError}</p>
        </div>
      )}

      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Signups</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total signups (all time)" value={formatNumber(data?.supabase.totalSignups)} />
          <StatCard label="Signups today" value={formatNumber(data?.supabase.signupsToday)} />
          <StatCard label="Signups this week" value={formatNumber(data?.supabase.signupsThisWeek)} />
          <StatCard label="Signups in range" value={formatNumber(data?.supabase.signupsInRange)} />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">Behavior (PostHog)</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Unique visitors"
            value={formatNumber(data?.behavior.uniqueVisitors)}
            unavailable={postHogUnavailable || (data ? !data.postHogAvailable : false)}
          />
          <StatCard
            label="Conversion rate"
            value={formatPercent(data?.behavior.conversionRate)}
            unavailable={postHogUnavailable || (data ? !data.postHogAvailable : false)}
            unavailableReason={data?.behavior.conversionRateDefinition}
          />
          <StatCard
            label="Signup started"
            value={formatNumber(data?.behavior.signupStarted)}
            unavailable={postHogUnavailable || (data ? !data.postHogAvailable : false)}
          />
          <StatCard
            label="Signup completed"
            value={formatNumber(data?.behavior.signupCompleted)}
            unavailable={postHogUnavailable || (data ? !data.postHogAvailable : false)}
          />
        </div>
        {data?.behavior.conversionRate !== null && data?.behavior.conversionRate !== undefined && (
          <p className="mt-2 text-xs text-gray-400" title={data.behavior.conversionRateDefinition}>
            Conversion rate = {data.behavior.conversionRateDefinition}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Signups over time</h3>
        <MiniChart
          ariaLabel="Signups over time"
          data={(data?.supabase.timeSeries || []).map((p) => ({ label: p.date, value: p.signups }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Source breakdown (signups)</h3>
          <SortableTable
            columns={sourceColumns}
            rows={data?.supabase.sourceBreakdown || []}
            rowKey={(r) => r.source}
            isLoading={isLoading}
            defaultSortKey="signups"
            emptyMessage="No signups in this period"
          />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Traffic &amp; device (visitors)</h3>
          <SortableTable
            columns={attributionColumns}
            rows={data?.behavior.visitorAttribution || []}
            rowKey={(r) => `${r.source}-${r.deviceCategory}`}
            isLoading={isLoading}
            error={postHogUnavailable ? null : data?.postHogError}
            defaultSortKey="visitors"
            emptyMessage={postHogUnavailable ? 'Analytics not configured' : 'No visitor data for this period'}
          />
        </div>
      </div>
    </div>
  )
}
