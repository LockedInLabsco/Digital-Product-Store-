import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { buildFormatEvidence, buildPerformanceRows, type FormatEvidence } from './formatEvidence'
import type { PbContentItem, PbContentMetric } from '@/src/types/personalBrand'

/**
 * Evidence for EVERY format (not just the dashboard's top N), sorted by
 * median engagement rate — used by the Winning Formats page. Evidence is
 * computed only from posted content, same as the dashboard's account
 * baseline, so a format is never credited with performance from a draft
 * that hasn't actually gone out yet.
 */
export async function getAllFormatEvidence(): Promise<FormatEvidence[]> {
  const [{ data: formats, error: formatsError }, { data: items, error: itemsError }] = await Promise.all([
    supabaseServer.from('pb_formats').select('*').order('created_at', { ascending: false }),
    supabaseServer.from('pb_content_items').select('*').eq('status', 'posted'),
  ])

  if (formatsError) {
    console.error('[Personal Brand Formats Analytics] Failed to fetch formats', formatsError.message)
    return []
  }
  if (itemsError) {
    console.error('[Personal Brand Formats Analytics] Failed to fetch content items', itemsError.message)
  }

  const postedItems: PbContentItem[] = items || []
  const contentIds = postedItems.map((i) => i.id)
  const metricsByContentId: Record<string, PbContentMetric[]> = {}

  if (contentIds.length > 0) {
    const { data: metrics, error: metricsError } = await supabaseServer
      .from('pb_content_metrics')
      .select('*')
      .in('content_id', contentIds)

    if (metricsError) {
      console.error('[Personal Brand Formats Analytics] Failed to fetch metrics', metricsError.message)
    } else {
      for (const metric of metrics || []) {
        if (!metricsByContentId[metric.content_id]) metricsByContentId[metric.content_id] = []
        metricsByContentId[metric.content_id].push(metric)
      }
    }
  }

  const rows = buildPerformanceRows(postedItems, metricsByContentId)
  const evidence = buildFormatEvidence(formats || [], rows)

  return [...evidence].sort((a, b) => (b.medianEngagementRate ?? -Infinity) - (a.medianEngagementRate ?? -Infinity))
}
