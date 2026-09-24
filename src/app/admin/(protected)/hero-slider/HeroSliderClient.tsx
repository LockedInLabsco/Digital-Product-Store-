'use client'

import { useEffect, useState } from 'react'
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

export default function HeroSliderClient() {
  const [images, setImages] = useState<HeroSliderImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
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
  }, [])

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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <div className="border-b border-admin-border bg-admin-surface">
        <Container className="py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Hero Slider Images</h1>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-admin-accent text-admin-accentText text-sm font-semibold rounded px-5 py-2.5 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </Container>
      </div>

      <Container className="py-10">
        <div className="max-w-3xl space-y-6">
          <p className="text-admin-muted text-sm">
            Manage the auto-sliding image showcase on the homepage hero. Enabled images play
            in this order. If no images are enabled, the homepage falls back to the hero
            image set under Website Media. Changes take effect after you click{' '}
            <strong>Save Changes</strong>.
          </p>

          {error && (
            <div className="border border-red-900 bg-red-950/40 text-red-400 text-sm rounded p-4">
              {error}
            </div>
          )}
          {success && (
            <div className="border border-green-900 bg-green-950/40 text-green-400 text-sm rounded p-4">
              Saved successfully. The homepage has been updated.
            </div>
          )}

          {images.length === 0 && (
            <div className="text-center py-12 border border-admin-border rounded-lg bg-admin-surface">
              <p className="text-admin-muted">No hero slider images yet.</p>
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
            className="border border-admin-border rounded-lg px-5 py-3 text-sm font-semibold hover:border-admin-text disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-admin-border"
          >
            + Add Image
          </button>
          <p className="text-xs text-admin-muted">
            {images.length} / {HERO_SLIDER_MAX_IMAGES} images
          </p>
        </div>
      </Container>
    </main>
  )
}
