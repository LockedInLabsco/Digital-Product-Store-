'use client'

import { useState } from 'react'
import Button from '@/src/components/admin/AdminButton'
import { IG_MATCH_TYPES, IG_TRIGGER_TYPES, type IgMatchType, type IgTriggerType } from '@/src/types/instagramAutomation'

export interface AutomationRuleFormData {
  name: string
  trigger_type: IgTriggerType
  keyword: string
  match_type: IgMatchType
  reply_message: string
  is_active: boolean
}

const EMPTY: AutomationRuleFormData = {
  name: '',
  trigger_type: 'comment_keyword',
  keyword: '',
  match_type: 'contains',
  reply_message: '',
  is_active: true,
}

const TRIGGER_LABELS: Record<IgTriggerType, string> = {
  comment_keyword: 'Someone comments a keyword',
  dm_keyword: 'Someone DMs a keyword',
  story_reply: 'Someone replies to a Story',
}

const inputClass =
  'w-full px-3 py-2 border border-admin-border rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent'
const labelClass = 'block text-xs font-medium mb-1 text-admin-muted'

interface AutomationRuleFormProps {
  initialData?: Partial<AutomationRuleFormData>
  onSubmit: (data: AutomationRuleFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel: string
}

export default function AutomationRuleForm({ initialData, onSubmit, onCancel, isLoading, submitLabel }: AutomationRuleFormProps) {
  const [formData, setFormData] = useState<AutomationRuleFormData>({ ...EMPTY, ...initialData })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.name.trim()) return setError('Name is required')
    if (!formData.reply_message.trim()) return setError('Reply message is required')
    if (formData.trigger_type !== 'story_reply' && !formData.keyword.trim()) {
      return setError('Keyword is required for this trigger type')
    }
    try {
      await onSubmit(formData)
      setFormData(EMPTY)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save automation rule')
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
          <input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={inputClass}
            placeholder="Send the freebie link"
            required
          />
        </div>
        <div>
          <label htmlFor="trigger_type" className={labelClass}>
            Trigger
          </label>
          <select id="trigger_type" name="trigger_type" value={formData.trigger_type} onChange={handleChange} className={inputClass}>
            {IG_TRIGGER_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="keyword" className={labelClass}>
            Keyword {formData.trigger_type === 'story_reply' ? '(optional — blank matches any reply)' : '*'}
          </label>
          <input
            id="keyword"
            name="keyword"
            value={formData.keyword}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. LINK"
          />
        </div>
        <div>
          <label htmlFor="match_type" className={labelClass}>
            Match type
          </label>
          <select id="match_type" name="match_type" value={formData.match_type} onChange={handleChange} className={inputClass}>
            {IG_MATCH_TYPES.map((m) => (
              <option key={m} value={m}>
                {m === 'contains' ? 'Contains the keyword' : 'Exactly matches the keyword'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="reply_message" className={labelClass}>
          Reply message *
        </label>
        <textarea
          id="reply_message"
          name="reply_message"
          value={formData.reply_message}
          onChange={handleChange}
          rows={3}
          className={inputClass}
          placeholder="Thanks for commenting! Here's the link: ..."
          required
        />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input id="is_active" name="is_active" type="checkbox" checked={formData.is_active} onChange={handleChange} />
        <label htmlFor="is_active" className="text-sm">
          Active
        </label>
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
