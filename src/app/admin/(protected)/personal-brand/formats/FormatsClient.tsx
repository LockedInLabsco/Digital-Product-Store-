'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import FormatForm, { type FormatFormData } from '@/src/components/admin/personal-brand/FormatForm'
import { formatRate } from '@/src/lib/personal-brand/metrics'
import { MIN_SAMPLE_SIZE_FOR_CONFIDENCE } from '@/src/lib/personal-brand/baselines'
import type { FormatEvidence } from '@/src/lib/personal-brand/formatEvidence'

export default function FormatsClient() {
  const router = useRouter()
  const [evidence, setEvidence] = useState<FormatEvidence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/personal-brand/formats/evidence')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load formats')
      setEvidence(data.evidence || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load formats')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (data: FormatFormData) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/personal-brand/formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create format')
      setShowForm(false)
      await load()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-5xl">
          <PersonalBrandTabs />

          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold">Winning Formats</h2>
              <p className="text-admin-muted">
                Reusable content structures, with historical evidence from your own posted content — not assumptions.
              </p>
            </div>
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : '+ New Format'}</Button>
          </div>

          {showForm && (
            <div className="mb-8">
              <FormatForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isLoading={isSaving} submitLabel="Create format" />
            </div>
          )}

          {error && <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}
          {isLoading && <p className="text-admin-muted">Loading…</p>}

          {!isLoading && evidence.length === 0 && !error && (
            <div className="rounded-lg border border-admin-border bg-admin-surface p-8 text-center text-admin-muted">
              No formats yet. Create your first one to start tracking what structures actually work.
            </div>
          )}

          <div className="space-y-4">
            {evidence.map((e) => (
              <div key={e.format.id} className="rounded-lg border border-admin-border bg-admin-surface p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{e.format.name}</h3>
                    {e.format.description && <p className="mt-1 text-sm text-admin-muted">{e.format.description}</p>}
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium capitalize ${e.format.status === 'active' ? 'bg-green-950/40 text-green-400' : 'bg-admin-surface2 text-admin-muted'}`}>
                    {e.format.status}
                  </span>
                </div>

                {e.sampleSize === 0 ? (
                  <p className="text-sm text-admin-muted">No posted content uses this format yet.</p>
                ) : (
                  <>
                    <div className="mb-2 text-sm text-admin-muted">
                      Based on <strong className="text-admin-text">{e.sampleSize}</strong> posted item(s)
                      {!e.hasEnoughEvidence && (
                        <span className="ml-2 rounded bg-admin-surface2 px-2 py-0.5 text-xs">
                          Limited evidence — fewer than {MIN_SAMPLE_SIZE_FOR_CONFIDENCE} posts
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-admin-faint">Median views</p>
                        <p className="font-semibold">{e.medianViews?.toLocaleString() ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-admin-faint">Median engagement</p>
                        <p className="font-semibold">{formatRate(e.medianEngagementRate)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-admin-faint">Median save rate</p>
                        <p className="font-semibold">{formatRate(e.medianSaveRate)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-admin-faint">Median follow conv.</p>
                        <p className="font-semibold">{formatRate(e.medianFollowConversion)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-admin-faint">Median DM conv.</p>
                        <p className="font-semibold">{formatRate(e.medianDmConversion)}</p>
                      </div>
                    </div>
                    {e.bestPost && (
                      <p className="mt-3 text-sm">
                        Best example:{' '}
                        <Link href={`/admin/personal-brand/content/${e.bestPost.contentId}`} className="font-medium underline hover:text-admin-muted">
                          {e.bestPost.title || 'Untitled'}
                        </Link>{' '}
                        ({formatRate(e.bestPost.engagementRate)} engagement)
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </main>
  )
}
