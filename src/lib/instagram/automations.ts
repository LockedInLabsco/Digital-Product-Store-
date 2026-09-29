import type { IgAutomationRule, IgTriggerType } from '@/src/types/instagramAutomation'

/**
 * Finds the first active rule of the given trigger type whose keyword
 * matches the incoming text. A null keyword matches any text (used for
 * "reply to any story mention," where there's nothing to key off). Pure
 * and deterministic — the caller is responsible for ordering `rules`
 * (oldest first) so that when two rules could both match, the older one
 * wins consistently rather than depending on DB row order.
 *
 * `mediaId` is the Instagram media id the triggering event happened on
 * (only meaningful for comment_keyword, read off the webhook's
 * `value.media.id`). A rule with a non-null `instagram_media_id` only
 * matches when it equals `mediaId` — a rule scoped to one post never
 * fires for comments on any other post, even if the keyword matches.
 */
export function findMatchingRule(
  rules: IgAutomationRule[],
  triggerType: IgTriggerType,
  text: string | null | undefined,
  mediaId?: string | null
): IgAutomationRule | null {
  const candidates = rules.filter(
    (r) =>
      r.is_active &&
      r.trigger_type === triggerType &&
      (r.instagram_media_id === null || r.instagram_media_id === mediaId)
  )
  const normalizedText = (text || '').trim().toLowerCase()

  for (const rule of candidates) {
    if (rule.keyword === null || rule.keyword.trim() === '') return rule

    const normalizedKeyword = rule.keyword.trim().toLowerCase()
    if (rule.match_type === 'exact' && normalizedText === normalizedKeyword) return rule
    if (rule.match_type === 'contains' && normalizedText.includes(normalizedKeyword)) return rule
  }

  return null
}
