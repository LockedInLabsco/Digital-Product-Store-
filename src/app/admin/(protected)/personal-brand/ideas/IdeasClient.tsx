'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import IdeaQuickAddForm, { type IdeaQuickAddData } from '@/src/components/admin/personal-brand/IdeaQuickAddForm'
import { PB_IDEA_STATUSES, type PbIdea, type PbIdeaStatus } from '@/src/types/personalBrand'

const STATUS_FILTERS: ('all' | PbIdeaStatus)[] = ['all', ...PB_IDEA_STATUSES]

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-950/40 text-red-400',
  normal: 'bg-admin-surface2 text-admin-muted',
  low: 'bg-admin-surface2 text-admin-faint',
}

export default function IdeasClient() {
  const router = useRouter()
  const [ideas, setIdeas] = useState<PbIdea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PbIdeaStatus>('all')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/personal-brand/ideas')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load ideas')
      setIdeas(data.ideas || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ideas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async (data: IdeaQuickAddData) => {
    setIsAdding(true)
    try {
      const response = await fetch('/api/admin/personal-brand/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to save idea')
      setIdeas((prev) => [result.idea, ...prev])
    } finally {
      setIsAdding(false)
    }
  }

  const handleStatusChange = async (idea: PbIdea, status: PbIdeaStatus) => {
    const response = await fetch(`/api/admin/personal-brand/ideas/${idea.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...idea, status }),
    })
    if (response.ok) {
      const result = await response.json()
      setIdeas((prev) => prev.map((i) => (i.id === idea.id ? result.idea : i)))
    }
  }

  const handleDelete = async (idea: PbIdea) => {
    if (!confirm(`Delete "${idea.title}"?`)) return
    const response = await fetch(`/api/admin/personal-brand/ideas/${idea.id}`, { method: 'DELETE' })
    if (response.ok) {
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id))
    }
  }

  const filteredIdeas = useMemo(() => {
    if (statusFilter === 'all') return ideas
    return ideas.filter((i) => i.status === statusFilter)
  }, [ideas, statusFilter])

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-4xl">
          <PersonalBrandTabs />

          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold">Idea Vault</h2>
            <p className="text-admin-muted">Dump an idea fast, enrich it later.</p>
          </div>

          <div className="mb-6">
            <IdeaQuickAddForm onSubmit={handleAdd} isLoading={isAdding} />
          </div>

          <div className="mb-4 flex gap-1 text-sm">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded px-3 py-1.5 font-medium capitalize ${
                  statusFilter === s ? 'bg-admin-surface2 text-admin-text' : 'text-admin-muted hover:bg-admin-surface2'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {error && <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}
          {isLoading && <p className="text-admin-muted">Loading…</p>}

          {!isLoading && filteredIdeas.length === 0 && (
            <div className="rounded-lg border border-admin-border bg-admin-surface p-8 text-center text-admin-muted">
              No ideas here yet.
            </div>
          )}

          <div className="space-y-2">
            {filteredIdeas.map((idea) => (
              <div key={idea.id} className="rounded-lg border border-admin-border bg-admin-surface p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{idea.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_BADGE[idea.priority]}`}>
                        {idea.priority}
                      </span>
                    </div>
                    {(idea.topic || idea.content_pillar) && (
                      <p className="mt-1 text-xs text-admin-muted">
                        {[idea.topic, idea.content_pillar].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {idea.possible_hook && <p className="mt-1 text-sm text-admin-muted">Hook: {idea.possible_hook}</p>}
                    {idea.raw_idea && <p className="mt-1 text-sm">{idea.raw_idea}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={idea.status}
                      onChange={(e) => handleStatusChange(idea, e.target.value as PbIdeaStatus)}
                      className="rounded border border-admin-border bg-transparent px-2 py-1 text-xs"
                    >
                      {PB_IDEA_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => handleDelete(idea)} className="text-xs font-medium text-red-400 hover:text-red-300">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </main>
  )
}
