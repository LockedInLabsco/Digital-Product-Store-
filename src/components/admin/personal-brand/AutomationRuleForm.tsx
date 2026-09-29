'use client'

import { useState } from 'react'
import Button from '@/src/components/admin/AdminButton'
import InstagramMediaPicker from '@/src/components/admin/personal-brand/InstagramMediaPicker'
import { IG_MATCH_TYPES, IG_TRIGGER_TYPES, type IgMatchType, type IgTriggerType } from '@/src/types/instagramAutomation'

export interface AutomationRuleFormData {
  name: string
  trigger_type: IgTriggerType
  keyword: string
  match_type: IgMatchType
  reply_message: string
  button_url: string
  button_label: string
  /** comment_keyword only — null means "any post." See
   * InstagramMediaPicker for the selector UI. */
  instagram_media_id: string | null
  /** comment_keyword only. public_reply_variations is always a
   * fixed-length-3 array in form state (unused slots are ''), one input
   * per slot — trimmed and filtered down before being sent to the API. */
  public_reply_enabled: boolean
  public_reply_variations: [string, string, string]
  is_active: boolean
}

const EMPTY: AutomationRuleFormData = {
  name: '',
  trigger_type: 'comment_keyword',
  keyword: '',
  match_type: 'contains',
  reply_message: '',
  button_url: '',
  button_label: '',
  instagram_media_id: null,
  public_reply_enabled: false,
  public_reply_variations: ['', '', ''],
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
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      // A post scope and public reply only make sense for comment_keyword
      // — drop them the moment the trigger type changes to anything else,
      // so a stale selection from before can never be submitted for the
      // wrong type.
      ...(name === 'trigger_type' && value !== 'comment_keyword'
        ? { instagram_media_id: null, public_reply_enabled: false, public_reply_variations: ['', '', ''] as [string, string, string] }
        : {}),
    }))
  }

  const handlePublicReplyVariationChange = (index: 0 | 1 | 2, value: string) => {
    setFormData((prev) => {
      const next = [...prev.public_reply_variations] as [string, string, string]
      next[index] = value
      return { ...prev, public_reply_variations: next }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.name.trim()) return setError('Name is required')
    if (!formData.reply_message.trim()) return setError('Reply message is required')
    if (formData.trigger_type !== 'story_reply' && !formData.keyword.trim()) {
      return setError('Keyword is required for this trigger type')
    }
    if (Boolean(formData.button_url.trim()) !== Boolean(formData.button_label.trim())) {
      return setError('A button needs both a URL and a label')
    }
    if (formData.public_reply_enabled && !formData.public_reply_variations.some((v) => v.trim())) {
      return setError('At least one public reply variation is required when public reply is enabled')
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

      {formData.trigger_type === 'comment_keyword' && (
        <div className="mb-3">
          <InstagramMediaPicker
            value={formData.instagram_media_id}
            onChange={(mediaId) => setFormData((prev) => ({ ...prev, instagram_media_id: mediaId }))}
          />
        </div>
      )}

      {formData.trigger_type === 'comment_keyword' && (
        <div className="mb-4 rounded border border-admin-border p-3">
          <div className="mb-2 flex items-center gap-2">
            <input
              id="public_reply_enabled"
              name="public_reply_enabled"
              type="checkbox"
              checked={formData.public_reply_enabled}
              onChange={handleChange}
            />
            <label htmlFor="public_reply_enabled" className="text-sm font-medium">
              Public Comment Reply
            </label>
          </div>
          <p className="mb-3 text-xs text-admin-muted">
            Also post a public reply on the triggering comment (e.g. &quot;Check your DMs 👀&quot;), alongside the
            private DM above. Add 2-3 variations to rotate between instead of always posting the same line.
          </p>
          {formData.public_reply_enabled && (
            <div className="space-y-2">
              {([0, 1, 2] as const).map((index) => (
                <div key={index}>
                  <label className={labelClass}>
                    Reply variation {index + 1} {index === 0 ? '*' : '(optional)'}
                  </label>
                  <input
                    value={formData.public_reply_variations[index]}
                    onChange={(e) => handlePublicReplyVariationChange(index, e.target.value)}
                    maxLength={300}
                    className={inputClass}
                    placeholder={index === 0 ? 'Check your DMs 👀' : index === 1 ? 'Sent it to you ✅' : 'Just messaged you'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="button_url" className={labelClass}>
            Button URL (optional)
          </label>
          <input
            id="button_url"
            name="button_url"
            value={formData.button_url}
            onChange={handleChange}
            className={inputClass}
            placeholder="https://..."
          />
        </div>
        <div>
          <label htmlFor="button_label" className={labelClass}>
            Button label (max 20 characters)
          </label>
          <input
            id="button_label"
            name="button_label"
            value={formData.button_label}
            onChange={handleChange}
            maxLength={20}
            className={inputClass}
            placeholder="Click me"
          />
        </div>
        <p className="text-xs text-admin-muted sm:col-span-2">
          Leave both blank to send plain text. Fill both in to show a tappable button under the message instead of a
          raw link.
        </p>
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
