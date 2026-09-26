import { IG_MATCH_TYPES, IG_TRIGGER_TYPES, type IgMatchType, type IgTriggerType } from '@/src/types/instagramAutomation'

const MAX_SHORT_TEXT = 300
const MAX_MESSAGE_LENGTH = 1000
// Instagram's Button Template caps the text shown above the button at
// 640 characters and the button's own label at 20 — both hard limits
// Meta enforces, not house rules, so a message that would fit as plain
// text can still be rejected once a button is attached.
const MAX_BUTTON_TEMPLATE_TEXT = 640
const MAX_BUTTON_LABEL = 20

export interface ValidationResult<T> {
  value?: T
  error?: string
}

interface ButtonFields {
  button_url: string | null
  button_label: string | null
}

/**
 * Validates the optional call-to-action button. Both fields must be
 * present together or both absent — a button with no URL, or a URL with
 * no label, is never a valid message to send. Returns the tightened
 * message-length limit to apply when a button is present, since Meta's
 * Button Template caps the text differently than a plain-text message.
 */
function validateButtonFields(body: Record<string, unknown>, messageLength: number): ValidationResult<ButtonFields> {
  const hasUrl = typeof body.button_url === 'string' && body.button_url.trim() !== ''
  const hasLabel = typeof body.button_label === 'string' && body.button_label.trim() !== ''

  if (!hasUrl && !hasLabel) return { value: { button_url: null, button_label: null } }
  if (!hasUrl || !hasLabel) return { error: 'A button needs both a URL and a label' }

  const url = (body.button_url as string).trim()
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return { error: 'Button URL must start with https://' }
  } catch {
    return { error: 'Button URL is not a valid URL' }
  }

  const label = (body.button_label as string).trim()
  if (label.length > MAX_BUTTON_LABEL) return { error: `Button label must be ${MAX_BUTTON_LABEL} characters or fewer` }

  if (messageLength > MAX_BUTTON_TEMPLATE_TEXT) {
    return { error: `Message must be ${MAX_BUTTON_TEMPLATE_TEXT} characters or fewer when a button is attached` }
  }

  return { value: { button_url: url, button_label: label } }
}

export interface AutomationRuleInput {
  name: string
  trigger_type: IgTriggerType
  keyword: string | null
  match_type: IgMatchType
  reply_message: string
  button_url: string | null
  button_label: string | null
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

  const button = validateButtonFields(body, replyMessage.length)
  if (button.error || !button.value) return { error: button.error }

  const isActive = body.is_active !== false

  return {
    value: {
      name,
      trigger_type: triggerType as IgTriggerType,
      keyword,
      match_type: matchType as IgMatchType,
      reply_message: replyMessage,
      button_url: button.value.button_url,
      button_label: button.value.button_label,
      is_active: isActive,
    },
  }
}

export interface AutomationFollowupInput {
  step_order: number
  delay_hours: number
  message: string
  button_url: string | null
  button_label: string | null
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

  const button = validateButtonFields(body, message.length)
  if (button.error || !button.value) return { error: button.error }

  return {
    value: {
      step_order: stepOrder,
      delay_hours: delayHours,
      message,
      button_url: button.value.button_url,
      button_label: button.value.button_label,
    },
  }
}
