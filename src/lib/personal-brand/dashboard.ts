import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { baselineFromRows, buildFormatEvidence, buildPerformanceRows, type FormatEvidence, type PerformanceRow } from './formatEvidence'
import { percentVsBaseline } from './baselines'
import type { PbBaseline, PbContentItem, PbContentMetric, PbExperiment, PbFormat, PbIdea } from '@/src/types/personalBrand'

const RECENT_WINDOW_DAYS = 30
const TOP_N = 5

async function fetchAllContentWithMetrics(): Promise<{ items: PbContentItem[]; metricsByContentId: Record<string, PbContentMetric[]> }> {
  const { data: items, error } = await supabaseServer
    .from('pb_content_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Personal Brand Dashboard] Failed to fetch content items', error.message)
    return { items: [], metricsByContentId: {} }
  }

  const contentIds = (items || []).map((i) => i.id)
  const metricsByContentId: Record<string, PbContentMetric[]> = {}

  if (contentIds.length > 0) {
    const { data: metrics, error: metricsError } = await supabaseServer
      .from('pb_content_metrics')
      .select('*')
      .in('content_id', contentIds)

    if (metricsError) {
      console.error('[Personal Brand Dashboard] Failed to fetch metrics', metricsError.message)
    } else {
      for (const metric of metrics || []) {
        if (!metricsByContentId[metric.content_id]) metricsByContentId[metric.content_id] = []
        metricsByContentId[metric.content_id].push(metric)
      }
    }
  }

  return { items: items || [], metricsByContentId }
}

interface TopPost {
  contentId: string
  title: string | null
  metricValue: number | null
}

function topByRate(rows: PerformanceRow[], pick: (row: PerformanceRow) => number | null, n: number): TopPost[] {
  return rows
    .filter((r) => r.latestMetric && pick(r) !== null)
    .sort((a, b) => (pick(b) as number) - (pick(a) as number))
    .slice(0, n)
    .map((r) => ({ contentId: r.content.id, title: r.content.title, metricValue: pick(r) }))
}

export interface DashboardData {
  accountBaseline: PbBaseline
  strongestFormats: FormatEvidence[]
  topPostsByEngagement: TopPost[]
  bestFollowConversion: TopPost[]
  bestDmConversion: TopPost[]
  strongestSaveRate: TopPost[]
  recentPerformance: {
    windowDays: number
    sampleSize: number
    medianEngagementRate: number | null
    vsAccountBaselinePercent: number | null
  }
  activeExperiments: (PbExperiment & { linkedContentCount: number })[]
  unusedIdeas: PbIdea[]
  totalContentCount: number
  totalPostedCount: number
}

/**
 * Aggregates everything the dashboard needs into one payload, computed
 * entirely with plain arithmetic (see metrics.ts/baselines.ts/
 * formatEvidence.ts) — no AI involved in any number shown here.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [{ items, metricsByContentId }, formatsResult, experimentsResult, ideasResult] = await Promise.all([
    fetchAllContentWithMetrics(),
    supabaseServer.from('pb_formats').select('*'),
    supabaseServer.from('pb_experiments').select('*').in('status', ['planned', 'active']),
    supabaseServer.from('pb_ideas').select('*').eq('status', 'idea').order('created_at', { ascending: false }).limit(10),
  ])

  const formats: PbFormat[] = formatsResult.data || []
  const experiments: PbExperiment[] = experimentsResult.data || []
  const unusedIdeas: PbIdea[] = ideasResult.data || []

  const rows = buildPerformanceRows(items, metricsByContentId)
  const postedRows = rows.filter((r) => r.content.status === 'posted')

  const accountBaseline = baselineFromRows(postedRows)
  const formatEvidence = buildFormatEvidence(formats, postedRows)

  const strongestFormats = [...formatEvidence]
    .filter((f) => f.sampleSize > 0)
    .sort((a, b) => (b.medianEngagementRate ?? -Infinity) - (a.medianEngagementRate ?? -Infinity))
    .slice(0, TOP_N)

  const topPostsByEngagement = topByRate(postedRows, (r) => r.rates?.engagementRate ?? null, TOP_N)
  const bestFollowConversion = topByRate(postedRows, (r) => r.rates?.followConversion ?? null, 3)
  const bestDmConversion = topByRate(postedRows, (r) => r.rates?.dmConversion ?? null, 3)
  const strongestSaveRate = topByRate(postedRows, (r) => r.rates?.saveRate ?? null, 3)

  const recentCutoff = new Date()
  recentCutoff.setDate(recentCutoff.getDate() - RECENT_WINDOW_DAYS)
  const recentRows = postedRows.filter((r) => r.content.posted_at && new Date(r.content.posted_at) >= recentCutoff)
  const recentBaseline = baselineFromRows(recentRows)

  let experimentContentCounts: Record<string, number> = {}
  if (experiments.length > 0) {
    const { data: links } = await supabaseServer
      .from('pb_experiment_content')
      .select('experiment_id')
      .in('experiment_id', experiments.map((e) => e.id))
    for (const link of links || []) {
      experimentContentCounts[link.experiment_id] = (experimentContentCounts[link.experiment_id] || 0) + 1
    }
  }

  return {
    accountBaseline,
    strongestFormats,
    topPostsByEngagement,
    bestFollowConversion,
    bestDmConversion,
    strongestSaveRate,
    recentPerformance: {
      windowDays: RECENT_WINDOW_DAYS,
      sampleSize: recentBaseline.sampleSize,
      medianEngagementRate: recentBaseline.medianEngagementRate,
      vsAccountBaselinePercent: percentVsBaseline(recentBaseline.medianEngagementRate, accountBaseline.medianEngagementRate),
    },
    activeExperiments: experiments.map((e) => ({ ...e, linkedContentCount: experimentContentCounts[e.id] || 0 })),
    unusedIdeas,
    totalContentCount: items.length,
    totalPostedCount: postedRows.length,
  }
}
