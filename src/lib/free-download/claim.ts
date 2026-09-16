export const DUPLICATE_CLAIM_WINDOW_MINUTES = 10

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface FreeClaimInput {
  firstName: string
  email: string
}

export interface FreeClaimValidationResult {
  value?: FreeClaimInput
  fieldErrors: Partial<Record<keyof FreeClaimInput, string>>
}

export function normalizeFirstName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function validateFreeClaimInput(
  input: Partial<Record<keyof FreeClaimInput, unknown>>
): FreeClaimValidationResult {
  const firstName = normalizeFirstName(input.firstName)
  const email = normalizeEmail(input.email)
  const fieldErrors: FreeClaimValidationResult['fieldErrors'] = {}

  if (!firstName) {
    fieldErrors.firstName = 'Enter your first name.'
  } else if (firstName.length > 80) {
    fieldErrors.firstName = 'First name must be 80 characters or fewer.'
  } else if (!/\p{L}/u.test(firstName)) {
    fieldErrors.firstName = 'Enter a valid first name.'
  }

  if (!email) {
    fieldErrors.email = 'Enter your email address.'
  } else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'Enter a valid email address.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  return { value: { firstName, email }, fieldErrors }
}

export function getDuplicateClaimCutoff(now = new Date()): string {
  return new Date(
    now.getTime() - DUPLICATE_CLAIM_WINDOW_MINUTES * 60 * 1000
  ).toISOString()
}
