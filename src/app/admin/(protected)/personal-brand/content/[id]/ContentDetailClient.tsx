'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import ContentForm, { type ContentFormData } from '@/src/components/admin/personal-brand/ContentForm'
import MetricSnapshotForm, { type MetricSnapshotFormData } from '@/src/components/admin/personal-brand/MetricSnapshotForm'
import AiAnalysisPanel from '@/src/components/admin/personal-brand/AiAnalysisPanel'
import StatCard from '@/src/components/admin/analytics/StatCard'
import MiniChart from '@/src/components/admin/analytics/MiniChart'
import { calculateRates, formatRate, latestSnapshot } from '@/src/lib/personal-brand/metrics'
import { percentVsBaseline } from '@/src/lib/personal-brand/baselines'
import type { DashboardData } from '@/src/lib/personal-brand/dashboard'
import type { PbContentItem, PbContentMetric, PbFormat } from '@/src/types/personalBrand'

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function ContentDetailClient({ contentId }: { contentId: string }) {
  const router = useRouter()
  const [content, setContent] = useState<PbContentItem | null>(null)
  const [metrics, setMetrics] = useState<PbContentMetric[]>([])
  const [formats, setFormats] = useState<PbFormat[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId])

  const load = async () => {
    try {
      setIsLoading(true)
      const [detailRes, formatsRes, analyticsRes] = await Promise.all([
        fetch(`/api/admin/personal-brand/content/${contentId}`),
        fetch('/api/admin/personal-brand/formats'),
        fetch('/api/admin/personal-brand/analytics'),
      ])

      if (detailRes.status === 401) {
        router.push('/admin/login')
        return
      }

      const detailData = await detailRes.json()
      if (!detailRes.ok) throw new Error(detailData.error || 'Failed to load content item')

      setContent(detailData.content)
      setMetrics(detailData.metrics || [])

      if (formatsRes.ok) {
        const formatsData = await formatsRes.json()
        setFormats(formatsData.formats || [])
      }
      if (analyticsRes.ok) {
        setDashboardData(await analyticsRes.json())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content item')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (data: ContentFormData) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/personal-brand/content/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          format_id: data.format_id || null,
          duration_seconds: data.duration_seconds ? Number(data.duration_seconds) : null,
          posted_at: data.posted_at ? new Date(data.posted_at).toISOString() : null,
          tags: data.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to save changes')
      setContent(result.content)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddSnapshot = async (data: MetricSnapshotFormData) => {
    setIsSavingSnapshot(true)
    try {
      const payload: Record<string, unknown> = {
        recorded_at: data.recorded_at ? new Date(data.recorded_at).toISOString() : undefined,
      }
      for (const [key, value] of Object.entries(data)) {
        if (key === 'recorded_at') continue
        payload[key] = value === '' ? null : Number(value)
      }

      const response = await fetch(`/api/admin/personal-brand/content/${contentId}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to save snapshot')
      setMetrics((prev) => [...prev, result.metric])
    } finally {
      setIsSavingSnapshot(false)
    }
  }

  const handleDeleteSnapshot = async (metricId: string) => {
    if (!confirm('Delete this metrics snapshot?')) return
    const response = await fetch(`/api/admin/personal-brand/content/${contentId}/metrics/${metricId}`, {
      method: 'DELETE',
    })
    if (response.ok) {
      setMetrics((prev) => prev.filter((m) => m.id !== metricId))
    }
  }

  const handleDeleteContent = async () => {
    if (!content || !confirm(`Delete "${content.title || 'this content item'}"? This also deletes its metrics history.`)) return
    const response = await fetch(`/api/admin/personal-brand/content/${contentId}`, { method: 'DELETE' })
    if (response.ok) {
      router.push('/admin/personal-brand/content')
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-admin-bg">
        <Container className="py-12">
          <PersonalBrandTabs />
          <p className="text-admin-muted">Loading…</p>
        </Container>
      </main>
    )
  }

  if (error || !content) {
    return (
      <main className="min-h-screen bg-admin-bg">
        <Container className="py-12">
          <PersonalBrandTabs />
          <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">
            {error || 'Content item not found'}
          </div>
        </Container>
      </main>
    )
  }

  const latest = latestSnapshot(metrics)
  const rates = latest ? calculateRates(latest) : null

  const viewsChartData = metrics
    .filter((m) => m.views !== null)
    .map((m) => ({ label: new Date(m.recorded_at).toLocaleDateString(), value: m.views as number }))

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-4xl">
          <PersonalBrandTabs />

          <div className="mb-8 flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold">{content.title || 'Untitled content'}</h2>
              <p className="text-admin-muted capitalize">
                {content.platform} · {content.content_type} · {content.status}
              </p>
            </div>
            <button onClick={handleDeleteContent} className="text-sm font-medium text-red-400 hover:text-red-300">
              Delete
            </button>
          </div>

          <section className="mb-10">
            <h3 className="mb-4 text-lg font-bold">Performance</h3>
            {!latest ? (
              <div className="rounded-lg border border-admin-border bg-admin-surface p-6 text-center text-admin-muted">
                No metrics recorded yet — add your first snapshot below.
              </div>
            ) : (
              <>
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <StatCard label="Views" value={latest.views?.toLocaleString() ?? '—'} unavailable={latest.views === null} />
                  <StatCard label="Likes" value={latest.likes?.toLocaleString() ?? '—'} unavailable={latest.likes === null} />
                  <StatCard label="Engagement rate" value={formatRate(rates?.engagementRate ?? null)} unavailable={rates?.engagementRate === null} />
                  <StatCard label="Comment rate" value={formatRate(rates?.commentRate ?? null)} unavailable={rates?.commentRate === null} />
                  <StatCard label="Save rate" value={formatRate(rates?.saveRate ?? null)} unavailable={rates?.saveRate === null} />
                  <StatCard label="Follow conversion" value={formatRate(rates?.followConversion ?? null)} unavailable={rates?.followConversion === null} />
                </div>
                {dashboardData && (
                  <div className="mb-6 rounded-lg border border-admin-border bg-admin-surface2 p-4 text-sm text-admin-muted">
                    {(() => {
                      const baselineRate = dashboardData.accountBaseline.medianEngagementRate
                      const diff = percentVsBaseline(rates?.engagementRate ?? null, baselineRate)
                      if (baselineRate === null) {
                        return 'No account baseline yet — log more posted content with metrics to compare against.'
                      }
                      if (diff === null) {
                        return `Account median engagement rate: ${formatRate(baselineRate)} (n=${dashboardData.accountBaseline.sampleSize}).`
                      }
                      return `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}% vs account median engagement rate of ${formatRate(baselineRate)} (n=${dashboardData.accountBaseline.sampleSize}).`
                    })()}
                  </div>
                )}
                {viewsChartData.length > 1 && (
                  <div className="mb-6 rounded-lg border border-admin-border bg-admin-surface p-4">
                    <MiniChart data={viewsChartData} ariaLabel="Views over time" formatValue={(v) => v.toLocaleString()} />
                  </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-admin-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-admin-border bg-admin-surface">
                        <th className="px-3 py-2 text-left font-semibold">Recorded</th>
                        <th className="px-3 py-2 text-right font-semibold">Views</th>
                        <th className="px-3 py-2 text-right font-semibold">Likes</th>
                        <th className="px-3 py-2 text-right font-semibold">Comments</th>
                        <th className="px-3 py-2 text-right font-semibold">Saves</th>
                        <th className="px-3 py-2 text-right font-semibold">Followers</th>
                        <th className="px-3 py-2 text-right font-semibold">Engagement</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {[...metrics].reverse().map((m) => {
                        const r = calculateRates(m)
                        return (
                          <tr key={m.id} className="border-b border-admin-border bg-admin-surface hover:bg-admin-surface2">
                            <td className="px-3 py-2">{new Date(m.recorded_at).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{m.views?.toLocaleString() ?? '—'}</td>
                            <td className="px-3 py-2 text-right">{m.likes?.toLocaleString() ?? '—'}</td>
                            <td className="px-3 py-2 text-right">{m.comments?.toLocaleString() ?? '—'}</td>
                            <td className="px-3 py-2 text-right">{m.saves?.toLocaleString() ?? '—'}</td>
                            <td className="px-3 py-2 text-right">{m.followers_gained?.toLocaleString() ?? '—'}</td>
                            <td className="px-3 py-2 text-right">{formatRate(r.engagementRate)}</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => handleDeleteSnapshot(m.id)} className="text-xs text-red-400 hover:text-red-300">
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="mb-10">
            <MetricSnapshotForm onSubmit={handleAddSnapshot} isLoading={isSavingSnapshot} />
          </section>

          <section className="mb-10">
            <AiAnalysisPanel contentId={contentId} />
          </section>

          <section>
            <h3 className="mb-4 text-lg font-bold">Details</h3>
            <ContentForm
              formats={formats}
              isLoading={isSaving}
              submitLabel="Save changes"
              initialData={{
                platform: content.platform,
                content_type: content.content_type,
                status: content.status,
                title: content.title || '',
                hook: content.hook || '',
                caption: content.caption || '',
                script: content.script || '',
                transcript: content.transcript || '',
                cta: content.cta || '',
                topic: content.topic || '',
                content_pillar: content.content_pillar || '',
                goal: content.goal || '',
                format_id: content.format_id || '',
                audio_used: content.audio_used || '',
                duration_seconds: content.duration_seconds?.toString() || '',
                posted_at: toDatetimeLocal(content.posted_at),
                platform_url: content.platform_url || '',
                thumbnail_path: content.thumbnail_path || '',
                notes: content.notes || '',
                tags: content.tags.join(', '),
              }}
              onSubmit={handleUpdate}
            />
          </section>
        </div>
      </Container>
    </main>
  )
}
