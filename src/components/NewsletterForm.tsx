'use client'

import { useState } from 'react'
import Button from './Button'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Integration point: wire this up to a real newsletter/email-list
    // provider when one exists. No backend call is made yet.
    setSubmitted(true)
    setEmail('')
  }

  if (submitted) {
    return (
      <p className="text-sm font-medium text-cream/80">
        Thanks — we&apos;ll be in touch.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email address"
        className="w-full flex-1 rounded-sm border border-cream/25 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus:outline-none focus:ring-2 focus:ring-cream/50"
      />
      <Button type="submit" variant="inverse" className="whitespace-nowrap">
        Subscribe
      </Button>
    </form>
  )
}
