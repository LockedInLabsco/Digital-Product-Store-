'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import HeroSliderImageRow from '@/src/components/admin/HeroSliderImageRow'
import { HeroSliderImage, HERO_SLIDER_MAX_IMAGES } from '@/src/types/settings'

function createEmptyImage(): HeroSliderImage {
  return {
    id: crypto.randomUUID(),
    url: '',
    alt: '',
    enabled: true,
    objectPosition: '',
    storagePath: '',
  }
}

export default function AdminHeroSliderPage() {
  const router = useRouter()
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [images, setImages] = useState<HeroSliderImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
      return
    }
    setIsAuthChecked(true)
  }, [router])

  useEffect(() => {
    if (!isAuthChecked) return

    const load = async () => {
      try {
        const response = await fetch('/api/admin/hero-slider')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load hero slider images')
        setImages(Array.isArray(data.images) ? data.images : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hero slider images')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [isAuthChecked])

  const updateImage = (id: string, patch: Partial<HeroSliderImage>) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)))
    setSuccess(false)
  }

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
    setSuccess(false)
  }

  const moveImage = (id: string, direction: -1 | 1) => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id)
      const targetIndex = index + direction
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev

      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    setSuccess(false)
  }

  const addImage = () => {
    if (images.length >= HERO_SLIDER_MAX_IMAGES) return
    setImages((prev) => [...prev, createEmptyImage()])
    setSuccess(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/admin/hero-slider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(images),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save hero slider images')
      setImages(Array.isArray(data.images) ? data.images : [])
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hero slider images')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthChecked || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <Container className="py-4 flex justify-between items-center">
          <div>
            <Link href="/admin" className="text-xs text-gray-500 hover:text-black">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold">Hero Slider Images</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-black text-white text-sm font-semibold rounded px-5 py-2.5 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </Container>
      </div>

      <Container className="py-10">
        <div className="max-w-3xl space-y-6">
          <p className="text-gray-600 text-sm">
            Manage the auto-sliding image showcase on the homepage hero. Enabled images play
            in this order. If no images are enabled, the homepage falls back to the hero
            image set under Website Media. Changes take effect after you click{' '}
            <strong>Save Changes</strong>.
          </p>

          {error && (
            <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded p-4">
              {error}
            </div>
          )}
          {success && (
            <div className="border border-green-200 bg-green-50 text-green-700 text-sm rounded p-4">
              Saved successfully. The homepage has been updated.
            </div>
          )}

          {images.length === 0 && (
            <div className="text-center py-12 border border-gray-200 rounded-lg bg-white">
              <p className="text-gray-600">No hero slider images yet.</p>
            </div>
          )}

          <div className="space-y-4">
            {images.map((image, index) => (
              <HeroSliderImageRow
                key={image.id}
                image={image}
                index={index}
                total={images.length}
                onChange={updateImage}
                onRemove={removeImage}
                onMoveUp={(id) => moveImage(id, -1)}
                onMoveDown={(id) => moveImage(id, 1)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addImage}
            disabled={images.length >= HERO_SLIDER_MAX_IMAGES}
            className="border border-gray-300 rounded-lg px-5 py-3 text-sm font-semibold hover:border-black disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300"
          >
            + Add Image
          </button>
          <p className="text-xs text-gray-500">
            {images.length} / {HERO_SLIDER_MAX_IMAGES} images
          </p>
        </div>
      </Container>
    </main>
  )
}
