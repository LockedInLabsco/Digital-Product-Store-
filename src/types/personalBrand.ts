/**
 * Core types for the Personal Brand Content OS — a private internal
 * workspace, entirely separate from the public-facing product/waitlist
 * data model. See supabase/migrations/0015_personal_brand_content_os.sql
 * for the row shapes these mirror, and src/lib/personal-brand/ for the
 * deterministic analytics computed from them.
 */

export type PbPlatform = 'instagram' | 'tiktok' | 'youtube' | 'other'
export type PbContentType = 'reel' | 'carousel' | 'post' | 'story' | 'other'
export type PbContentStatus = 'draft' | 'planned' | 'posted' | 'archived'
export type PbFormatStatus = 'active' | 'retired'
export type PbIdeaPriority = 'low' | 'normal' | 'high'
export type PbIdeaStatus = 'idea' | 'planned' | 'used' | 'archived'
export type PbExperimentStatus = 'planned' | 'active' | 'completed' | 'abandoned'

export const PB_PLATFORMS: PbPlatform[] = ['instagram', 'tiktok', 'youtube', 'other']
export const PB_CONTENT_TYPES: PbContentType[] = ['reel', 'carousel', 'post', 'story', 'other']
export const PB_CONTENT_STATUSES: PbContentStatus[] = ['draft', 'planned', 'posted', 'archived']
export const PB_FORMAT_STATUSES: PbFormatStatus[] = ['active', 'retired']
export const PB_IDEA_PRIORITIES: PbIdeaPriority[] = ['low', 'normal', 'high']
export const PB_IDEA_STATUSES: PbIdeaStatus[] = ['idea', 'planned', 'used', 'archived']
export const PB_EXPERIMENT_STATUSES: PbExperimentStatus[] = ['planned', 'active', 'completed', 'abandoned']

export interface PbFormat {
  id: string
  name: string
  description: string | null
  hook_structure: string | null
  body_structure: string | null
  cta_structure: string | null
  status: PbFormatStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PbContentItem {
  id: string
  platform: PbPlatform
  content_type: PbContentType
  status: PbContentStatus
  title: string | null
  caption: string | null
  script: string | null
  transcript: string | null
  hook: string | null
  cta: string | null
  topic: string | null
  content_pillar: string | null
  goal: string | null
  format_id: string | null
  audio_used: string | null
  duration_seconds: number | null
  posted_at: string | null
  platform_url: string | null
  thumbnail_path: string | null
  media_path: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface PbContentMetric {
  id: string
  content_id: string
  recorded_at: string
  views: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  followers_gained: number | null
  profile_visits: number | null
  dms_generated: number | null
  watch_time_seconds: number | null
  average_watch_time_seconds: number | null
  completion_rate: number | null
  created_at: string
}

export interface PbIdea {
  id: string
  title: string
  raw_idea: string | null
  notes: string | null
  topic: string | null
  content_pillar: string | null
  possible_hook: string | null
  format_id: string | null
  priority: PbIdeaPriority
  status: PbIdeaStatus
  source: string | null
  created_at: string
  updated_at: string
}

export interface PbExperiment {
  id: string
  name: string
  hypothesis: string | null
  variable_tested: string | null
  description: string | null
  status: PbExperimentStatus
  started_at: string | null
  ended_at: string | null
  result: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PbExperimentContent {
  experiment_id: string
  content_id: string
  created_at: string
}

/** Deterministic rates computed from one metrics snapshot — see
 * src/lib/personal-brand/metrics.ts. Every field is null (not NaN/0)
 * when its inputs are missing or the denominator is zero. */
export interface PbCalculatedRates {
  engagementRate: number | null
  likeRate: number | null
  commentRate: number | null
  shareRate: number | null
  saveRate: number | null
  followConversion: number | null
  dmConversion: number | null
}

/** A historical baseline computed on demand (never stored) — see
 * src/lib/personal-brand/baselines.ts. */
export interface PbBaseline {
  sampleSize: number
  medianViews: number | null
  medianEngagementRate: number | null
  medianSaveRate: number | null
  medianFollowConversion: number | null
  medianDmConversion: number | null
}
