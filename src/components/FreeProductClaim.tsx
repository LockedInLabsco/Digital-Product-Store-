'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import Button from './Button'
import { track } from '@/src/lib/analytics/events'
import { productEventProps } from '@/src/lib/analytics/eventTypes'
import { getAttributionSnapshot, getDeviceCategory } from '@/src/lib/analytics/attribution'
import { validateFreeClaimInput } from '@/src/lib/free-download/claim'
import { toAttributionPayload } from '@/src/types/attribution'

interface FreeProductClaimProviderProps {
  children: ReactNode
  productId: string
  productSlug: string
  productTitle: string
}

interface FreeProductClaimContextValue {
  openClaim: (trigger?: HTMLElement) => void
}

type FieldErrors = Partial<Record<'firstName' | 'email', string>>

const FreeProductClaimContext = createContext<FreeProductClaimContextValue | null>(null)

export function useFreeProductClaim() {
  const context = useContext(FreeProductClaimContext)

  if (!context) {
    throw new Error('FreeDownloadButton must be used inside FreeProductClaimProvider')
  }

  return context
}

export default function FreeProductClaimProvider({
  children,
  productId,
  productSlug,
  productTitle,
}: FreeProductClaimProviderProps) {
  // Free-product pages open the claim immediately. Links containing
  // ?claim=true therefore also work without depending on referral state.
  const [isOpen, setIsOpen] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const successRef = useRef<HTMLHeadingElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const submittingRef = useRef(false)

  const eventProps = productEventProps({
    id: productId,
    slug: productSlug,
    title: productTitle,
    price: 0,
  })

  const closeClaim = useCallback(() => {
    setIsOpen(false)
    window.setTimeout(() => {
      const fallback = document.querySelector<HTMLElement>('[data-free-claim-trigger]')
      const focusTarget = returnFocusRef.current || fallback
      focusTarget?.focus()
    }, 0)
  }, [])

  const openClaim = useCallback((trigger?: HTMLElement) => {
    if (trigger) returnFocusRef.current = trigger
    setIsOpen(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`

    const focusFrame = window.requestAnimationFrame(() => {
      if (success) successRef.current?.focus()
      else firstNameRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [isOpen, success])

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeClaim()
      return
    }

    if (event.key !== 'Tab' || !dialogRef.current) return

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    )

    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return

    const validation = validateFreeClaimInput({ firstName, email })
    setFieldErrors(validation.fieldErrors)
    setError(null)

    if (!validation.value) {
      if (validation.fieldErrors.firstName) firstNameRef.current?.focus()
      else emailRef.current?.focus()
      return
    }

    submittingRef.current = true
    setLoading(true)
    track('free_download_started', eventProps)

    try {
      const response = await fetch(`/api/download/free/${productSlug}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: validation.value.firstName,
          email: validation.value.email,
          attribution: toAttributionPayload(getAttributionSnapshot()),
          deviceCategory: getDeviceCategory(),
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors)
        const message = data.error || 'We could not send your guide right now. Please try again.'
        setError(message)
        track('free_download_failed', { ...eventProps, reason: message })
        return
      }

      setSubmittedEmail(validation.value.email)
      setSuccess(true)
      track('free_download_completed', eventProps)
    } catch {
      const message = 'We could not reach the email service. Check your connection and try again.'
      setError(message)
      track('free_download_failed', { ...eventProps, reason: 'network_error' })
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <FreeProductClaimContext.Provider value={{ openClaim }}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeClaim()
          }}
        >
          <div
            className="flex min-h-full items-center justify-center"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeClaim()
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="free-claim-title"
              aria-describedby="free-claim-description"
              onKeyDown={handleDialogKeyDown}
              className="relative w-full max-w-lg rounded-md border border-line bg-ink p-6 text-cream shadow-xl sm:p-9"
            >
              <button
                type="button"
                onClick={closeClaim}
                aria-label="Close free product claim"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-md border border-neutral-500 text-xl text-beige transition-colors hover:border-gold/60 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span aria-hidden="true">×</span>
              </button>

              {success ? (
                <div role="status" aria-live="polite" className="pr-8">
                  <p className="eyebrow text-gold">Delivered</p>
                  <h2
                    id="free-claim-title"
                    ref={successRef}
                    tabIndex={-1}
                    className="mt-3 font-sans font-bold tracking-tight text-3xl outline-none sm:text-4xl"
                  >
                    Check your email.
                  </h2>
                  <p id="free-claim-description" className="mt-4 leading-relaxed text-beige">
                    {productTitle} is on its way to {submittedEmail}. Your secure download link will arrive shortly.
                  </p>
                  <Button type="button" size="lg" className="mt-7 w-full" onClick={closeClaim}>
                    Continue reading
                  </Button>
                </div>
              ) : (
                <>
                  <div className="pr-10">
                    <p className="eyebrow text-gold">Free digital tool</p>
                    <h2 id="free-claim-title" className="mt-3 font-sans font-bold tracking-tight text-3xl sm:text-4xl">
                      {productTitle}
                    </h2>
                    <p id="free-claim-description" className="mt-3 text-sm leading-relaxed text-beige sm:text-base">
                      Tell us where to send your free copy. No account or payment required.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
                    <div>
                      <label htmlFor="free-claim-first-name" className="text-sm font-semibold text-beige">
                        First name
                      </label>
                      <input
                        ref={firstNameRef}
                        id="free-claim-first-name"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        maxLength={80}
                        required
                        disabled={loading}
                        value={firstName}
                        aria-invalid={Boolean(fieldErrors.firstName)}
                        aria-describedby={fieldErrors.firstName ? 'free-claim-first-name-error' : undefined}
                        onChange={(event) => {
                          setFirstName(event.target.value)
                          if (fieldErrors.firstName) setFieldErrors((current) => ({ ...current, firstName: undefined }))
                        }}
                        className="claim-field mt-2 w-full rounded-md border border-neutral-500 bg-offwhite px-4 py-3.5 text-base text-cream placeholder:text-dust focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-60"
                        placeholder="Your first name"
                      />
                      {fieldErrors.firstName && (
                        <p id="free-claim-first-name-error" className="mt-2 text-sm text-cream font-medium">
                          {fieldErrors.firstName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="free-claim-email" className="text-sm font-semibold text-beige">
                        Email address
                      </label>
                      <input
                        ref={emailRef}
                        id="free-claim-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={254}
                        required
                        disabled={loading}
                        value={email}
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={fieldErrors.email ? 'free-claim-email-error' : undefined}
                        onChange={(event) => {
                          setEmail(event.target.value)
                          if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }))
                        }}
                        className="claim-field mt-2 w-full rounded-md border border-neutral-500 bg-offwhite px-4 py-3.5 text-base text-cream placeholder:text-dust focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-60"
                        placeholder="you@example.com"
                      />
                      {fieldErrors.email && (
                        <p id="free-claim-email-error" className="mt-2 text-sm text-cream font-medium">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={loading}>
                      {loading ? 'Sending your guide…' : 'Send me the guide'}
                    </Button>

                    {error && (
                      <div role="alert" aria-live="assertive" className="rounded-md border border-cream bg-ink p-4">
                        <p className="text-sm text-cream">{error}</p>
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </FreeProductClaimContext.Provider>
  )
}
