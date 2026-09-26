'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import AutomationRuleForm, { type AutomationRuleFormData } from '@/src/components/admin/personal-brand/AutomationRuleForm'
import type { IgAutomationFollowup, IgAutomationRule, IgAutomationRun } from '@/src/types/instagramAutomation'

interface RuleRow extends IgAutomationRule {
  followups: IgAutomationFollowup[]
}

interface RunRow extends IgAutomationRun {
  rule_name: string | null
}

const TRIGGER_LABELS: Record<string, string> = {
  comment_keyword: 'Comment keyword',
  dm_keyword: 'DM keyword',
  story_reply: 'Story reply',
}

interface FollowupFormValues {
  delayHours: number
  message: string
  buttonUrl: string | null
  buttonLabel: string | null
}

function FollowupForm({ nextStep, onAdd }: { nextStep: number; onAdd: (values: FollowupFormValues) => Promise<void> }) {
  const [delayHours, setDelayHours] = useState('24')
  const [message, setMessage] = useState('')
  const [buttonUrl, setButtonUrl] = useState('')
  const [buttonLabel, setButtonLabel] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const hours = Number(delayHours)
    if (!Number.isFinite(hours) || hours <= 0) return setError('Delay hours must be a positive number')
    if (!message.trim()) return setError('Message is required')
    if (Boolean(buttonUrl.trim()) !== Boolean(buttonLabel.trim())) return setError('A button needs both a URL and a label')
    setIsSaving(true)
    try {
      await onAdd({
        delayHours: hours,
        message: message.trim(),
        buttonUrl: buttonUrl.trim() || null,
        buttonLabel: buttonLabel.trim() || null,
      })
      setMessage('')
      setDelayHours('24')
      setButtonUrl('')
      setButtonLabel('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add follow-up')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded border border-admin-border bg-admin-bg p-3">
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="w-24 shrink-0">
          <label className="mb-1 block text-xs text-admin-muted">Step {nextStep} · hours after</label>
          <input
            type="number"
            min={1}
            value={delayHours}
            onChange={(e) => setDelayHours(e.target.value)}
            className="w-full rounded border border-admin-border bg-transparent px-2 py-1 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-admin-muted">Follow-up message</label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded border border-admin-border bg-transparent px-2 py-1 text-sm"
            placeholder="Just checking you saw this — any questions?"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-admin-muted">Button URL (optional)</label>
          <input
            value={buttonUrl}
            onChange={(e) => setButtonUrl(e.target.value)}
            className="w-full rounded border border-admin-border bg-transparent px-2 py-1 text-sm"
            placeholder="https://..."
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-admin-muted">Button label (max 20 chars)</label>
          <input
            value={buttonLabel}
            onChange={(e) => setButtonLabel(e.target.value)}
            maxLength={20}
            className="w-full rounded border border-admin-border bg-transparent px-2 py-1 text-sm"
            placeholder="Click me"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={isSaving}>
          {isSaving ? 'Adding…' : '+ Add step'}
        </Button>
      </div>
    </form>
  )
}

export default function AutomationsClient() {
  const router = useRouter()
  const [rules, setRules] = useState<RuleRow[]>([])
  const [runs, setRuns] = useState<RunRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    try {
      setIsLoading(true)
      const [rulesRes, runsRes] = await Promise.all([
        fetch('/api/admin/personal-brand/automations'),
        fetch('/api/admin/personal-brand/automations/runs'),
      ])

      if (rulesRes.status === 401) {
        router.push('/admin/login')
        return
      }

      const rulesData = await rulesRes.json()
      if (!rulesRes.ok) throw new Error(rulesData.error || 'Failed to load automations')
      setRules(rulesData.rules || [])

      if (runsRes.ok) {
        const runsData = await runsRes.json()
        setRuns(runsData.runs || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (data: AutomationRuleFormData) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/personal-brand/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          keyword: data.keyword || null,
          button_url: data.button_url || null,
          button_label: data.button_label || null,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create automation rule')
      setShowForm(false)
      await load()
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (rule: RuleRow) => {
    setBusyId(rule.id)
    try {
      const response = await fetch(`/api/admin/personal-brand/automations/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rule.name,
          trigger_type: rule.trigger_type,
          keyword: rule.keyword,
          match_type: rule.match_type,
          reply_message: rule.reply_message,
          button_url: rule.button_url,
          button_label: rule.button_label,
          is_active: !rule.is_active,
        }),
      })
      if (!response.ok) throw new Error('Failed to update rule')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteRule = async (rule: RuleRow) => {
    if (!confirm(`Delete "${rule.name}"? This also deletes its follow-up sequence and stops any in-progress runs.`)) return
    setBusyId(rule.id)
    try {
      const response = await fetch(`/api/admin/personal-brand/automations/${rule.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete rule')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    } finally {
      setBusyId(null)
    }
  }

  const handleAddFollowup = async (rule: RuleRow, values: FollowupFormValues) => {
    const nextStep = rule.followups.length + 1
    const response = await fetch(`/api/admin/personal-brand/automations/${rule.id}/followups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step_order: nextStep,
        delay_hours: values.delayHours,
        message: values.message,
        button_url: values.buttonUrl,
        button_label: values.buttonLabel,
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to add follow-up')
    await load()
  }

  const handleDeleteFollowup = async (rule: RuleRow, followupId: string) => {
    setBusyId(followupId)
    try {
      const response = await fetch(`/api/admin/personal-brand/automations/${rule.id}/followups/${followupId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete follow-up')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete follow-up')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-5xl">
          <PersonalBrandTabs />

          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold">DM Automations</h2>
              <p className="text-admin-muted">
                Comment-to-DM, inbound DM keywords, and story-reply auto-replies, with optional follow-up sequences —
                runs on your own Instagram account via Meta&apos;s official Messaging API.
              </p>
            </div>
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : '+ New Rule'}</Button>
          </div>

          {showForm && (
            <div className="mb-8">
              <AutomationRuleForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isLoading={isSaving} submitLabel="Create rule" />
            </div>
          )}

          {error && <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}
          {isLoading && <p className="text-admin-muted">Loading…</p>}

          {!isLoading && rules.length === 0 && !error && (
            <div className="mb-10 rounded-lg border border-admin-border bg-admin-surface p-8 text-center text-admin-muted">
              No automation rules yet — create one to start auto-replying to comments and DMs.
            </div>
          )}

          <div className="mb-10 space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-admin-border bg-admin-surface p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{rule.name}</h3>
                      <span className="rounded-full bg-admin-surface2 px-2 py-0.5 text-xs font-medium">
                        {TRIGGER_LABELS[rule.trigger_type]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${rule.is_active ? 'bg-green-950/40 text-green-400' : 'bg-admin-surface2 text-admin-muted'}`}
                      >
                        {rule.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-admin-muted">
                      {rule.keyword ? (
                        <>
                          Keyword: <strong className="text-admin-text">{rule.keyword}</strong> ({rule.match_type})
                        </>
                      ) : (
                        'Matches any text'
                      )}
                    </p>
                    <p className="mt-2 text-sm">{rule.reply_message}</p>
                    {rule.button_url && (
                      <p className="mt-1 text-xs text-admin-muted">
                        Button: <strong className="text-admin-text">{rule.button_label}</strong> → {rule.button_url}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      disabled={busyId === rule.id}
                      className="text-sm font-medium text-admin-text hover:text-admin-muted disabled:opacity-50"
                    >
                      {rule.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule)}
                      disabled={busyId === rule.id}
                      className="text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 border-t border-admin-border pt-4">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-admin-muted">Follow-up sequence</h4>
                  {rule.followups.length === 0 ? (
                    <p className="text-sm text-admin-muted">No follow-ups — only the initial reply is sent.</p>
                  ) : (
                    <ul className="space-y-2">
                      {rule.followups.map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-4 rounded border border-admin-border bg-admin-bg px-3 py-2 text-sm">
                          <span>
                            <strong>Step {f.step_order}</strong> · {f.delay_hours}h after previous · {f.message}
                            {f.button_url && (
                              <>
                                {' '}
                                · button <strong>{f.button_label}</strong>
                              </>
                            )}
                          </span>
                          <button
                            onClick={() => handleDeleteFollowup(rule, f.id)}
                            disabled={busyId === f.id}
                            className="shrink-0 text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <FollowupForm nextStep={rule.followups.length + 1} onAdd={(values) => handleAddFollowup(rule, values)} />
                </div>
              </div>
            ))}
          </div>

          <section>
            <h3 className="mb-4 text-lg font-bold">Recent activity</h3>
            {runs.length === 0 ? (
              <div className="rounded-lg border border-admin-border bg-admin-surface p-6 text-center text-sm text-admin-muted">
                Nothing has triggered yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-admin-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-admin-border bg-admin-surface">
                      <th className="px-3 py-2 text-left font-semibold">When</th>
                      <th className="px-3 py-2 text-left font-semibold">Rule</th>
                      <th className="px-3 py-2 text-left font-semibold">Source</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id} className="border-b border-admin-border bg-admin-surface hover:bg-admin-surface2">
                        <td className="px-3 py-2">{new Date(run.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{run.rule_name || '—'}</td>
                        <td className="px-3 py-2 capitalize">{run.source_type}</td>
                        <td className="px-3 py-2">
                          {run.last_error ? (
                            <span className="text-red-400" title={run.last_error}>
                              Failed
                            </span>
                          ) : run.completed ? (
                            <span className="text-admin-muted">Completed</span>
                          ) : (
                            <span className="text-green-400">In sequence (step {run.next_step} due)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </Container>
    </main>
  )
}
