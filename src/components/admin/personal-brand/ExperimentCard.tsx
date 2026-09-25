'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PB_EXPERIMENT_STATUSES, type PbExperiment, type PbExperimentStatus } from '@/src/types/personalBrand'

interface LinkedContent {
  id: string
  title: string | null
  status: string
}

interface ContentOption {
  id: string
  title: string | null
}

interface ExperimentCardProps {
  experiment: PbExperiment & { linked_content_count: number }
  contentOptions: ContentOption[]
  onUpdate: (experiment: PbExperiment) => Promise<void>
  onDelete: (experiment: PbExperiment) => Promise<void>
}

const STATUS_BADGE: Record<PbExperimentStatus, string> = {
  planned: 'bg-admin-surface2 text-admin-muted',
  active: 'bg-green-950/40 text-green-400',
  completed: 'bg-admin-surface2 text-admin-text',
  abandoned: 'bg-red-950/40 text-red-400',
}

export default function ExperimentCard({ experiment, contentOptions, onUpdate, onDelete }: ExperimentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(experiment.status)
  const [result, setResult] = useState(experiment.result || '')
  const [notes, setNotes] = useState(experiment.notes || '')
  const [linkedContent, setLinkedContent] = useState<LinkedContent[]>([])
  const [selectedContentId, setSelectedContentId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)

  const loadLinkedContent = async () => {
    setIsLoadingLinks(true)
    try {
      const res = await fetch(`/api/admin/personal-brand/experiments/${experiment.id}`)
      if (res.ok) {
        const data = await res.json()
        setLinkedContent(data.linkedContent || [])
      }
    } finally {
      setIsLoadingLinks(false)
    }
  }

  const toggleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next) loadLinkedContent()
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate({ ...experiment, status, result: result || null, notes: notes || null })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLink = async () => {
    if (!selectedContentId) return
    const response = await fetch(`/api/admin/personal-brand/experiments/${experiment.id}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: selectedContentId }),
    })
    if (response.ok) {
      setSelectedContentId('')
      await loadLinkedContent()
    }
  }

  const handleUnlink = async (contentId: string) => {
    const response = await fetch(`/api/admin/personal-brand/experiments/${experiment.id}/content`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_id: contentId }),
    })
    if (response.ok) {
      setLinkedContent((prev) => prev.filter((c) => c.id !== contentId))
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-admin-border rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent'

  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold">{experiment.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[experiment.status]}`}>
              {experiment.status}
            </span>
          </div>
          {experiment.hypothesis && <p className="mt-1 text-sm text-admin-muted">{experiment.hypothesis}</p>}
          {experiment.variable_tested && (
            <p className="mt-1 text-xs text-admin-faint">Testing: {experiment.variable_tested}</p>
          )}
          <p className="mt-1 text-xs text-admin-faint">{experiment.linked_content_count} post(s) linked</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button onClick={toggleExpand} className="text-xs font-medium text-admin-muted hover:text-admin-text">
            {expanded ? 'Collapse' : 'Manage'}
          </button>
          <button onClick={() => onDelete(experiment)} className="text-xs font-medium text-red-400 hover:text-red-300">
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-admin-border pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-admin-muted">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as PbExperimentStatus)} className={inputClass}>
                {PB_EXPERIMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-admin-muted">Result</label>
            <textarea value={result} onChange={(e) => setResult(e.target.value)} rows={2} className={inputClass} placeholder="What happened — evidence, not conclusions" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-admin-muted">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded bg-admin-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-admin-accentText hover:bg-admin-accentHover disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>

          <div>
            <label className="mb-1 block text-xs font-medium text-admin-muted">Linked content</label>
            {isLoadingLinks ? (
              <p className="text-sm text-admin-muted">Loading…</p>
            ) : linkedContent.length === 0 ? (
              <p className="text-sm text-admin-muted">No content linked yet.</p>
            ) : (
              <ul className="mb-2 space-y-1">
                {linkedContent.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/personal-brand/content/${c.id}`} className="hover:text-admin-muted">
                      {c.title || 'Untitled'}
                    </Link>
                    <button onClick={() => handleUnlink(c.id)} className="text-xs text-red-400 hover:text-red-300">
                      Unlink
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <select value={selectedContentId} onChange={(e) => setSelectedContentId(e.target.value)} className={inputClass}>
                <option value="">Select content to link…</option>
                {contentOptions
                  .filter((c) => !linkedContent.some((lc) => lc.id === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || 'Untitled'}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleLink}
                disabled={!selectedContentId}
                className="whitespace-nowrap rounded border border-admin-border px-3 py-2 text-xs font-medium hover:border-admin-text disabled:opacity-50"
              >
                Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
