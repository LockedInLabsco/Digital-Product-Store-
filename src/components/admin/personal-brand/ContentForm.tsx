'use client'

import { useState } from 'react'
import Button from '@/src/components/admin/AdminButton'
import {
  PB_CONTENT_STATUSES,
  PB_CONTENT_TYPES,
  PB_PLATFORMS,
  type PbContentStatus,
  type PbContentType,
  type PbFormat,
  type PbPlatform,
} from '@/src/types/personalBrand'

export interface ContentFormData {
  platform: PbPlatform
  content_type: PbContentType
  status: PbContentStatus
  title: string
  hook: string
  caption: string
  script: string
  transcript: string
  cta: string
  topic: string
  content_pillar: string
  goal: string
  format_id: string
  audio_used: string
  duration_seconds: string
  posted_at: string
  platform_url: string
  thumbnail_path: string
  notes: string
  tags: string
}

const inputClass =
  'w-full px-4 py-2 border border-admin-border rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-admin-accent'
const labelClass = 'block text-sm font-medium mb-2'

interface ContentFormProps {
  initialData?: Partial<ContentFormData>
  formats: PbFormat[]
  onSubmit: (data: ContentFormData) => Promise<void>
  isLoading?: boolean
  submitLabel: string
}

export default function ContentForm({ initialData, formats, onSubmit, isLoading, submitLabel }: ContentFormProps) {
  const [formData, setFormData] = useState<ContentFormData>({
    platform: initialData?.platform || 'instagram',
    content_type: initialData?.content_type || 'reel',
    status: initialData?.status || 'draft',
    title: initialData?.title || '',
    hook: initialData?.hook || '',
    caption: initialData?.caption || '',
    script: initialData?.script || '',
    transcript: initialData?.transcript || '',
    cta: initialData?.cta || '',
    topic: initialData?.topic || '',
    content_pillar: initialData?.content_pillar || '',
    goal: initialData?.goal || '',
    format_id: initialData?.format_id || '',
    audio_used: initialData?.audio_used || '',
    duration_seconds: initialData?.duration_seconds || '',
    posted_at: initialData?.posted_at || '',
    platform_url: initialData?.platform_url || '',
    thumbnail_path: initialData?.thumbnail_path || '',
    notes: initialData?.notes || '',
    tags: initialData?.tags || '',
  })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content item')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}

      <div>
        <h3 className="mb-6 text-lg font-bold">Basics</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className={labelClass}>
              Title
            </label>
            <input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={inputClass}
              placeholder="Internal working title"
            />
          </div>
          <div>
            <label htmlFor="platform" className={labelClass}>
              Platform
            </label>
            <select id="platform" name="platform" value={formData.platform} onChange={handleChange} className={inputClass}>
              {PB_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="content_type" className={labelClass}>
              Content type *
            </label>
            <select
              id="content_type"
              name="content_type"
              value={formData.content_type}
              onChange={handleChange}
              className={inputClass}
              required
            >
              {PB_CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClass}>
              {PB_CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="format_id" className={labelClass}>
              Format
            </label>
            <select id="format_id" name="format_id" value={formData.format_id} onChange={handleChange} className={inputClass}>
              <option value="">None</option>
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audio_used" className={labelClass}>
              Audio / sound used
            </label>
            <input
              id="audio_used"
              name="audio_used"
              value={formData.audio_used}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. original audio, or the trending sound's name"
            />
          </div>
          <div>
            <label htmlFor="duration_seconds" className={labelClass}>
              Duration (seconds)
            </label>
            <input
              id="duration_seconds"
              name="duration_seconds"
              type="number"
              min={0}
              value={formData.duration_seconds}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="posted_at" className={labelClass}>
              Posted at
            </label>
            <input
              id="posted_at"
              name="posted_at"
              type="datetime-local"
              value={formData.posted_at}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="platform_url" className={labelClass}>
              Platform URL
            </label>
            <input
              id="platform_url"
              name="platform_url"
              value={formData.platform_url}
              onChange={handleChange}
              className={inputClass}
              placeholder="https://instagram.com/reel/..."
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="thumbnail_path" className={labelClass}>
              Thumbnail URL (optional)
            </label>
            <input
              id="thumbnail_path"
              name="thumbnail_path"
              value={formData.thumbnail_path}
              onChange={handleChange}
              className={inputClass}
              placeholder="Paste an image URL — private file upload is a later stage"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-6 text-lg font-bold">Classification</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="topic" className={labelClass}>
              Topic
            </label>
            <input id="topic" name="topic" value={formData.topic} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label htmlFor="content_pillar" className={labelClass}>
              Content pillar
            </label>
            <input
              id="content_pillar"
              name="content_pillar"
              value={formData.content_pillar}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="goal" className={labelClass}>
              Goal
            </label>
            <input id="goal" name="goal" value={formData.goal} onChange={handleChange} className={inputClass} placeholder="e.g. follower acquisition" />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="tags" className={labelClass}>
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className={inputClass}
              placeholder="discipline, habits, morning-routine"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-6 text-lg font-bold">Copy</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="hook" className={labelClass}>
              Hook
            </label>
            <textarea id="hook" name="hook" value={formData.hook} onChange={handleChange} rows={2} className={inputClass} />
          </div>
          <div>
            <label htmlFor="cta" className={labelClass}>
              CTA
            </label>
            <input id="cta" name="cta" value={formData.cta} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label htmlFor="caption" className={labelClass}>
              Caption
            </label>
            <textarea id="caption" name="caption" value={formData.caption} onChange={handleChange} rows={4} className={inputClass} />
          </div>
          <div>
            <label htmlFor="script" className={labelClass}>
              Script
            </label>
            <textarea id="script" name="script" value={formData.script} onChange={handleChange} rows={4} className={inputClass} />
          </div>
          <div>
            <label htmlFor="transcript" className={labelClass}>
              Transcript
            </label>
            <textarea
              id="transcript"
              name="transcript"
              value={formData.transcript}
              onChange={handleChange}
              rows={4}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes
            </label>
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} className={inputClass} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="bg-admin-accent text-admin-accentText hover:bg-admin-accentHover">
        {isLoading ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
