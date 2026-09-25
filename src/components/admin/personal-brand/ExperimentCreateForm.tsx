'use client'

import { useState } from 'react'
import Button from '@/src/components/admin/AdminButton'

export interface ExperimentCreateData {
  name: string
  hypothesis: string
  variable_tested: string
  description: string
}

const inputClass =
  'w-full px-3 py-2 border border-admin-border rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent'

export default function ExperimentCreateForm({ onSubmit, isLoading }: { onSubmit: (data: ExperimentCreateData) => Promise<void>; isLoading?: boolean }) {
  const [name, setName] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [variableTested, setVariableTested] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    try {
      await onSubmit({ name, hypothesis, variable_tested: variableTested, description })
      setName('')
      setHypothesis('')
      setVariableTested('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create experiment')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-admin-border bg-admin-surface p-5">
      {error && <div className="mb-3 rounded border border-red-900 bg-red-950/40 p-2 text-sm text-red-400">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Experiment name *" required />
        <input value={variableTested} onChange={(e) => setVariableTested(e.target.value)} className={inputClass} placeholder="Variable tested (e.g. hook length)" />
      </div>
      <textarea
        value={hypothesis}
        onChange={(e) => setHypothesis(e.target.value)}
        rows={2}
        className={`${inputClass} mt-3`}
        placeholder="Hypothesis — what do you expect, and why?"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className={`${inputClass} mt-3`}
        placeholder="Description (optional)"
      />
      <Button type="submit" size="sm" disabled={isLoading} className="mt-3 bg-admin-accent text-admin-accentText hover:bg-admin-accentHover">
        {isLoading ? 'Creating…' : 'Create experiment'}
      </Button>
    </form>
  )
}
