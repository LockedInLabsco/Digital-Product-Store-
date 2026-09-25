'use client'

import { useRef, useState, type CSSProperties, type FormEvent } from 'react'
import Container from './Container'
import { track } from '@/src/lib/analytics/events'
import { validateWaitlistInput } from '@/src/lib/waitlist/validate'
import { liquidGlassStyle, type WaitlistThemeColors } from '@/src/lib/waitlist/theme'

type FieldErrors = Partial<Record<'email' | 'instagramUsername' | 'firstName', string>>

interface PublicWaitlistFormProps {
  waitlistSlug: string
  /** Required unless `embedded` is true (embedded mode never renders these). */
  eyebrow?: string
  headline?: string
  supportingText?: string
  buttonText: string
  source: string
  theme: WaitlistThemeColors
  /** Minimal value-prop bullets shown under the supporting text. Omit to render none (default — every existing waitlist keeps its current layout). */
  features?: string[]
  /** Headline/eyebrow typeface. Defaults to 'serif' (the site's existing editorial look) so nothing changes unless a caller opts into the calmer sans look. */
  headlineFont?: 'serif' | 'sans'
  /**
   * Wraps the form in a soft, lightly frosted card (translucent surface,
   * thin border, soft shadow) instead of bare fields on the page
   * background — the "premium panel" treatment. Defaults to false so
   * existing waitlists render exactly as before; SlowDay opts in.
   */
  panel?: boolean
  /** Overrides the fixed trust line under the submit button. Defaults to
   * the line every existing waitlist already shows, so this is opt-in. */
  trustText?: string
  /**
   * Drops the outer centered Container/max-width and the eyebrow/
   * headline/supporting-text/features intro block, so just the form
   * (and the success/duplicate/error states) render left-aligned,
   * filling whatever width the caller gives it — for embedding next to
   * other content (e.g. screenshots) instead of as its own centered
   * page section. Defaults to false so every existing usage is
   * unaffected.
   */
  embedded?: boolean
}

/**
 * Self-contained waitlist signup section — heading, form, and all
 * loading/success/duplicate/error states. Used both by the homepage's
 * hardcoded app-waitlist section and by the generic /waitlist/[slug]
 * public page, with the copy/theme/target waitlist/source as props so
 * the two never duplicate the form logic itself.
 *
 * Colors come entirely from the `theme` prop via inline styles rather
 * than the site's bg-ink/text-cream/etc. Tailwind classes — those are
 * fixed to the global site theme, and this component's whole purpose
 * is letting each waitlist look different from that. Layout, spacing,
 * type scale, and radii stay as Tailwind classes since those aren't
 * themeable (see the admin Theme section — colors + presets only).
 */
export default function PublicWaitlistForm({
  waitlistSlug,
  eyebrow,
  headline,
  supportingText,
  buttonText,
  source,
  theme,
  features,
  headlineFont = 'serif',
  panel = false,
  trustText = 'No spam. Just early access and important updates.',
  embedded = false,
}: PublicWaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'success' | 'duplicate'>('idle')
  const submittingRef = useRef(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const instagramRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return

    const validation = validateWaitlistInput({ email, instagramUsername, firstName })
    setFieldErrors(validation.fieldErrors)
    setError(null)

    if (!validation.value) {
      if (validation.fieldErrors.email) emailRef.current?.focus()
      else if (validation.fieldErrors.instagramUsername) instagramRef.current?.focus()
      return
    }

    submittingRef.current = true
    setLoading(true)
    track('app_waitlist_signup_started', { waitlist_slug: waitlistSlug })

    try {
      const response = await fetch(`/api/waitlist/${waitlistSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validation.value, source }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors)
        const message = data.error || 'Something went wrong. Please try again.'
        setError(message)
        track('app_waitlist_signup_failed', { waitlist_slug: waitlistSlug, reason: message })
        return
      }

      setStatus(data.duplicate ? 'duplicate' : 'success')
      track('app_waitlist_signup_completed', { waitlist_slug: waitlistSlug })
    } catch {
      const message = 'We could not reach the server. Check your connection and try again.'
      setError(message)
      track('app_waitlist_signup_failed', { waitlist_slug: waitlistSlug, reason: 'network_error' })
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  const focusRingStyle = { '--tw-ring-color': theme.accent } as CSSProperties
  const inputStyle: CSSProperties = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    color: theme.text,
    ...focusRingStyle,
  }
  const headlineClass = headlineFont === 'sans' ? 'font-sans font-semibold' : 'font-serif'
  const radiusClass = panel ? 'rounded-xl' : 'rounded-sm'
  const fieldGapClass = panel ? 'gap-5' : 'gap-4'
  const formStyle: CSSProperties | undefined = panel ? liquidGlassStyle(theme) : undefined
  const formClassName = `${embedded ? 'mt-0 w-full' : 'mx-auto mt-8 max-w-md'} flex flex-col ${fieldGapClass} text-left${
    panel ? ' rounded-2xl border backdrop-blur-3xl p-6 sm:p-8' : ''
  }`
  const Wrapper = embedded ? 'div' : Container
  const wrapperClassName = embedded ? 'w-full text-left' : 'mx-auto max-w-2xl text-center'

  return (
    <Wrapper className={wrapperClassName}>
      {status !== 'idle' ? (
        <div role="status" aria-live="polite">
          <p
            className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
            style={{ color: theme.accent }}
          >
            {status === 'duplicate' ? 'Already in' : 'Confirmed'}
          </p>
          <h2 className={`mt-4 ${headlineClass} text-3xl sm:text-4xl`} style={{ color: theme.text }}>
            {status === 'duplicate' ? "You're already on this waitlist." : "You're on the list."}
          </h2>
          <p className="mt-4 leading-relaxed" style={{ color: theme.secondaryText }}>
            We&apos;ll let you know as soon as it&apos;s ready.
          </p>
        </div>
      ) : (
        <>
          {!embedded && (
            <>
              <p
                className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
                style={{ color: theme.accent }}
                data-reveal="up"
              >
                {eyebrow}
              </p>
              <h2 className={`mt-4 ${headlineClass} text-3xl leading-snug sm:text-4xl`} style={{ color: theme.text }} data-reveal="up">
                {headline}
              </h2>
              <p className="mx-auto mt-5 max-w-lg leading-relaxed" style={{ color: theme.secondaryText }} data-reveal="up">
                {supportingText}
              </p>

              {features && features.length > 0 && (
                <ul
                  className="mx-auto mt-6 flex max-w-lg flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm"
                  style={{ color: theme.secondaryText }}
                  data-reveal="up"
                >
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: theme.secondaryText }}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            className={formClassName}
            style={formStyle}
            data-reveal="up"
          >
            <div>
              <label
                htmlFor="waitlist-email"
                className="text-xs font-semibold uppercase tracking-[0.1em]"
                style={{ color: theme.secondaryText }}
              >
                Email
              </label>
              <input
                ref={emailRef}
                id="waitlist-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                required
                disabled={loading}
                value={email}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'waitlist-email-error' : undefined}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }))
                }}
                style={inputStyle}
                className={`mt-2 w-full ${radiusClass} border px-4 py-3.5 text-base focus:outline-none focus:ring-2 disabled:opacity-60`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p id="waitlist-email-error" className="mt-2 text-sm text-red-500">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="waitlist-instagram"
                className="text-xs font-semibold uppercase tracking-[0.1em]"
                style={{ color: theme.secondaryText }}
              >
                Instagram handle <span className="normal-case tracking-normal opacity-70">(optional)</span>
              </label>
              <div
                style={{
                  backgroundColor: theme.surface,
                  borderColor: fieldErrors.instagramUsername ? '#F87171' : theme.border,
                  ...focusRingStyle,
                }}
                className={`mt-2 flex w-full items-stretch overflow-hidden ${radiusClass} border transition-colors focus-within:ring-2 ${
                  loading ? 'opacity-60' : ''
                }`}
              >
                <span
                  className="flex select-none items-center border-r pl-4 pr-2 text-base"
                  style={{ borderColor: theme.border, color: theme.secondaryText }}
                  aria-hidden="true"
                >
                  @
                </span>
                <input
                  ref={instagramRef}
                  id="waitlist-instagram"
                  name="instagramUsername"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  maxLength={30}
                  disabled={loading}
                  value={instagramUsername}
                  aria-invalid={Boolean(fieldErrors.instagramUsername)}
                  aria-describedby={fieldErrors.instagramUsername ? 'waitlist-instagram-error' : undefined}
                  onChange={(event) => {
                    setInstagramUsername(event.target.value)
                    if (fieldErrors.instagramUsername) {
                      setFieldErrors((current) => ({ ...current, instagramUsername: undefined }))
                    }
                  }}
                  style={{ color: theme.text }}
                  className="w-full flex-1 bg-transparent px-3 py-3.5 text-base focus:outline-none disabled:opacity-60"
                  placeholder="yourusername"
                />
              </div>
              {fieldErrors.instagramUsername && (
                <p id="waitlist-instagram-error" className="mt-2 text-sm text-red-500">
                  {fieldErrors.instagramUsername}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="waitlist-first-name"
                className="text-xs font-semibold uppercase tracking-[0.1em]"
                style={{ color: theme.secondaryText }}
              >
                First name <span className="normal-case tracking-normal opacity-70">(optional)</span>
              </label>
              <input
                id="waitlist-first-name"
                name="firstName"
                type="text"
                autoComplete="given-name"
                maxLength={80}
                disabled={loading}
                value={firstName}
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={fieldErrors.firstName ? 'waitlist-first-name-error' : undefined}
                onChange={(event) => {
                  setFirstName(event.target.value)
                  if (fieldErrors.firstName) setFieldErrors((current) => ({ ...current, firstName: undefined }))
                }}
                style={inputStyle}
                className={`mt-2 w-full ${radiusClass} border px-4 py-3.5 text-base focus:outline-none focus:ring-2 disabled:opacity-60`}
                placeholder="Your first name"
              />
              {fieldErrors.firstName && (
                <p id="waitlist-first-name-error" className="mt-2 text-sm text-red-500">
                  {fieldErrors.firstName}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
              className={`mt-1 inline-flex w-full items-center justify-center gap-2 ${radiusClass} px-7 py-4 text-sm font-semibold uppercase tracking-[0.12em] transition-opacity duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100`}
            >
              {loading ? 'Joining the waitlist…' : buttonText}
            </button>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className={`${radiusClass} border p-4`}
                style={{ backgroundColor: theme.surface, borderColor: '#F87171' }}
              >
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <p className={`${embedded ? 'text-left' : 'text-center'} text-xs opacity-60`} style={{ color: theme.secondaryText }}>
              {trustText}
            </p>
          </form>
        </>
      )}
    </Wrapper>
  )
}
