/**
 * Types for Instagram DM automation — see
 * supabase/migrations/0017_instagram_automations.sql for the row shapes
 * these mirror, src/lib/instagram/automations.ts for the matching
 * engine, and docs/INSTAGRAM_AUTOMATIONS_SETUP.md for how it's wired up.
 */

export type IgTriggerType = 'comment_keyword' | 'dm_keyword' | 'story_reply'
export type IgMatchType = 'contains' | 'exact'
export type IgRunSourceType = 'comment' | 'dm' | 'story_reply'

export const IG_TRIGGER_TYPES: IgTriggerType[] = ['comment_keyword', 'dm_keyword', 'story_reply']
export const IG_MATCH_TYPES: IgMatchType[] = ['contains', 'exact']

export interface IgAutomationRule {
  id: string
  name: string
  trigger_type: IgTriggerType
  keyword: string | null
  match_type: IgMatchType
  reply_message: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IgAutomationFollowup {
  id: string
  rule_id: string
  step_order: number
  delay_hours: number
  message: string
  created_at: string
}

export interface IgAutomationRun {
  id: string
  rule_id: string
  source_type: IgRunSourceType
  source_id: string
  recipient_ig_id: string
  initial_sent_at: string | null
  next_step: number
  next_due_at: string | null
  completed: boolean
  last_error: string | null
  created_at: string
  updated_at: string
}
