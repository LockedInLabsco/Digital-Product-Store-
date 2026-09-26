'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  change?: number | null
  unavailable?: boolean
  /** Shown as the headline when unavailable — "Not configured" if env vars are
   * missing, "Unavailable" if PostHog is configured but a query failed. */
  unavailableLabel?: string
  unavailableReason?: string
}

// Status colors, not the categorical chart palette — reserved so a
// delta's meaning is never confused with a series identity elsewhere on
// the same page. Same hex values used for every up/down indicator across
// the admin (see src/lib/instagram/... rate displays for the analytics
// equivalent) so "good" and "bad" always mean the same color everywhere.
const STATUS_GOOD = '#0ca30c'
const STATUS_CRITICAL = '#e66767'

export default function StatCard({
  label,
  value,
  change,
  unavailable,
  unavailableLabel = 'Not configured',
  unavailableReason,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface p-5 transition-colors hover:border-admin-faint">
      <p className="text-xs font-semibold uppercase tracking-wide text-admin-muted">{label}</p>
      {unavailable ? (
        <>
          <p className="mt-3 text-lg font-semibold text-admin-faint">{unavailableLabel}</p>
          {unavailableReason && (
            <p className="mt-1 text-xs text-admin-faint" title={unavailableReason}>
              {unavailableReason.length > 90 ? `${unavailableReason.slice(0, 90)}…` : unavailableReason}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-3 text-[1.75rem] font-bold leading-none tracking-tight">{value}</p>
          {typeof change === 'number' && (
            <p
              className="mt-2 flex items-center gap-1 text-xs font-medium"
              style={{ color: change >= 0 ? STATUS_GOOD : STATUS_CRITICAL }}
            >
              {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(change)}% vs previous period
            </p>
          )}
        </>
      )}
    </div>
  )
}
