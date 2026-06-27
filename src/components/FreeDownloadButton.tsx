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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      console.log('Starting download for: ' + productSlug)

      const response = await fetch(`/api/download/free/${productSlug}`)

      console.log('API response status: ' + response.status)
      console.log('API response ok: ' + response.ok)

      const data = await response.json()

      if (!response.ok) {
        console.error('API error:', data)

        if (response.status === 404) {
          setError('Product not found. Please check the URL.')
        } else if (response.status === 403) {
          setError('This product is not free. Please use the purchase button instead.')
        } else if (response.status === 400) {
          setError(data.error || 'This product does not have a downloadable file yet.')
        } else if (response.status === 500) {
          setError('Server error: Unable to generate download link. Please try again later.')
        } else {
          setError(data.error || 'Failed to generate download link')
        }
        return
      }

      window.open(data.url, '_blank')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Download error:', errorMessage)
      setError('Network error: ' + errorMessage + '. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="w-full bg-black text-white hover:bg-gray-900"
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? 'Preparing download...' : 'Get Free Guide'}
      </Button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-sm font-semibold text-red-900 mb-2">
            ❌ Download Failed
          </p>
          <p className="text-sm text-red-800 leading-relaxed">
            {error}
          </p>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="mt-3 text-sm font-semibold text-red-700 hover:text-red-900 underline"
          >
            Try again
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <p className="text-sm font-semibold text-green-900">
            ✓ Download starting... Check your downloads folder.
          </p>
        </div>
      )}
    </div>
  )
}