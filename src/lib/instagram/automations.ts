import type { IgAutomationRule, IgTriggerType } from '@/src/types/instagramAutomation'

/**
 * Finds the first active rule of the given trigger type whose keyword
 * matches the incoming text. A null keyword matches any text (used for
 * "reply to any story mention," where there's nothing to key off). Pure
 * and deterministic — the caller is responsible for ordering `rules`
 * (oldest first) so that when two rules could both match, the older one
 * wins consistently rather than depending on DB row order.
 */
export function findMatchingRule(
  rules: IgAutomationRule[],
  triggerType: IgTriggerType,
  text: string | null | undefined
): IgAutomationRule | null {
  const candidates = rules.filter((r) => r.is_active && r.trigger_type === triggerType)
  const normalizedText = (text || '').trim().toLowerCase()

  for (const rule of candidates) {
    if (rule.keyword === null || rule.keyword.trim() === '') return rule

    const normalizedKeyword = rule.keyword.trim().toLowerCase()
    if (rule.match_type === 'exact' && normalizedText === normalizedKeyword) return rule
    if (rule.match_type === 'contains' && normalizedText.includes(normalizedKeyword)) return rule
  }

  return null
}
