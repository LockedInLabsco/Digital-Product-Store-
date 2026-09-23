import 'server-only'
import { NextRequest } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { resolveDateRange, ResolvedDateRange } from './dateRange'

export type AnalyticsRequestResult =
  | { ok: true; range: ResolvedDateRange; searchParams: URLSearchParams }
  | { ok: false; status: number; error: string }

/**
 * Every /api/admin/analytics/* route starts with this: server-side
 * authorization (never just "hidden in the UI") requiring analytics:read,
 * then a validated date range so no route can be tricked into an
 * unbounded or malformed query.
 */
export async function parseAnalyticsRequest(request: NextRequest): Promise<AnalyticsRequestResult> {
  const auth = await requirePermission('analytics:read')
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error }
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
