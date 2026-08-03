import { NextRequest, NextResponse } from 'next/server'
import { parseAnalyticsRequest } from '@/src/lib/analytics/adminAnalyticsRequest'
import {
  isPostHogServerConfigured,
  getTopPages,
  getExitPages,
  getTopCtaClicks,
  getSectionEngagement,
} from '@/src/lib/analytics/posthogServer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const parsed = parseAnalyticsRequest(request)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  const postHogConfigured = isPostHogServerConfigured()

  if (!postHogConfigured) {
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      postHogConfigured: false,
      postHogAvailable: false,
      topPages: [],
      exitPages: [],
      topCtaClicks: [],
      sectionEngagement: [],
    })
  }

  try {
    const { from, to } = parsed.range
    const fromIso = from.toISOString()
    const toIso = to.toISOString()

    const [topPagesResult, exitPagesResult, ctaResult, sectionResult] = await Promise.all([
      getTopPages(fromIso, toIso),
      getExitPages(fromIso, toIso),
      getTopCtaClicks(fromIso, toIso),
      getSectionEngagement(fromIso, toIso),
    ])

    const allOk =
      topPagesResult.ok && exitPagesResult.ok && ctaResult.ok && sectionResult.ok

    const firstError = [topPagesResult, exitPagesResult, ctaResult, sectionResult].find(
      (r): r is { ok: false; error: string } => !r.ok
    )?.error
    if (firstError) {
      console.error('[GET /api/admin/analytics/engagement] PostHog configured but query failed:', firstError)
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      postHogConfigured: true,
      postHogAvailable: allOk,
      postHogError: firstError,
      topPages: topPagesResult.ok ? topPagesResult.data : [],
      exitPages: exitPagesResult.ok ? exitPagesResult.data : [],
      topCtaClicks: ctaResult.ok ? ctaResult.data : [],
      sectionEngagement: sectionResult.ok ? sectionResult.data : [],
    })
  } catch (error) {
    console.error('[GET /api/admin/analytics/engagement] Exception', error)
    return NextResponse.json({ error: 'Failed to load site engagement' }, { status: 500 })
  }
}
