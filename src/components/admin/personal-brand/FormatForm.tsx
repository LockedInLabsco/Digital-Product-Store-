'use client'

import { useState } from 'react'
import Button from '@/src/components/admin/AdminButton'

export interface FormatFormData {
  name: string
  description: string
  hook_structure: string
  body_structure: string
  cta_structure: string
  status: 'active' | 'retired'
  notes: string
}

const EMPTY: FormatFormData = {
  name: '',
  description: '',
  hook_structure: '',
  body_structure: '',
  cta_structure: '',
  status: 'active',
  notes: '',
}

const inputClass =
  'w-full px-3 py-2 border border-admin-border rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent'
const labelClass = 'block text-xs font-medium mb-1 text-admin-muted'

interface FormatFormProps {
  initialData?: Partial<FormatFormData>
  onSubmit: (data: FormatFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel: string
}

export default function FormatForm({ initialData, onSubmit, onCancel, isLoading, submitLabel }: FormatFormProps) {
  const [formData, setFormData] = useState<FormatFormData>({ ...EMPTY, ...initialData })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    try {
      await onSubmit(formData)
      setFormData(EMPTY)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save format')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-admin-border bg-admin-surface p-5">
      {error && <div className="mb-4 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{error}</div>}

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name *
          </label>
          <input id="name" name="name" value={formData.name} onChange={handleChange} className={inputClass} placeholder="Direct Promise -> Value -> CTA" required />
        </div>
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClass}>
            <option value="active">active</option>
            <option value="retired">retired</option>
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={2} className={inputClass} />
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="hook_structure" className={labelClass}>
            Hook structure
          </label>
          <textarea id="hook_structure" name="hook_structure" value={formData.hook_structure} onChange={handleChange} rows={2} className={inputClass} />
        </div>
        <div>
          <label htmlFor="body_structure" className={labelClass}>
            Body structure
          </label>
          <textarea id="body_structure" name="body_structure" value={formData.body_structure} onChange={handleChange} rows={2} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cta_structure" className={labelClass}>
            CTA structure
          </label>
          <textarea id="cta_structure" name="cta_structure" value={formData.cta_structure} onChange={handleChange} rows={2} className={inputClass} />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={2} className={inputClass} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" size="sm" disabled={isLoading} className="bg-admin-accent text-admin-accentText hover:bg-admin-accentHover">
          {isLoading ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
