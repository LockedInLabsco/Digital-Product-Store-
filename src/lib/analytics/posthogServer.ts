/**
 * Server-only PostHog query service. Uses the HogQL Query API and the
 * session recordings REST endpoint via plain fetch — no SDK needed for
 * read-only aggregate queries, and this keeps POSTHOG_PERSONAL_API_KEY
 * far away from any client bundle.
 *
 * Verified against a live PostHog project on 2026-08-03: the
 * `/api/projects/:id/query/` and `/api/projects/:id/session_recordings/`
 * endpoints and request shapes below are correct and reachable on both
 * the ingestion host and the app host — a 401 means the key itself is
 * invalid, and a 403 permission_denied means the key is valid but is
 * missing a scope (most commonly `query:read`), not that the endpoint
 * or request format is wrong. See the logging in postHogFetch() below
 * and docs/ANALYTICS_SETUP.md for exactly which scopes each feature
 * needs.
 */

import 'server-only'

const QUERY_TIMEOUT_MS = 8000

export function isPostHogServerConfigured(): boolean {
  return Boolean(process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID)
}

function getApiBase(): string {
  // Confirmed empirically: PostHog Cloud serves /api/projects/:id/query/
  // and /api/projects/:id/session_recordings/ identically from both the
  // ingestion host (us.i.posthog.com / eu.i.posthog.com) and the app
  // host (us.posthog.com / eu.posthog.com) — so reusing
  // NEXT_PUBLIC_POSTHOG_HOST here is fine and avoids a second env var.
  // Self-hosted instances that route these differently can still
  // override via NEXT_PUBLIC_POSTHOG_HOST.
  return (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '')
}

export type PostHogResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function postHogFetch(path: string, init?: RequestInit): Promise<PostHogResult<any>> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID

  if (!apiKey || !projectId) {
    return { ok: false, error: 'PostHog is not configured' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)

  try {
    const response = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      let parsedBody: { type?: string; code?: string; detail?: string } | null = null
      try {
        parsedBody = bodyText ? JSON.parse(bodyText) : null
      } catch {
        // PostHog error bodies are normally JSON; fall back to raw text below if not.
      }

      const detail = parsedBody?.detail || bodyText.slice(0, 300) || 'no response body'
      const reason = `PostHog request failed (${response.status}): ${detail}`

      console.error('[PostHog] Request failed', {
        path,
        status: response.status,
        code: parsedBody?.code,
        detail,
      })

      if (response.status === 401) {
        console.error(
          '[PostHog] 401 Unauthorized — POSTHOG_PERSONAL_API_KEY is missing, revoked, or wrong for this project. ' +
            'Check the key in PostHog under Settings -> Personal API Keys.'
        )
      } else if (response.status === 403 && parsedBody?.code === 'permission_denied') {
        console.error(
          `[PostHog] 403 permission_denied — the Personal API Key is valid but is missing a required scope for ${path}. ` +
            `PostHog says: "${detail}". Add the missing scope to the key in PostHog under ` +
            'Settings -> Personal API Keys -> (your key) -> edit scopes, then retry — no restart needed once granted.'
        )
      } else if (response.status === 404) {
        console.error(
          `[PostHog] 404 on ${path} — check POSTHOG_PROJECT_ID (${process.env.POSTHOG_PROJECT_ID}) matches the ` +
            'project this key belongs to, and that the endpoint still exists in the current PostHog API.'
        )
      }

      return { ok: false, error: reason }
    }

    const data = await response.json()
    return { ok: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PostHog] Request exception', { path, message })
    return { ok: false, error: message === 'The user aborted a request.' ? 'PostHog request timed out' : message }
  } finally {
    clearTimeout(timeout)
  }
}

async function hogQL(query: string): Promise<PostHogResult<any[]>> {
  const projectId = process.env.POSTHOG_PROJECT_ID
  const result = await postHogFetch(`/api/projects/${projectId}/query/`, {
    method: 'POST',
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  })

  if (!result.ok) return result
  const rows = result.data?.results
  if (!Array.isArray(rows)) {
    return { ok: false, error: 'Unexpected PostHog response shape' }
  }
  return { ok: true, data: rows }
}

// Date-range validation lives in ./dateRange.ts (resolveDateRange), used
// by every /api/admin/analytics/* route before any query in this file
// runs — the ISO strings passed into the HogQL queries below are always
// derived from a validated Date object, never raw request input.

export interface VisitorSummary {
  uniqueVisitors: number
  sessions: number
  pageViews: number
  avgSessionSeconds: number
  returningVisitorPercentage: number
}

export async function getVisitorSummary(
  from: string,
  to: string
): Promise<PostHogResult<VisitorSummary>> {
  const base = await hogQL(`
    SELECT
      count(DISTINCT person_id) AS unique_visitors,
      count(DISTINCT properties.$session_id) AS sessions,
      countIf(event = '$pageview') AS page_views
    FROM events
    WHERE timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
  `)
  if (!base.ok) return base

  const durationResult = await hogQL(`
    SELECT avg(duration_seconds) FROM (
      SELECT
        properties.$session_id AS session_id,
        dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds
      FROM events
      WHERE timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
        AND properties.$session_id IS NOT NULL
      GROUP BY session_id
    )
  `)

  const returningResult = await hogQL(`
    SELECT count(DISTINCT person_id) FROM events
    WHERE timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
      AND person_id IN (
        SELECT DISTINCT person_id FROM events WHERE timestamp < toDateTime('${from}')
      )
  `)

  const [uniqueVisitors, sessions, pageViews] = base.data[0] || [0, 0, 0]
  const avgSessionSeconds = durationResult.ok ? Number(durationResult.data[0]?.[0] || 0) : 0
  const returningVisitors = returningResult.ok ? Number(returningResult.data[0]?.[0] || 0) : 0

  return {
    ok: true,
    data: {
      uniqueVisitors: Number(uniqueVisitors || 0),
      sessions: Number(sessions || 0),
      pageViews: Number(pageViews || 0),
      avgSessionSeconds: Math.round(avgSessionSeconds),
      returningVisitorPercentage:
        Number(uniqueVisitors) > 0 ? Math.round((returningVisitors / Number(uniqueVisitors)) * 1000) / 10 : 0,
    },
  }
}

export interface DailyPoint {
  date: string
  visitors: number
  pageViews: number
}

export async function getVisitorsTimeSeries(
  from: string,
  to: string
): Promise<PostHogResult<DailyPoint[]>> {
  const result = await hogQL(`
    SELECT
      toDate(timestamp) AS day,
      count(DISTINCT person_id) AS visitors,
      countIf(event = '$pageview') AS page_views
    FROM events
    WHERE timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
    GROUP BY day
    ORDER BY day
  `)
  if (!result.ok) return result

  return {
    ok: true,
    data: result.data.map((row) => ({
      date: String(row[0]),
      visitors: Number(row[1] || 0),
      pageViews: Number(row[2] || 0),
    })),
  }
}

export interface TrafficSourceRow {
  source: string
  medium: string
  campaign: string
  visitors: number
}

export async function getTrafficSources(
  from: string,
  to: string
): Promise<PostHogResult<TrafficSourceRow[]>> {
  const result = await hogQL(`
    SELECT
      coalesce(nullIf(properties.utm_source, ''), 'direct') AS source,
      coalesce(nullIf(properties.utm_medium, ''), 'none') AS medium,
      coalesce(nullIf(properties.utm_campaign, ''), 'none') AS campaign,
      count(DISTINCT person_id) AS visitors
    FROM events
    WHERE event = '$pageview' AND timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
    GROUP BY source, medium, campaign
    ORDER BY visitors DESC
    LIMIT 25
  `)
  if (!result.ok) return result

  return {
    ok: true,
    data: result.data.map((row) => ({
      source: String(row[0]),
      medium: String(row[1]),
      campaign: String(row[2]),
      visitors: Number(row[3] || 0),
    })),
  }
}

export interface TopPageRow {
  path: string
  views: number
  visitors: number
}

export async function getTopPages(from: string, to: string): Promise<PostHogResult<TopPageRow[]>> {
  const result = await hogQL(`
    SELECT
      properties.$pathname AS path,
      count() AS views,
      count(DISTINCT person_id) AS visitors
    FROM events
    WHERE event = '$pageview' AND timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
    GROUP BY path
    ORDER BY views DESC
    LIMIT 15
  `)
  if (!result.ok) return result

  return {
    ok: true,
    data: result.data.map((row) => ({
      path: String(row[0] || 'unknown'),
      views: Number(row[1] || 0),
      visitors: Number(row[2] || 0),
    })),
  }
}

export interface ExitPageRow {
  path: string
  exits: number
}

/** Proxy metric: counts of $pageleave per path. Not a true last-page-of-session
 * calculation (that needs session-level ordering), documented as an approximation. */
export async function getExitPages(from: string, to: string): Promise<PostHogResult<ExitPageRow[]>> {
  const result = await hogQL(`
    SELECT properties.$pathname AS path, count() AS exits
    FROM events
    WHERE event = '$pageleave' AND timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
    GROUP BY path
    ORDER BY exits DESC
    LIMIT 10
  `)
  if (!result.ok) return result

  return {
    ok: true,
    data: result.data.map((row) => ({ path: String(row[0] || 'unknown'), exits: Number(row[1] || 0) })),
  }
}

export interface CtaClickRow {
  location: string
  clicks: number
}

export async function getTopCtaClicks(from: string, to: string): Promise<PostHogResult<CtaClickRow[]>> {
  const result = await hogQL(`
    SELECT coalesce(nullIf(properties.button_location, ''), 'unknown') AS location, count() AS clicks
    FROM events
    WHERE event IN ('navigation_clicked', 'hero_cta_clicked', 'product_card_clicked')
      AND timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
    GROUP BY location
    ORDER BY clicks DESC
    LIMIT 10
  `)
  if (!result.ok) return result

  return {
    ok: true,
    data: result.data.map((row) => ({ location: String(row[0]), clicks: Number(row[1] || 0) })),
  }
}

export interface SectionEngagementRow {
  sectionId: string
  views: number
  avgEngagedSeconds: number
}

export async function getSectionEngagement(
  from: string,
  to: string
): Promise<PostHogResult<SectionEngagementRow[]>> {
  const result = await hogQL(`
    SELECT
      properties.section_id AS section_id,
      count() AS views,
      avg(toFloat(properties.engaged_seconds)) AS avg_engaged_seconds
    FROM events
    WHERE event = 'section_engagement_completed'
      AND timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
    GROUP BY section_id
    ORDER BY views DESC
  `)
  if (!result.ok) return result

  return {
    ok: true,
    data: result.data.map((row) => ({
      sectionId: String(row[0] || 'unknown'),
      views: Number(row[1] || 0),
      avgEngagedSeconds: Math.round(Number(row[2] || 0)),
    })),
  }
}

export interface FunnelEntryCounts {
  productViews: number
  freeDownloadStarts: number
  paidCheckoutStarts: number
}

export async function getFunnelEntryCounts(
  from: string,
  to: string
): Promise<PostHogResult<FunnelEntryCounts>> {
  const result = await hogQL(`
    SELECT
      count(DISTINCT if(event = 'product_page_viewed', person_id, NULL)) AS product_viewers,
      count(DISTINCT if(event = 'free_download_started', person_id, NULL)) AS free_starters,
      count(DISTINCT if(event = 'paid_checkout_started', person_id, NULL)) AS checkout_starters
    FROM events
    WHERE event IN ('product_page_viewed', 'free_download_started', 'paid_checkout_started')
      AND timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
  `)
  if (!result.ok) return result

  const [productViews, freeDownloadStarts, paidCheckoutStarts] = result.data[0] || [0, 0, 0]
  return {
    ok: true,
    data: {
      productViews: Number(productViews || 0),
      freeDownloadStarts: Number(freeDownloadStarts || 0),
      paidCheckoutStarts: Number(paidCheckoutStarts || 0),
    },
  }
}

/** Product-page view counts keyed by product_slug, for joining against Supabase product rows. */
export async function getProductViewCounts(
  from: string,
  to: string
): Promise<PostHogResult<Map<string, number>>> {
  const result = await hogQL(`
    SELECT properties.product_slug AS slug, count() AS views
    FROM events
    WHERE event = 'product_page_viewed'
      AND timestamp >= toDateTime('${from}') AND timestamp <= toDateTime('${to}')
    GROUP BY slug
  `)
  if (!result.ok) return result

  const map = new Map<string, number>()
  for (const row of result.data) {
    if (row[0]) map.set(String(row[0]), Number(row[1] || 0))
  }
  return { ok: true, data: map }
}

export interface SessionRecordingSummary {
  id: string
  startTime: string | null
  durationSeconds: number | null
  personLabel: string | null
  url: string
}

/** Lists recent session recordings via the PostHog REST API (metadata
 * only) so the dashboard can link out to them — no replay is embedded. */
export async function listRecentSessionRecordings(
  limit = 10
): Promise<PostHogResult<SessionRecordingSummary[]>> {
  const projectId = process.env.POSTHOG_PROJECT_ID
  const result = await postHogFetch(
    `/api/projects/${projectId}/session_recordings/?limit=${limit}`
  )
  if (!result.ok) return result

  const results = Array.isArray(result.data?.results) ? result.data.results : []
  const host = getApiBase()

  return {
    ok: true,
    data: results.map((recording: any) => ({
      id: String(recording.id),
      startTime: recording.start_time || null,
      durationSeconds: typeof recording.recording_duration === 'number' ? recording.recording_duration : null,
      personLabel: recording.person?.name || recording.person?.distinct_ids?.[0] || null,
      url: `${host}/project/${projectId}/replay/${recording.id}`,
    })),
  }
}
