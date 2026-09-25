'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import StatCard from '@/src/components/admin/analytics/StatCard'
import { formatRate } from '@/src/lib/personal-brand/metrics'
import { MIN_SAMPLE_SIZE_FOR_CONFIDENCE } from '@/src/lib/personal-brand/baselines'
import type { DashboardData } from '@/src/lib/personal-brand/dashboard'

function PostLink({ contentId, title, value }: { contentId: string; title: string | null; value: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-2">
      <Link href={`/admin/personal-brand/content/${contentId}`} className="truncate text-sm font-medium hover:text-admin-muted">
        {title || 'Untitled'}
      </Link>
      <span className="whitespace-nowrap text-sm text-admin-muted">{value}</span>
    </li>
  )
}

export default function DashboardClient() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/personal-brand/analytics')
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/admin/login')
          return null
        }
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load dashboard')
        return json as DashboardData
      })
      .then((json) => json && setData(json))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-5xl">
          <PersonalBrandTabs />

          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold">Personal Brand Dashboard</h2>
            <p className="text-admin-muted">What&apos;s working, what changed, what you&apos;re testing, and what to look at next.</p>
          </div>

          {error && <div className="mb-8 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}
          {isLoading && <p className="text-admin-muted">Loading…</p>}

          {data && (
            <>
              {data.totalContentCount === 0 ? (
                <div className="rounded-lg border border-admin-border bg-admin-surface p-8 text-center text-admin-muted">
                  No content logged yet.{' '}
                  <Link href="/admin/personal-brand/content/new" className="text-admin-text underline">
                    Add your first piece of content
                  </Link>{' '}
                  to start building your Content OS.
                </div>
              ) : (
                <>
                  <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatCard label="Total content" value={data.totalContentCount.toLocaleString()} />
                    <StatCard label="Posted" value={data.totalPostedCount.toLocaleString()} />
                    <StatCard
                      label="Account median engagement"
                      value={formatRate(data.accountBaseline.medianEngagementRate)}
                      unavailable={data.accountBaseline.medianEngagementRate === null}
                      unavailableReason={`Based on ${data.accountBaseline.sampleSize} posted item(s) with metrics`}
                    />
                    <StatCard
                      label={`Last ${data.recentPerformance.windowDays}d vs baseline`}
                      value={
                        data.recentPerformance.vsAccountBaselinePercent !== null
                          ? `${data.recentPerformance.vsAccountBaselinePercent >= 0 ? '+' : ''}${data.recentPerformance.vsAccountBaselinePercent.toFixed(0)}%`
                          : '—'
                      }
                      unavailable={data.recentPerformance.vsAccountBaselinePercent === null}
                      unavailableReason={`${data.recentPerformance.sampleSize} recent post(s) with metrics`}
                    />
                  </div>

                  {data.accountBaseline.sampleSize < MIN_SAMPLE_SIZE_FOR_CONFIDENCE && (
                    <div className="mb-10 rounded-lg border border-admin-border bg-admin-surface2 p-4 text-sm text-admin-muted">
                      Only {data.accountBaseline.sampleSize} posted item(s) have metrics so far — baselines and &quot;what&apos;s
                      working&quot; below will get more reliable as you log more posted content and performance.
                    </div>
                  )}

                  <section className="mb-10">
                    <h3 className="mb-4 text-lg font-bold">What&apos;s working</h3>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
                        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-admin-muted">Strongest formats</h4>
                        {data.strongestFormats.length === 0 ? (
                          <p className="py-4 text-sm text-admin-muted">No formats with evidence yet.</p>
                        ) : (
                          <ul className="divide-y divide-admin-border">
                            {data.strongestFormats.map((f) => (
                              <li key={f.format.id} className="flex items-center justify-between gap-4 py-2">
                                <Link href="/admin/personal-brand/formats" className="truncate text-sm font-medium hover:text-admin-muted">
                                  {f.format.name}
                                </Link>
                                <span className="whitespace-nowrap text-sm text-admin-muted">
                                  {formatRate(f.medianEngagementRate)} · n={f.sampleSize}
                                  {!f.hasEnoughEvidence && ' (limited)'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
                        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-admin-muted">Strongest posts (engagement)</h4>
                        {data.topPostsByEngagement.length === 0 ? (
                          <p className="py-4 text-sm text-admin-muted">No posted content with metrics yet.</p>
                        ) : (
                          <ul className="divide-y divide-admin-border">
                            {data.topPostsByEngagement.map((p) => (
                              <PostLink key={p.contentId} contentId={p.contentId} title={p.title} value={formatRate(p.metricValue)} />
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
                        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-admin-muted">Best follower conversion</h4>
                        {data.bestFollowConversion.length === 0 ? (
                          <p className="py-4 text-sm text-admin-muted">No data yet.</p>
                        ) : (
                          <ul className="divide-y divide-admin-border">
                            {data.bestFollowConversion.map((p) => (
                              <PostLink key={p.contentId} contentId={p.contentId} title={p.title} value={formatRate(p.metricValue)} />
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
                        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-admin-muted">Best DM conversion</h4>
                        {data.bestDmConversion.length === 0 ? (
                          <p className="py-4 text-sm text-admin-muted">No data yet.</p>
                        ) : (
                          <ul className="divide-y divide-admin-border">
                            {data.bestDmConversion.map((p) => (
                              <PostLink key={p.contentId} contentId={p.contentId} title={p.title} value={formatRate(p.metricValue)} />
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-lg border border-admin-border bg-admin-surface p-5 sm:col-span-2">
                        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-admin-muted">Strongest save rate</h4>
                        {data.strongestSaveRate.length === 0 ? (
                          <p className="py-4 text-sm text-admin-muted">No data yet.</p>
                        ) : (
                          <ul className="divide-y divide-admin-border">
                            {data.strongestSaveRate.map((p) => (
                              <PostLink key={p.contentId} contentId={p.contentId} title={p.title} value={formatRate(p.metricValue)} />
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="mb-10">
                    <h3 className="mb-4 text-lg font-bold">Experiments</h3>
                    <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
                      {data.activeExperiments.length === 0 ? (
                        <p className="text-sm text-admin-muted">
                          No active experiments.{' '}
                          <Link href="/admin/personal-brand/experiments" className="text-admin-text underline">
                            Start one
                          </Link>
                          .
                        </p>
                      ) : (
                        <ul className="divide-y divide-admin-border">
                          {data.activeExperiments.map((exp) => (
                            <li key={exp.id} className="flex items-center justify-between gap-4 py-2">
                              <Link href="/admin/personal-brand/experiments" className="truncate text-sm font-medium hover:text-admin-muted">
                                {exp.name}
                              </Link>
                              <span className="whitespace-nowrap text-sm capitalize text-admin-muted">
                                {exp.status} · {exp.linkedContentCount} post(s)
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-4 text-lg font-bold">Ideas / next</h3>
                    <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
                      {data.unusedIdeas.length === 0 ? (
                        <p className="text-sm text-admin-muted">
                          No unused ideas sitting in the vault.{' '}
                          <Link href="/admin/personal-brand/ideas" className="text-admin-text underline">
                            Add one
                          </Link>
                          .
                        </p>
                      ) : (
                        <ul className="divide-y divide-admin-border">
                          {data.unusedIdeas.map((idea) => (
                            <li key={idea.id} className="flex items-center justify-between gap-4 py-2">
                              <Link href="/admin/personal-brand/ideas" className="truncate text-sm font-medium hover:text-admin-muted">
                                {idea.title}
                              </Link>
                              <span className="whitespace-nowrap text-sm capitalize text-admin-muted">{idea.priority} priority</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </Container>
    </main>
  )
}
