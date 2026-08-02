export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'custom'

export interface ResolvedDateRange {
  from: Date
  to: Date
  /** Same-length period immediately before `from`, for % change comparisons. */
  previousFrom: Date
  previousTo: Date
}

const MAX_CUSTOM_RANGE_DAYS = 366

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Parses and validates the dashboard's date-range query params. Returns
 * null for anything malformed so the caller can respond 400 rather than
 * run an unbounded or garbage query.
 */
export function resolveDateRange(params: {
  preset?: string | null
  from?: string | null
  to?: string | null
}): ResolvedDateRange | null {
  const now = new Date()
  const preset = (params.preset || '7d') as DateRangePreset

  if (preset === 'custom') {
    if (!params.from || !params.to) return null

    const from = startOfDay(new Date(params.from))
    const to = endOfDay(new Date(params.to))

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
    if (from > to) return null
    if (to > now) return null

    const rangeDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)
    if (rangeDays > MAX_CUSTOM_RANGE_DAYS) return null

    const spanMs = to.getTime() - from.getTime()
    return {
      from,
      to,
      previousFrom: new Date(from.getTime() - spanMs - 1),
      previousTo: new Date(from.getTime() - 1),
    }
  }

  const to = endOfDay(now)
  let from: Date

  switch (preset) {
    case 'today':
      from = startOfDay(now)
      break
    case '30d':
      from = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000))
      break
    case '90d':
      from = startOfDay(new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000))
      break
    case '7d':
    default:
      from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000))
      break
  }

  const spanMs = to.getTime() - from.getTime()
  return {
    from,
    to,
    previousFrom: new Date(from.getTime() - spanMs - 1),
    previousTo: new Date(from.getTime() - 1),
  }
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null // undefined/infinite change — treat as "no reliable comparison"
  return Math.round(((current - previous) / previous) * 1000) / 10
}
