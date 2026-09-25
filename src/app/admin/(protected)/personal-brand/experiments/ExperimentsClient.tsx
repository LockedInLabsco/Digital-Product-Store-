'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import ExperimentCreateForm, { type ExperimentCreateData } from '@/src/components/admin/personal-brand/ExperimentCreateForm'
import ExperimentCard from '@/src/components/admin/personal-brand/ExperimentCard'
import type { PbExperiment } from '@/src/types/personalBrand'

type ExperimentRow = PbExperiment & { linked_content_count: number }

export default function ExperimentsClient() {
  const router = useRouter()
  const [experiments, setExperiments] = useState<ExperimentRow[]>([])
  const [contentOptions, setContentOptions] = useState<{ id: string; title: string | null }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    try {
      setIsLoading(true)
      const [expRes, contentRes] = await Promise.all([
        fetch('/api/admin/personal-brand/experiments'),
        fetch('/api/admin/personal-brand/content'),
      ])

      if (expRes.status === 401) {
        router.push('/admin/login')
        return
      }

      const expData = await expRes.json()
      if (!expRes.ok) throw new Error(expData.error || 'Failed to load experiments')
      setExperiments(expData.experiments || [])

      if (contentRes.ok) {
        const contentData = await contentRes.json()
        setContentOptions((contentData.content || []).map((c: any) => ({ id: c.id, title: c.title })))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (data: ExperimentCreateData) => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/personal-brand/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create experiment')
      setExperiments((prev) => [{ ...result.experiment, linked_content_count: 0 }, ...prev])
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (experiment: PbExperiment) => {
    const response = await fetch(`/api/admin/personal-brand/experiments/${experiment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(experiment),
    })
    if (response.ok) {
      const result = await response.json()
      setExperiments((prev) => prev.map((e) => (e.id === experiment.id ? { ...result.experiment, linked_content_count: e.linked_content_count } : e)))
    }
  }

  const handleDelete = async (experiment: PbExperiment) => {
    if (!confirm(`Delete experiment "${experiment.name}"?`)) return
    const response = await fetch(`/api/admin/personal-brand/experiments/${experiment.id}`, { method: 'DELETE' })
    if (response.ok) {
      setExperiments((prev) => prev.filter((e) => e.id !== experiment.id))
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-4xl">
          <PersonalBrandTabs />

          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold">Experiments</h2>
            <p className="text-admin-muted">Content hypotheses, what was tested, and the evidence gathered — not automatic conclusions.</p>
          </div>

          <div className="mb-6">
            <ExperimentCreateForm onSubmit={handleCreate} isLoading={isCreating} />
          </div>

          {error && <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}
          {isLoading && <p className="text-admin-muted">Loading…</p>}

          {!isLoading && experiments.length === 0 && (
            <div className="rounded-lg border border-admin-border bg-admin-surface p-8 text-center text-admin-muted">
              No experiments yet.
            </div>
          )}

          <div className="space-y-3">
            {experiments.map((experiment) => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                contentOptions={contentOptions}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </Container>
    </main>
  )
}
