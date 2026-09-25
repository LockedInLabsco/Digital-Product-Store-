'use client'

import { useState } from 'react'
import Button from '@/src/components/admin/AdminButton'

export interface IdeaQuickAddData {
  title: string
  raw_idea: string
  topic: string
  content_pillar: string
  possible_hook: string
  priority: 'low' | 'normal' | 'high'
}

const inputClass =
  'w-full px-3 py-2 border border-admin-border rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent'

/** Deliberately just one field required (title) — the point of a quick-
 * add form is to dump an idea in a few seconds, not fill out a form. */
export default function IdeaQuickAddForm({ onSubmit, isLoading }: { onSubmit: (data: IdeaQuickAddData) => Promise<void>; isLoading?: boolean }) {
  const [title, setTitle] = useState('')
  const [rawIdea, setRawIdea] = useState('')
  const [topic, setTopic] = useState('')
  const [pillar, setPillar] = useState('')
  const [hook, setHook] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Give the idea a short title')
      return
    }
    try {
      await onSubmit({ title, raw_idea: rawIdea, topic, content_pillar: pillar, possible_hook: hook, priority })
      setTitle('')
      setRawIdea('')
      setTopic('')
      setPillar('')
      setHook('')
      setPriority('normal')
      setExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save idea')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-admin-border bg-admin-surface p-4">
      {error && <div className="mb-3 rounded border border-red-900 bg-red-950/40 p-2 text-sm text-red-400">{error}</div>}
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          className={inputClass}
          placeholder="Quick-capture an idea…"
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={`${inputClass} w-32`}>
          <option value="low">low</option>
          <option value="normal">normal</option>
          <option value="high">high</option>
        </select>
        <Button type="submit" size="sm" disabled={isLoading} className="bg-admin-accent text-admin-accentText hover:bg-admin-accentHover">
          {isLoading ? '…' : 'Add'}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} className={inputClass} placeholder="Topic (optional)" />
          <input value={pillar} onChange={(e) => setPillar(e.target.value)} className={inputClass} placeholder="Content pillar (optional)" />
          <input value={hook} onChange={(e) => setHook(e.target.value)} className={inputClass} placeholder="Possible hook (optional)" />
          <textarea
            value={rawIdea}
            onChange={(e) => setRawIdea(e.target.value)}
            rows={2}
            className={`${inputClass} sm:col-span-3`}
            placeholder="Raw notes (optional)"
          />
        </div>
      )}
    </form>
  )
}
