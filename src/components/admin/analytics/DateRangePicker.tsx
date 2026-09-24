'use client'

export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'custom'

interface DateRangePickerProps {
  preset: RangePreset
  customFrom: string
  customTo: string
  onPresetChange: (preset: RangePreset) => void
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
  onRefresh: () => void
  isRefreshing: boolean
  lastRefreshed: string | null
}

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]

export default function DateRangePicker({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  onRefresh,
  isRefreshing,
  lastRefreshed,
}: DateRangePickerProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onPresetChange(p.value)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === p.value
                ? 'bg-admin-accent text-admin-accentText'
                : 'border border-admin-border text-admin-muted hover:border-admin-text'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="rounded border border-admin-border px-2 py-1.5 text-sm"
              aria-label="Custom range start date"
            />
            <span className="text-sm text-admin-muted">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="rounded border border-admin-border px-2 py-1.5 text-sm"
              aria-label="Custom range end date"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {lastRefreshed && (
          <span className="text-xs text-admin-muted">
            Last refreshed {new Date(lastRefreshed).toLocaleTimeString()}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="rounded border border-admin-border px-3 py-1.5 text-sm font-medium hover:border-admin-text disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}
