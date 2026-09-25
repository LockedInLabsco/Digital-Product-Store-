'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import ContentForm, { type ContentFormData } from '@/src/components/admin/personal-brand/ContentForm'
import type { PbFormat } from '@/src/types/personalBrand'

export default function NewContentClient() {
  const router = useRouter()
  const [formats, setFormats] = useState<PbFormat[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/personal-brand/formats')
      .then((res) => (res.ok ? res.json() : { formats: [] }))
      .then((data) => setFormats(data.formats || []))
      .catch(() => setFormats([]))
  }, [])

  const handleSubmit = async (data: ContentFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/personal-brand/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          format_id: data.format_id || null,
          duration_seconds: data.duration_seconds ? Number(data.duration_seconds) : null,
          posted_at: data.posted_at ? new Date(data.posted_at).toISOString() : null,
          tags: data.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create content item')

      router.push(`/admin/personal-brand/content/${result.content.id}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-3xl">
          <PersonalBrandTabs />
          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold">Add Content</h2>
            <p className="text-admin-muted">Log a piece of content — you can fill in performance later.</p>
          </div>
          <ContentForm formats={formats} onSubmit={handleSubmit} isLoading={isLoading} submitLabel="Create content item" />
        </div>
      </Container>
    </main>
  )
}
