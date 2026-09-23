'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import WaitlistForm from '@/src/components/admin/WaitlistForm'
import type { Waitlist, WaitlistScreenshots, WaitlistStatus, WaitlistThemeConfig } from '@/src/types/waitlist'

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

export default function EditWaitlistPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [waitlist, setWaitlist] = useState<Waitlist | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
      return
    }

    const fetchWaitlist = async () => {
      try {
        const response = await fetch(`/api/admin/waitlists/${params.id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load waitlist')
        }

        setWaitlist(data.waitlist)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load waitlist')
      } finally {
        setIsFetching(false)
      }
    }

    fetchWaitlist()
  }, [params.id, router])

  const handleSubmit = async (data: WaitlistFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/waitlists/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update waitlist')
      }

      router.push(`/admin/waitlists/${params.id}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <Container className="py-4">
          <Link href={`/admin/waitlists/${params.id}`} className="text-gray-600 hover:text-black text-sm">
            ← Back to Waitlist
          </Link>
        </Container>
      </div>

      <Container className="py-12">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Edit waitlist</h1>
            <p className="text-gray-600">Update its content, slug, or status</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-8">{error}</div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {isFetching ? (
              <p className="text-gray-600">Loading...</p>
            ) : waitlist ? (
              <WaitlistForm
                mode="edit"
                initialData={{
                  name: waitlist.name,
                  slug: waitlist.slug,
                  description: waitlist.description || '',
                  headline: waitlist.headline || '',
                  supporting_text: waitlist.supporting_text || '',
                  button_text: waitlist.button_text || '',
                  status: waitlist.status,
                  theme_config: waitlist.theme_config,
                  screenshots: waitlist.screenshots,
                }}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            ) : null}
          </div>
        </div>
      </Container>
    </main>
  )
}
