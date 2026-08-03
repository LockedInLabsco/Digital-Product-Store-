'use client'

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

export default function StatCard({
  label,
  value,
  change,
  unavailable,
  unavailableLabel = 'Not configured',
  unavailableReason,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      {unavailable ? (
        <>
          <p className="mt-2 text-lg font-semibold text-gray-400">{unavailableLabel}</p>
          {unavailableReason && (
            <p className="mt-1 text-xs text-gray-400" title={unavailableReason}>
              {unavailableReason.length > 90 ? `${unavailableReason.slice(0, 90)}…` : unavailableReason}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {typeof change === 'number' && (
            <p className={`mt-1 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs previous period
            </p>
          )}
        </>
      )}
    </div>
  )
}
