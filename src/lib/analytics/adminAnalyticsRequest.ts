import 'server-only'
import { NextRequest } from 'next/server'
import { isAdminRequest } from '@/src/lib/admin/auth'
import { resolveDateRange, ResolvedDateRange } from './dateRange'

export type AnalyticsRequestResult =
  | { ok: true; range: ResolvedDateRange; searchParams: URLSearchParams }
  | { ok: false; status: number; error: string }

/**
 * Every /api/admin/analytics/* route starts with this: server-side auth
 * (never just "hidden in the UI"), then a validated date range so no
 * route can be tricked into an unbounded or malformed query.
 */
export function parseAnalyticsRequest(request: NextRequest): AnalyticsRequestResult {
  if (!isAdminRequest(request)) {
    return { ok: false, status: 401, error: 'Unauthorized' }
  }

  const { searchParams } = new URL(request.url)
  const range = resolveDateRange({
    preset: searchParams.get('range'),
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  })

  if (!range) {
    return { ok: false, status: 400, error: 'Invalid or out-of-bounds date range' }
  }

  return { ok: true, range, searchParams }
}
