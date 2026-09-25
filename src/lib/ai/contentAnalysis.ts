import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { callClaude, isAnthropicConfigured, parseJsonResponse, type AiResult } from './client'
import { calculateRates, latestSnapshot } from '@/src/lib/personal-brand/metrics'
import { baselineFromRows, buildPerformanceRows } from '@/src/lib/personal-brand/formatEvidence'
import { MIN_SAMPLE_SIZE_FOR_CONFIDENCE } from '@/src/lib/personal-brand/baselines'
import type { PbContentItem, PbContentMetric } from '@/src/types/personalBrand'

export interface ContentAnalysisResult {
  facts: string[]
  observedPatterns: string[]
  hypotheses: string[]
  recommendations: string[]
}

/**
 * The distinction this system prompt enforces (facts vs. observed
 * patterns vs. hypotheses vs. recommendations) is the core design
 * requirement of the AI layer: the model must never present a guess as a
 * proven cause. Every number Claude is allowed to cite comes from the
 * JSON context below — nothing is looked up by the model itself.
 */
const SYSTEM_PROMPT = `You are analyzing one piece of content from a personal brand's private Content OS — a system that tracks posts and their performance over time so the person can learn what works for their specific audience.

You will be given structured JSON: the content's copy (hook, caption, script), its metadata (topic, format, goal), its actual recorded performance metrics and calculated rates, account/format baselines computed from historical content (with sample sizes), and a short list of similar historical content for context.

Respond with ONLY a JSON object, no other text, in exactly this shape:
{
  "facts": string[],
  "observedPatterns": string[],
  "hypotheses": string[],
  "recommendations": string[]
}

Strict rules:
- "facts": only restate numbers or data given to you verbatim in the JSON context. Never invent or estimate a number that wasn't provided.
- "observedPatterns": correlations visible ONLY within the data given (e.g. "this post's save rate is above the account median of X"). Do not claim a pattern you cannot point to directly in the provided data.
- "hypotheses": possible explanations for the performance, clearly speculative and never stated as proven. Ground each one in something specific about the content (its hook, format, topic, CTA, etc.) that was actually provided.
- "recommendations": concrete things worth testing next — reference the account's own formats/topics where relevant, not generic social media advice.
- Never present a hypothesis as a fact, and never state a causal relationship as certain ("this is why" is not allowed — use language like "may have contributed to").
- If a baseline's sample size is small (it will be marked "reliable": false), say so explicitly whenever you reference it rather than treating the comparison as solid evidence.
- If there is not enough information to say something useful in a category, return an empty array for that category rather than padding it with generic advice.`

async function buildAnalysisContext(content: PbContentItem) {
  const [{ data: metrics }, formatResult, { data: allPosted }] = await Promise.all([
    supabaseServer.from('pb_content_metrics').select('*').eq('content_id', content.id).order('recorded_at', { ascending: true }),
    content.format_id
      ? supabaseServer.from('pb_formats').select('*').eq('id', content.format_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseServer.from('pb_content_items').select('*').eq('status', 'posted'),
  ])

  const format = formatResult.data
  const latest = latestSnapshot(metrics || [])
  const rates = latest ? calculateRates(latest) : null

  const postedItems: PbContentItem[] = allPosted || []
  const contentIds = postedItems.map((i) => i.id)
  const metricsByContentId: Record<string, PbContentMetric[]> = {}

  if (contentIds.length > 0) {
    const { data: allMetrics } = await supabaseServer.from('pb_content_metrics').select('*').in('content_id', contentIds)
    for (const m of allMetrics || []) {
      if (!metricsByContentId[m.content_id]) metricsByContentId[m.content_id] = []
      metricsByContentId[m.content_id].push(m)
    }
  }

  const rows = buildPerformanceRows(postedItems, metricsByContentId)
  const accountBaseline = baselineFromRows(rows)
  const formatRows = content.format_id ? rows.filter((r) => r.content.format_id === content.format_id) : []
  const formatBaseline = content.format_id ? baselineFromRows(formatRows) : null

  const similar = postedItems
    .filter(
      (c) =>
        c.id !== content.id &&
        (c.format_id === content.format_id || c.topic === content.topic || c.content_pillar === content.content_pillar)
    )
    .slice(0, 5)

  return {
    content: {
      title: content.title,
      platform: content.platform,
      content_type: content.content_type,
      hook: content.hook,
      caption: content.caption,
      script: content.script,
      cta: content.cta,
      topic: content.topic,
      content_pillar: content.content_pillar,
      goal: content.goal,
      format: format?.name ?? null,
      formatDescription: format?.description ?? null,
    },
    performance: {
      hasMetrics: Boolean(latest),
      views: latest?.views ?? null,
      likes: latest?.likes ?? null,
      comments: latest?.comments ?? null,
      shares: latest?.shares ?? null,
      saves: latest?.saves ?? null,
      followersGained: latest?.followers_gained ?? null,
      dmsGenerated: latest?.dms_generated ?? null,
      engagementRate: rates?.engagementRate ?? null,
      saveRate: rates?.saveRate ?? null,
      followConversion: rates?.followConversion ?? null,
      dmConversion: rates?.dmConversion ?? null,
    },
    accountBaseline: {
      sampleSize: accountBaseline.sampleSize,
      medianEngagementRate: accountBaseline.medianEngagementRate,
      medianSaveRate: accountBaseline.medianSaveRate,
      reliable: accountBaseline.sampleSize >= MIN_SAMPLE_SIZE_FOR_CONFIDENCE,
    },
    formatBaseline: formatBaseline
      ? {
          sampleSize: formatBaseline.sampleSize,
          medianEngagementRate: formatBaseline.medianEngagementRate,
          reliable: formatBaseline.sampleSize >= MIN_SAMPLE_SIZE_FOR_CONFIDENCE,
        }
      : null,
    similarHistoricalContent: similar.map((c) => ({
      title: c.title,
      topic: c.topic,
      contentPillar: c.content_pillar,
      sameFormat: c.format_id === content.format_id,
    })),
  }
}

export async function analyzeContent(contentId: string): Promise<AiResult<ContentAnalysisResult>> {
  if (!isAnthropicConfigured()) {
    return { ok: false, error: 'AI is not configured — set ANTHROPIC_API_KEY to enable AI analysis' }
  }

  const { data: content, error } = await supabaseServer.from('pb_content_items').select('*').eq('id', contentId).maybeSingle()
  if (error || !content) {
    return { ok: false, error: 'Content item not found' }
  }

  const context = await buildAnalysisContext(content)

  const result = await callClaude({
    system: SYSTEM_PROMPT,
    prompt: `Here is the structured Content OS data for this analysis:\n\n${JSON.stringify(context, null, 2)}`,
    maxTokens: 2048,
  })
  if (!result.ok) return result

  return parseJsonResponse<ContentAnalysisResult>(result.data)
}
