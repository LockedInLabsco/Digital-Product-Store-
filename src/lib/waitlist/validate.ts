const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INSTAGRAM_USERNAME_PATTERN = /^[a-zA-Z0-9_.]{1,30}$/

export interface WaitlistInput {
  email: string
  instagramUsername: string
  firstName: string
}

export interface WaitlistValidationResult {
  value?: WaitlistInput
  fieldErrors: Partial<Record<keyof WaitlistInput, string>>
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function normalizeInstagramUsername(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/^@/, '')
}

export function normalizeFirstName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

export function validateWaitlistInput(
  input: Partial<Record<'email' | 'instagramUsername' | 'firstName', unknown>>
): WaitlistValidationResult {
  const email = normalizeEmail(input.email)
  const instagramUsername = normalizeInstagramUsername(input.instagramUsername)
  const firstName = normalizeFirstName(input.firstName)
  const fieldErrors: WaitlistValidationResult['fieldErrors'] = {}

  if (!email) {
    fieldErrors.email = 'Enter your email address.'
  } else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'Enter a valid email address.'
  }

  if (!instagramUsername) {
    fieldErrors.instagramUsername = 'Enter your Instagram username.'
  } else if (!INSTAGRAM_USERNAME_PATTERN.test(instagramUsername)) {
    fieldErrors.instagramUsername = 'Enter a valid Instagram username.'
  }

  if (firstName.length > 80) {
    fieldErrors.firstName = 'First name must be 80 characters or fewer.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  return { value: { email, instagramUsername, firstName }, fieldErrors }
}
