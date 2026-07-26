'use client'

import { useState } from 'react'
import Button from './Button'

interface FreeDownloadButtonProps {
  productSlug: string
  productTitle: string
}

export default function FreeDownloadButton({
  productSlug,
  productTitle,
}: FreeDownloadButtonProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('Submitting email for: ' + productSlug)

      const response = await fetch(
        `/api/download/free/${productSlug}/email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error('API error:', data)
        setError(
          data.error ||
            'We could not send your guide right now. Please try again.'
        )
        return
      }

      console.log('✅ Email sent successfully')
      setSubmittedEmail(email.trim())
      setSubmitted(true)
      setSuccess(true)
      setEmail('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Submit error:', errorMessage)
      setError(
        'We could not reach the email service. Check your connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (submitted && success) {
    return (
      <div
        className="border border-black bg-black p-5 text-white"
        role="status"
        aria-live="polite"
      >
        <p className="button-label text-sm">
          Success — check your inbox
        </p>
        <p className="mt-3 text-sm text-zinc-300">
          {productTitle} is on its way to {submittedEmail}. The download link
          will arrive by email.
        </p>
        <button
          onClick={() => {
            setSubmitted(false)
            setSuccess(false)
            setSubmittedEmail('')
            setError(null)
          }}
          className="mt-4 text-sm font-semibold text-white underline underline-offset-4"
        >
          Send to another email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          aria-label={`Email address for ${productTitle}`}
          required
          disabled={loading}
          className="w-full border border-black bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:bg-zinc-100 disabled:text-zinc-500"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading || !email.trim()}
      >
        {loading ? 'Sending...' : 'Get Free Guide'}
      </Button>

      {error && (
        <div
          className="border border-black bg-white p-4 text-black"
          role="alert"
          aria-live="assertive"
        >
          <p className="button-label mb-2 text-sm">
            We couldn&apos;t send your guide
          </p>
          <p className="text-sm text-zinc-700">
            {error}
          </p>
        </div>
      )}
    </form>
  )
}
