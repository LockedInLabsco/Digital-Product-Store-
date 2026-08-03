import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/src/lib/admin/auth'
import { isPostHogServerConfigured, listRecentSessionRecordings } from '@/src/lib/analytics/posthogServer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const postHogConfigured = isPostHogServerConfigured()
  const projectId = process.env.POSTHOG_PROJECT_ID
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '')
  const projectReplayUrl = projectId ? `${host}/project/${projectId}/replay` : null

  if (!postHogConfigured) {
    return NextResponse.json({
      postHogConfigured: false,
      postHogAvailable: false,
      recordings: [],
      projectReplayUrl,
    })
  }

  try {
    const result = await listRecentSessionRecordings(10)
    if (!result.ok) {
      console.error('[GET /api/admin/analytics/session-replays] PostHog configured but query failed:', result.error)
    }
    return NextResponse.json({
      postHogConfigured: true,
      postHogAvailable: result.ok,
      recordings: result.ok ? result.data : [],
      projectReplayUrl,
      postHogError: result.ok ? undefined : result.error,
    })
  } catch (error) {
    console.error('[GET /api/admin/analytics/session-replays] Exception', error)
    return NextResponse.json({ error: 'Failed to load session replays' }, { status: 500 })
  }
}
