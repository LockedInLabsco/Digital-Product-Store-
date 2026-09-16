const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INSTAGRAM_USERNAME_PATTERN = /^[a-zA-Z0-9_.]{1,30}$/
export const WAITLIST_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SOURCE_PATTERN = /^[a-zA-Z0-9_-]{1,40}$/

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

  if (instagramUsername && !INSTAGRAM_USERNAME_PATTERN.test(instagramUsername)) {
    fieldErrors.instagramUsername = 'Enter a valid Instagram handle.'
  }

  if (firstName.length > 80) {
    fieldErrors.firstName = 'First name must be 80 characters or fewer.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  return { value: { email, instagramUsername, firstName }, fieldErrors }
}

export function slugifyWaitlistName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function isValidWaitlistSlug(value: string): boolean {
  return WAITLIST_SLUG_PATTERN.test(value)
}

/**
 * Sanitizes a caller-supplied source tag (e.g. ?source=instagram) to a
 * safe, bounded value instead of trusting it verbatim. Falls back to
 * fallback when missing or invalid so a malformed query param can never
 * produce an empty or unsafe source column value.
 */
export function normalizeSource(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return SOURCE_PATTERN.test(trimmed) ? trimmed : fallback
}
