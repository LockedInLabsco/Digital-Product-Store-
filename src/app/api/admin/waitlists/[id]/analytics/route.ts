import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { parseAnalyticsRequest } from '@/src/lib/analytics/adminAnalyticsRequest'
import { getWaitlistEntryAnalytics } from '@/src/lib/analytics/waitlistAnalytics'
import {
  isPostHogServerConfigured,
  getWaitlistBehaviorSummary,
  getWaitlistVisitorAttribution,
} from '@/src/lib/analytics/posthogServer'
import type { Waitlist } from '@/src/types/waitlist'

export const dynamic = 'force-dynamic'

/**
 * Per-waitlist analytics — Supabase for confirmed signup numbers
 * (waitlistAnalytics.ts), PostHog for behavioral/attribution data
 * (posthogServer.ts's getWaitlistBehaviorSummary/getWaitlistVisitorAttribution).
 * Same auth + date-range handling as every /api/admin/analytics/* route
 * (see parseAnalyticsRequest) — this just also scopes to one waitlist.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const parsed = await parseAnalyticsRequest(request)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  try {
    const { data: waitlistRow, error: waitlistError } = await supabaseServer
      .from('waitlists')
      .select('id, slug, name')
      .eq('id', params.id)
      .maybeSingle()

    if (waitlistError) {
      console.error('[GET /api/admin/waitlists/[id]/analytics] Failed to resolve waitlist', waitlistError.message)
      return NextResponse.json({ error: 'Failed to load waitlist' }, { status: 500 })
    }

    const waitlist = waitlistRow as Pick<Waitlist, 'id' | 'slug' | 'name'> | null
    if (!waitlist) {
      return NextResponse.json({ error: 'Waitlist not found' }, { status: 404 })
    }

    const { from, to } = parsed.range
    const fromIso = from.toISOString()
    const toIso = to.toISOString()
    const postHogConfigured = isPostHogServerConfigured()

    const [supabaseAnalytics, behaviorResult, attributionResult] = await Promise.all([
      getWaitlistEntryAnalytics(waitlist.id, from, to),
      postHogConfigured ? getWaitlistBehaviorSummary(waitlist.slug, fromIso, toIso) : Promise.resolve(null),
      postHogConfigured ? getWaitlistVisitorAttribution(waitlist.slug, fromIso, toIso) : Promise.resolve(null),
    ])

    const behavior = behaviorResult?.ok ? behaviorResult.data : null
    const attribution = attributionResult?.ok ? attributionResult.data : []
    const postHogAvailable = Boolean(behavior)
    const postHogError =
      postHogConfigured && !behavior && behaviorResult && !behaviorResult.ok ? behaviorResult.error : undefined

    if (postHogConfigured && postHogError) {
      console.error('[GET /api/admin/waitlists/[id]/analytics] PostHog configured but query failed:', postHogError)
    }

    // Conversion rate = confirmed signups in range (Supabase, ground
    // truth) / unique visitors to the waitlist page in range (PostHog,
    // via the waitlist_page_viewed event) — deliberately NOT raw
    // signup-start count. Null (not 0%) when visitor data isn't
    // available, so the UI can show "—" instead of a misleading number.
    const conversionRate =
      behavior && behavior.uniqueVisitors > 0
        ? Math.round((supabaseAnalytics.signupsInRange / behavior.uniqueVisitors) * 1000) / 10
        : null

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      waitlist: { id: waitlist.id, slug: waitlist.slug, name: waitlist.name },
      range: { from: fromIso, to: toIso },
      supabase: supabaseAnalytics,
      postHogConfigured,
      postHogAvailable,
      postHogError,
      behavior: {
        uniqueVisitors: behavior?.uniqueVisitors ?? null,
        signupStarted: behavior?.signupStarted ?? null,
        signupCompleted: behavior?.signupCompleted ?? null,
        signupFailed: behavior?.signupFailed ?? null,
        conversionRate,
        conversionRateDefinition: 'Signups in range (Supabase) ÷ unique waitlist-page visitors in range (PostHog)',
        visitorAttribution: attribution,
      },
    })
  } catch (error) {
    console.error('[GET /api/admin/waitlists/[id]/analytics] Exception', error)
    return NextResponse.json({ error: 'Failed to load waitlist analytics' }, { status: 500 })
  }
}
