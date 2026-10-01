import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { callClaude, isAnthropicConfigured, parseJsonResponse, type AiResult } from './client'
import { buildFormatEvidence, buildPerformanceRows } from '@/src/lib/personal-brand/formatEvidence'
import { MIN_SAMPLE_SIZE_FOR_CONFIDENCE } from '@/src/lib/personal-brand/baselines'
import type { PbContentItem, PbContentMetric, PbExperiment, PbFormat, PbIdea } from '@/src/types/personalBrand'

export interface PlannerRecommendation {
  hasEnoughData: boolean
  contentType: string | null
  goal: string | null
  format: string | null
  topic: string | null
  why: string
  suggestedHook: string | null
  suggestedStructure: string | null
  experimentOpportunity: string | null
}

/**
 * The planner is explicitly NOT "give me 10 viral ideas" — it must
 * reason only from this account's own Content OS data (winning formats,
 * ideas already sitting in the vault, active experiments, recent
 * performance) and say so plainly when that data is too thin to ground a
 * real recommendation, rather than inventing generic advice to fill the
 * shape.
 */
const SYSTEM_PROMPT = `You are the AI Planner for a personal brand's private Content OS. Your job is to recommend what to post next, grounded ONLY in this account's own historical data — never generic social media advice.

You will be given structured JSON: evidence for each content format (median performance + sample size), recent posts and their performance vs. the account baseline, unused ideas sitting in the idea vault, and active experiments currently running.

Respond with ONLY a JSON object, no other text, in exactly this shape:
{
  "hasEnoughData": boolean,
  "contentType": string | null,
  "goal": string | null,
  "format": string | null,
  "topic": string | null,
  "why": string,
  "suggestedHook": string | null,
  "suggestedStructure": string | null,
  "experimentOpportunity": string | null
}

Strict rules:
- Base every recommendation on the formats, ideas, topics, and experiments actually present in the provided data. Do not invent a format or topic that isn't in the context.
- "why" must cite the specific evidence used (format name, sample size, median rate, or a specific idea/experiment) — never a vague justification.
- If format evidence has a small sample size, say so in "why" rather than presenting it as strong evidence.
- Prefer suggesting an idea already in the idea vault when one fits well, and say so.
- If an active experiment is relevant, mention it as an "experimentOpportunity" — e.g. suggest logging the next post as part of that experiment.
- Set "hasEnoughData" to false (and explain why in "why", leaving other fields null except "why") when there simply isn't enough posted content with metrics, ideas, or formats to ground a real recommendation — do not fabricate a confident-sounding recommendation to fill the shape when the data doesn't support one.`

/**
 * `workspaceIds` scopes every Content OS query to the caller's
 * authorized Social Workspace(s) — see the Social Media Multi-Workspace
 * Audit. An empty array short-circuits to "not enough data" rather than
 * reading every workspace's content.
 */
export async function generatePlan(workspaceIds: string[]): Promise<AiResult<PlannerRecommendation>> {
  if (!isAnthropicConfigured()) {
    return { ok: false, error: 'AI is not configured — set ANTHROPIC_API_KEY to enable the AI Planner' }
  }
  if (workspaceIds.length === 0) {
    return {
      ok: true,
      data: {
        hasEnoughData: false,
        contentType: null,
        goal: null,
        format: null,
        topic: null,
        why: 'No Social Workspace content is available to this account yet.',
        suggestedHook: null,
        suggestedStructure: null,
        experimentOpportunity: null,
      },
    }
  }

  const [{ data: items }, { data: formats }, { data: ideas }, { data: experiments }] = await Promise.all([
    supabaseServer.from('pb_content_items').select('*').in('workspace_id', workspaceIds).eq('status', 'posted'),
    supabaseServer.from('pb_formats').select('*').in('workspace_id', workspaceIds).eq('status', 'active'),
    supabaseServer
      .from('pb_ideas')
      .select('*')
      .in('workspace_id', workspaceIds)
      .eq('status', 'idea')
      .order('created_at', { ascending: false })
      .limit(15),
    supabaseServer.from('pb_experiments').select('*').in('workspace_id', workspaceIds).in('status', ['planned', 'active']),
  ])

  const postedItems: PbContentItem[] = items || []
  const activeFormats: PbFormat[] = formats || []
  const unusedIdeas: PbIdea[] = ideas || []
  const activeExperiments: PbExperiment[] = experiments || []

  const contentIds = postedItems.map((i) => i.id)
  const metricsByContentId: Record<string, PbContentMetric[]> = {}
  if (contentIds.length > 0) {
    const { data: metrics } = await supabaseServer.from('pb_content_metrics').select('*').in('content_id', contentIds)
    for (const m of metrics || []) {
      if (!metricsByContentId[m.content_id]) metricsByContentId[m.content_id] = []
      metricsByContentId[m.content_id].push(m)
    }
  }

  const rows = buildPerformanceRows(postedItems, metricsByContentId)
  const formatEvidence = buildFormatEvidence(activeFormats, rows)

  const recentPosts = [...rows]
    .filter((r) => r.content.posted_at)
    .sort((a, b) => new Date(b.content.posted_at!).getTime() - new Date(a.content.posted_at!).getTime())
    .slice(0, 8)

  const context = {
    formatEvidence: formatEvidence.map((f) => ({
      name: f.format.name,
      description: f.format.description,
      sampleSize: f.sampleSize,
      medianEngagementRate: f.medianEngagementRate,
      medianFollowConversion: f.medianFollowConversion,
      medianDmConversion: f.medianDmConversion,
      reliable: f.sampleSize >= MIN_SAMPLE_SIZE_FOR_CONFIDENCE,
    })),
    recentPosts: recentPosts.map((r) => ({
      title: r.content.title,
      topic: r.content.topic,
      contentPillar: r.content.content_pillar,
      format: activeFormats.find((f) => f.id === r.content.format_id)?.name ?? null,
      postedAt: r.content.posted_at,
      engagementRate: r.rates?.engagementRate ?? null,
    })),
    unusedIdeas: unusedIdeas.map((i) => ({
      title: i.title,
      topic: i.topic,
      contentPillar: i.content_pillar,
      possibleHook: i.possible_hook,
      priority: i.priority,
      format: activeFormats.find((f) => f.id === i.format_id)?.name ?? null,
    })),
    activeExperiments: activeExperiments.map((e) => ({
      name: e.name,
      hypothesis: e.hypothesis,
      variableTested: e.variable_tested,
      status: e.status,
    })),
    totalPostedContentCount: postedItems.length,
  }

  const result = await callClaude({
    system: SYSTEM_PROMPT,
    prompt: `Here is the structured Content OS data to plan from:\n\n${JSON.stringify(context, null, 2)}`,
    maxTokens: 2048,
  })
  if (!result.ok) return result

  return parseJsonResponse<PlannerRecommendation>(result.data)
}
