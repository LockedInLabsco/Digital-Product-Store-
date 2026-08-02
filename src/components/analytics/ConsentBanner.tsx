'use client'

import Link from 'next/link'
import Button from '../Button'

interface ConsentBannerProps {
  onAccept: () => void
  onReject: () => void
}

export default function ConsentBanner({ onAccept, onReject }: ConsentBannerProps) {
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line/20 bg-offwhite/98 px-4 py-5 backdrop-blur sm:px-6"
    >
      <div className="mx-auto flex max-w-container flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-cream/70">
          We use optional analytics to understand how visitors use Not4Normal — page views, traffic
          sources, and session recordings with sensitive fields masked. It only runs if you say yes.{' '}
          <Link href="/privacy" className="text-cream underline hover:text-gold">
            Read the privacy policy
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-3">
          <Button variant="outline" size="sm" onClick={onReject}>
            Reject
          </Button>
          <Button variant="primary" size="sm" onClick={onAccept}>
            Accept analytics
          </Button>
        </div>
      </div>
    </div>
  )
}
