'use client'

import { useRef, useState, type FormEvent } from 'react'
import Container from './Container'
import Button from './Button'
import { track } from '@/src/lib/analytics/events'
import { validateWaitlistInput } from '@/src/lib/waitlist/validate'

type FieldErrors = Partial<Record<'email' | 'instagramUsername' | 'firstName', string>>

export default function AppWaitlistSection() {
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
      else instagramRef.current?.focus()
      return
    }

    submittingRef.current = true
    setLoading(true)
    track('app_waitlist_signup_started', {})

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.value),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors)
        const message = data.error || 'Something went wrong. Please try again.'
        setError(message)
        track('app_waitlist_signup_failed', { reason: message })
        return
      }

      setStatus(data.duplicate ? 'duplicate' : 'success')
      track('app_waitlist_signup_completed', {})
    } catch {
      const message = 'We could not reach the server. Check your connection and try again.'
      setError(message)
      track('app_waitlist_signup_failed', { reason: 'network_error' })
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <section data-section-id="app_waitlist" className="bg-offwhite py-20 sm:py-24">
      <Container className="mx-auto max-w-2xl text-center">
        {status !== 'idle' ? (
          <div role="status" aria-live="polite">
            <p className="eyebrow text-gold">{status === 'duplicate' ? 'Already in' : 'Confirmed'}</p>
            <h2 className="mt-4 font-serif text-3xl text-cream sm:text-4xl">
              {status === 'duplicate' ? "You're already on the waitlist." : "You're on the list."}
            </h2>
            <p className="mt-4 leading-relaxed text-cream/65">
              I&apos;ll let you know when early access opens.
            </p>
          </div>
        ) : (
          <>
            <p className="eyebrow text-gold" data-reveal="up">Building in public</p>
            <h2 className="mt-4 font-serif text-3xl leading-snug text-cream sm:text-4xl" data-reveal="up">
              A better way to take back control of your phone.
            </h2>
            <p className="mx-auto mt-5 max-w-lg leading-relaxed text-cream/65" data-reveal="up">
              I&apos;m building a minimal Android app for screen-time control, app
              blocking, grayscale, focus, and smarter rewards.
              <br className="hidden sm:block" />
              Join the waitlist to get early access and follow the build.
            </p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mx-auto mt-8 flex max-w-md flex-col gap-4 text-left"
              data-reveal="up"
            >
              <div>
                <label htmlFor="waitlist-email" className="text-xs font-semibold uppercase tracking-[0.1em] text-cream/80">
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
                  className="mt-2 w-full rounded-sm border border-line/25 bg-ink px-4 py-3.5 text-base text-cream placeholder:text-cream/35 focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-60"
                  placeholder="you@example.com"
                />
                {fieldErrors.email && (
                  <p id="waitlist-email-error" className="mt-2 text-sm text-red-300">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="waitlist-instagram" className="text-xs font-semibold uppercase tracking-[0.1em] text-cream/80">
                  Instagram username
                </label>
                <div
                  className={`mt-2 flex w-full items-stretch overflow-hidden rounded-sm border bg-ink transition-colors focus-within:ring-2 focus-within:ring-gold ${
                    fieldErrors.instagramUsername ? 'border-red-300/40' : 'border-line/25'
                  } ${loading ? 'opacity-60' : ''}`}
                >
                  <span className="flex select-none items-center border-r border-line/25 pl-4 pr-2 text-base text-cream/40" aria-hidden="true">
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
                    required
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
                    className="w-full flex-1 bg-transparent px-3 py-3.5 text-base text-cream placeholder:text-cream/35 focus:outline-none disabled:opacity-60"
                    placeholder="yourusername"
                  />
                </div>
                {fieldErrors.instagramUsername && (
                  <p id="waitlist-instagram-error" className="mt-2 text-sm text-red-300">
                    {fieldErrors.instagramUsername}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="waitlist-first-name" className="text-xs font-semibold uppercase tracking-[0.1em] text-cream/80">
                  First name <span className="normal-case tracking-normal text-cream/40">(optional)</span>
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
                  className="mt-2 w-full rounded-sm border border-line/25 bg-ink px-4 py-3.5 text-base text-cream placeholder:text-cream/35 focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-60"
                  placeholder="Your first name"
                />
                {fieldErrors.firstName && (
                  <p id="waitlist-first-name-error" className="mt-2 text-sm text-red-300">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
                {loading ? 'Joining the waitlist…' : 'Join the waitlist'}
              </Button>

              {error && (
                <div role="alert" aria-live="assertive" className="rounded-sm border border-red-300/30 bg-ink p-4">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              <p className="text-center text-xs text-cream/45">
                No spam. Just launch updates and early access.
              </p>
            </form>
          </>
        )}
      </Container>
    </section>
  )
}
