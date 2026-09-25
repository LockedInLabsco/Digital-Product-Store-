'use client'

import { useState } from 'react'
import Button from '@/src/components/admin/AdminButton'
import type { ContentAnalysisResult } from '@/src/lib/ai/contentAnalysis'

function Section({ title, items, tone }: { title: string; items: string[]; tone: 'fact' | 'pattern' | 'hypothesis' | 'recommendation' }) {
  if (items.length === 0) return null

  const toneClass = {
    fact: 'border-l-admin-border',
    pattern: 'border-l-blue-500',
    hypothesis: 'border-l-yellow-500',
    recommendation: 'border-l-green-500',
  }[tone]

  return (
    <div className={`border-l-2 ${toneClass} pl-4`}>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-admin-muted">{title}</h4>
      <ul className="space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

/** Requests on-demand AI analysis for one content item — never runs
 * automatically, since every call spends real money and requires
 * personal_brand:ai specifically (checked server-side regardless of
 * whether this panel is even rendered). */
export default function AiAnalysisPanel({ contentId }: { contentId: string }) {
  const [analysis, setAnalysis] = useState<ContentAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/personal-brand/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: contentId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to run AI analysis')
      setAnalysis(result.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run AI analysis')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">AI Analysis</h3>
        <Button size="sm" onClick={handleAnalyze} disabled={isLoading}>
          {isLoading ? 'Analyzing…' : analysis ? 'Re-run analysis' : 'Run AI analysis'}
        </Button>
      </div>

      {error && <div className="mb-4 rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{error}</div>}

      {!analysis && !error && !isLoading && (
        <p className="text-sm text-admin-muted">
          Grounded in this post&apos;s actual recorded data and your account/format baselines — not generic advice.
        </p>
      )}

      {analysis && (
        <div className="space-y-4">
          <Section title="Facts" items={analysis.facts} tone="fact" />
          <Section title="Observed patterns" items={analysis.observedPatterns} tone="pattern" />
          <Section title="Hypotheses (unproven)" items={analysis.hypotheses} tone="hypothesis" />
          <Section title="Recommendations / tests" items={analysis.recommendations} tone="recommendation" />
        </div>
      )}
    </div>
  )
}
