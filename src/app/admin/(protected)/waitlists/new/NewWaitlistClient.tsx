'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import WaitlistForm from '@/src/components/admin/WaitlistForm'
import type { WaitlistScreenshots, WaitlistStatus, WaitlistThemeConfig } from '@/src/types/waitlist'

interface WaitlistFormData {
  name: string
  slug: string
  description: string
  headline: string
  supporting_text: string
  button_text: string
  status: WaitlistStatus
  theme_config: WaitlistThemeConfig
  screenshots: WaitlistScreenshots
}

export default function NewWaitlistClient() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (data: WaitlistFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/waitlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create waitlist')
      }

      const result = await response.json()
      setSuccess(`✅ Waitlist "${result.waitlist.name}" created successfully!`)

      setTimeout(() => {
        router.push(`/admin/waitlists/${result.waitlist.id}`)
      }, 1200)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <div className="border-b border-admin-border bg-admin-surface">
        <Container className="py-4">
          <Link href="/admin/waitlists" className="text-admin-muted hover:text-admin-text text-sm">
            ← Back to Waitlists
          </Link>
        </Container>
      </div>

      <Container className="py-12">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create waitlist</h1>
            <p className="text-admin-muted">Set up a new waitlist with its own public signup page</p>
          </div>

          {success && (
            <div className="p-4 bg-green-950/40 border border-green-900 rounded-lg text-green-400 mb-8">
              {success}
            </div>
          )}

          <div className="bg-admin-surface rounded-lg border border-admin-border p-8">
            <WaitlistForm mode="create" onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </div>
      </Container>
    </main>
  )
}
