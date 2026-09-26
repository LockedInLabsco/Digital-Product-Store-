import { IG_MATCH_TYPES, IG_TRIGGER_TYPES, type IgMatchType, type IgTriggerType } from '@/src/types/instagramAutomation'

const MAX_SHORT_TEXT = 300
const MAX_MESSAGE_LENGTH = 1000

export interface ValidationResult<T> {
  value?: T
  error?: string
}

export interface AutomationRuleInput {
  name: string
  trigger_type: IgTriggerType
  keyword: string | null
  match_type: IgMatchType
  reply_message: string
  is_active: boolean
}

/**
 * Validates a rule create/update payload. A null/empty keyword is
 * allowed — it means "match any text," the only sensible default for a
 * story_reply rule, since there's nothing to key off a story reply.
 */
export function validateAutomationRuleInput(body: Record<string, unknown>): ValidationResult<AutomationRuleInput> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return { error: 'Name is required' }
  if (name.length > MAX_SHORT_TEXT) return { error: `Name must be ${MAX_SHORT_TEXT} characters or fewer` }

  const triggerType = body.trigger_type
  if (typeof triggerType !== 'string' || !IG_TRIGGER_TYPES.includes(triggerType as IgTriggerType)) {
    return { error: `Trigger type must be one of: ${IG_TRIGGER_TYPES.join(', ')}` }
  }

  const matchType = typeof body.match_type === 'string' ? body.match_type : 'contains'
  if (!IG_MATCH_TYPES.includes(matchType as IgMatchType)) {
    return { error: `Match type must be one of: ${IG_MATCH_TYPES.join(', ')}` }
  }

  let keyword: string | null = null
  if (body.keyword !== undefined && body.keyword !== null && body.keyword !== '') {
    if (typeof body.keyword !== 'string') return { error: 'Keyword must be text' }
    const trimmed = body.keyword.trim()
    if (trimmed.length > MAX_SHORT_TEXT) return { error: `Keyword must be ${MAX_SHORT_TEXT} characters or fewer` }
    keyword = trimmed || null
  }

  const replyMessage = typeof body.reply_message === 'string' ? body.reply_message.trim() : ''
  if (!replyMessage) return { error: 'Reply message is required' }
  if (replyMessage.length > MAX_MESSAGE_LENGTH) {
    return { error: `Reply message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }
  }

  const isActive = body.is_active !== false

  return {
    value: {
      name,
      trigger_type: triggerType as IgTriggerType,
      keyword,
      match_type: matchType as IgMatchType,
      reply_message: replyMessage,
      is_active: isActive,
    },
  }
}

export interface AutomationFollowupInput {
  step_order: number
  delay_hours: number
  message: string
}

export function validateAutomationFollowupInput(body: Record<string, unknown>): ValidationResult<AutomationFollowupInput> {
  const stepOrder = Number(body.step_order)
  if (!Number.isInteger(stepOrder) || stepOrder < 1) {
    return { error: 'Step order must be a positive whole number' }
  }

  const delayHours = Number(body.delay_hours)
  if (!Number.isFinite(delayHours) || delayHours <= 0) {
    return { error: 'Delay hours must be a positive number' }
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return { error: 'Message is required' }
  if (message.length > MAX_MESSAGE_LENGTH) return { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }

  return { value: { step_order: stepOrder, delay_hours: delayHours, message } }
}
