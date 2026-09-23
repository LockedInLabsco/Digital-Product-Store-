import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'

/**
 * Per-waitlist signup analytics computed entirely from Supabase
 * `waitlist_entries` — the confirmed, ground-truth side of waitlist
 * analytics (see posthogServer.ts's getWaitlistBehaviorSummary for the
 * PostHog/behavioral side: visitors, funnel, attribution). Mirrors the
 * split businessAnalytics.ts already uses for the store-wide dashboard.
 */

export interface WaitlistEntryAnalytics {
  totalSignups: number
  signupsToday: number
  signupsThisWeek: number
  signupsInRange: number
  timeSeries: { date: string; signups: number }[]
  sourceBreakdown: { source: string; signups: number }[]
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

async function countSince(waitlistId: string, since: Date): Promise<number> {
  const { count, error } = await supabaseServer
    .from('waitlist_entries')
    .select('*', { count: 'exact', head: true })
    .eq('waitlist_id', waitlistId)
    .gte('created_at', since.toISOString())

  if (error) {
    console.error('[WaitlistAnalytics] Failed to count entries', error.message)
    return 0
  }
  return count || 0
}

// Capped like the admin entries endpoint's MAX_ENTRIES — the selected
// date range is expected to be a bounded window, not a whole waitlist's
// lifetime (that's `totalSignups`, an unbounded head-count below).
const MAX_RANGE_ENTRIES = 5000

export async function getWaitlistEntryAnalytics(
  waitlistId: string,
  from: Date,
  to: Date
): Promise<WaitlistEntryAnalytics> {
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000))

  const [totalSignups, signupsToday, signupsThisWeek, rangeResult] = await Promise.all([
    countSince(waitlistId, new Date(0)),
    countSince(waitlistId, todayStart),
    countSince(waitlistId, weekStart),
    supabaseServer
      .from('waitlist_entries')
      .select('created_at, source', { count: 'exact' })
      .eq('waitlist_id', waitlistId)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: true })
      .limit(MAX_RANGE_ENTRIES),
  ])

  if (rangeResult.error) {
    console.error('[WaitlistAnalytics] Failed to fetch entries in range', rangeResult.error.message)
    return { totalSignups, signupsToday, signupsThisWeek, signupsInRange: 0, timeSeries: [], sourceBreakdown: [] }
  }

  const rows = (rangeResult.data || []) as { created_at: string; source: string }[]
  const signupsInRange = rangeResult.count ?? rows.length

  const byDay = new Map<string, number>()
  const bySource = new Map<string, number>()
  for (const row of rows) {
    const day = row.created_at.slice(0, 10)
    byDay.set(day, (byDay.get(day) || 0) + 1)
    const source = row.source || 'unknown'
    bySource.set(source, (bySource.get(source) || 0) + 1)
  }

  const timeSeries = Array.from(byDay.entries())
    .map(([date, signups]) => ({ date, signups }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const sourceBreakdown = Array.from(bySource.entries())
    .map(([source, signups]) => ({ source, signups }))
    .sort((a, b) => b.signups - a.signups)

  return { totalSignups, signupsToday, signupsThisWeek, signupsInRange, timeSeries, sourceBreakdown }
}
