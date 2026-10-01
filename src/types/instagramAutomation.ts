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
  /** Owning connected Instagram account — nullable only until the
   * one-time backfill (src/lib/social/backfillWorkspace.ts) completes;
   * see the Social Media Multi-Workspace Audit. */
  connected_account_id: string | null
  name: string
  trigger_type: IgTriggerType
  keyword: string | null
  match_type: IgMatchType
  reply_message: string
  /** Optional call-to-action button (Instagram's Button Template) shown
   * under `reply_message`. Both null together means a plain text reply. */
  button_url: string | null
  button_label: string | null
  /** comment_keyword only: restricts the rule to comments on this one
   * Instagram media id. null means "any post" — the only meaningful
   * value for dm_keyword/story_reply, which have no post to scope to. */
  instagram_media_id: string | null
  /** comment_keyword only: when true, also posts a public reply on the
   * triggering comment (e.g. "Check your DMs 👀") alongside the private
   * DM. See public_reply_variations for the text(s) used. */
  public_reply_enabled: boolean
  /** 0-3 public reply variations, rotated between — see
   * src/lib/instagram/publicReply.ts. Empty when public_reply_enabled is
   * false. */
  public_reply_variations: string[]
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
  button_url: string | null
  button_label: string | null
  created_at: string
}

export interface IgAutomationRun {
  id: string
  /** Owning connected Instagram account — see IgAutomationRule's note. */
  connected_account_id: string | null
  rule_id: string
  source_type: IgRunSourceType
  source_id: string
  recipient_ig_id: string
  initial_sent_at: string | null
  next_step: number
  next_due_at: string | null
  completed: boolean
  last_error: string | null
  /** 0-based index into the rule's public_reply_variations at the time
   * this run's public reply was sent — null if public reply wasn't
   * enabled/attempted for this run. */
  public_reply_variation_index: number | null
  /** Error from the public-reply send, independent of last_error (the
   * private DM's own failure) — a public reply failing never blocks or
   * overwrites the DM's own status. */
  public_reply_error: string | null
  created_at: string
  updated_at: string
}
