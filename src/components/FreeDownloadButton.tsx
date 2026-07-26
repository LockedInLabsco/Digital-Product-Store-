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
        className="bg-green-50 border border-green-200 rounded-lg p-4"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-green-900">
          Success — check your inbox
        </p>
        <p className="text-sm text-green-800 mt-2">
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
          className="mt-3 text-sm font-semibold text-green-700 hover:text-green-900 underline"
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
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-black text-white hover:bg-gray-900"
        disabled={loading || !email.trim()}
      >
        {loading ? 'Sending...' : 'Get Free Guide'}
      </Button>

      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-semibold text-red-900 mb-2">
            We couldn&apos;t send your guide
          </p>
          <p className="text-sm text-red-800">
            {error}
          </p>
        </div>
      )}
    </form>
  )
}
