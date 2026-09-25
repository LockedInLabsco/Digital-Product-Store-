'use client'

import { useState } from 'react'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import type { PlannerRecommendation } from '@/src/lib/ai/planner'

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-admin-muted">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  )
}

export default function PlannerClient() {
  const [plan, setPlan] = useState<PlannerRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/personal-brand/ai/planner', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to generate a plan')
      setPlan(result.plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate a plan')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-3xl">
          <PersonalBrandTabs />

          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold">AI Planner</h2>
              <p className="text-admin-muted">What to post next — grounded in your own Content OS, not generic advice.</p>
            </div>
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? 'Thinking…' : plan ? 'Generate again' : 'Generate recommendation'}
            </Button>
          </div>

          {error && <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}

          {!plan && !error && !isLoading && (
            <div className="rounded-lg border border-admin-border bg-admin-surface p-8 text-center text-admin-muted">
              Click &quot;Generate recommendation&quot; to get a suggestion based on your winning formats, ideas, and recent
              performance.
            </div>
          )}

          {plan && !plan.hasEnoughData && (
            <div className="rounded-lg border border-admin-border bg-admin-surface2 p-6 text-sm text-admin-muted">
              Not enough historical data yet to ground a real recommendation.
              <p className="mt-2">{plan.why}</p>
              <p className="mt-4">
                Log more{' '}
                <Link href="/admin/personal-brand/content" className="text-admin-text underline">
                  posted content with metrics
                </Link>{' '}
                to unlock the planner.
              </p>
            </div>
          )}

          {plan && plan.hasEnoughData && (
            <div className="space-y-6 rounded-lg border border-admin-border bg-admin-surface p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Content type" value={plan.contentType} />
                <Field label="Goal" value={plan.goal} />
                <Field label="Format" value={plan.format} />
                <Field label="Topic" value={plan.topic} />
              </div>
              <div className="border-t border-admin-border pt-4">
                <Field label="Why" value={plan.why} />
              </div>
              <Field label="Suggested hook" value={plan.suggestedHook} />
              <Field label="Suggested structure" value={plan.suggestedStructure} />
              <Field label="Experiment opportunity" value={plan.experimentOpportunity} />
            </div>
          )}
        </div>
      </Container>
    </main>
  )
}
