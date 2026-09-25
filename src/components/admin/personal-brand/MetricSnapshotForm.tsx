'use client'

import { useState } from 'react'
import Button from '@/src/components/admin/AdminButton'

export interface MetricSnapshotFormData {
  recorded_at: string
  views: string
  reach: string
  likes: string
  comments: string
  shares: string
  saves: string
  followers_gained: string
  profile_visits: string
  dms_generated: string
  watch_time_seconds: string
  average_watch_time_seconds: string
  completion_rate: string
}

const EMPTY: MetricSnapshotFormData = {
  recorded_at: '',
  views: '',
  reach: '',
  likes: '',
  comments: '',
  shares: '',
  saves: '',
  followers_gained: '',
  profile_visits: '',
  dms_generated: '',
  watch_time_seconds: '',
  average_watch_time_seconds: '',
  completion_rate: '',
}

const inputClass =
  'w-full px-3 py-2 border border-admin-border rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent'
const labelClass = 'block text-xs font-medium mb-1 text-admin-muted'

const NUMERIC_FIELDS: { key: keyof MetricSnapshotFormData; label: string }[] = [
  { key: 'views', label: 'Views' },
  { key: 'reach', label: 'Reach' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'saves', label: 'Saves' },
  { key: 'followers_gained', label: 'Followers gained' },
  { key: 'profile_visits', label: 'Profile visits' },
  { key: 'dms_generated', label: 'DMs generated' },
  { key: 'watch_time_seconds', label: 'Total watch time (s)' },
  { key: 'average_watch_time_seconds', label: 'Avg watch time (s)' },
]

interface MetricSnapshotFormProps {
  onSubmit: (data: MetricSnapshotFormData) => Promise<void>
  isLoading?: boolean
}

/** Not every metric is entered every time — leave what you don't have
 * blank, it's saved as null, never coerced to zero. */
export default function MetricSnapshotForm({ onSubmit, isLoading }: MetricSnapshotFormProps) {
  const [formData, setFormData] = useState<MetricSnapshotFormData>(EMPTY)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await onSubmit(formData)
      setFormData(EMPTY)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save snapshot')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-admin-border bg-admin-surface p-5">
      <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-admin-muted">Add metrics snapshot</h4>
      {error && <div className="mb-4 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{error}</div>}

      <div className="mb-4">
        <label htmlFor="recorded_at" className={labelClass}>
          Recorded at (defaults to now)
        </label>
        <input
          id="recorded_at"
          name="recorded_at"
          type="datetime-local"
          value={formData.recorded_at}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {NUMERIC_FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key} className={labelClass}>
              {field.label}
            </label>
            <input
              id={field.key}
              name={field.key}
              type="number"
              min={0}
              value={formData[field.key]}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        ))}
        <div>
          <label htmlFor="completion_rate" className={labelClass}>
            Completion rate (0-1)
          </label>
          <input
            id="completion_rate"
            name="completion_rate"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={formData.completion_rate}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      <Button type="submit" size="sm" disabled={isLoading} className="mt-4 bg-admin-accent text-admin-accentText hover:bg-admin-accentHover">
        {isLoading ? 'Saving…' : 'Save snapshot'}
      </Button>
    </form>
  )
}
