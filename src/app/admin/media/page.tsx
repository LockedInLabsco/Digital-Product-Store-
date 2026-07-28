'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import MediaFieldUpload from '@/src/components/admin/MediaFieldUpload'
import { WEBSITE_MEDIA_DEFAULTS, WebsiteMedia } from '@/src/types/settings'

export default function AdminMediaPage() {
  const router = useRouter()
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [media, setMedia] = useState<WebsiteMedia>(WEBSITE_MEDIA_DEFAULTS)
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
        const response = await fetch('/api/admin/media')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load settings')
        setMedia({ ...WEBSITE_MEDIA_DEFAULTS, ...data.media })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [isAuthChecked])

  const update = (key: keyof WebsiteMedia) => (value: string) => {
    setMedia((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(media),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save settings')
      setMedia({ ...WEBSITE_MEDIA_DEFAULTS, ...data.media })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
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
            <h1 className="text-2xl font-bold">Website Media</h1>
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
        <div className="max-w-3xl space-y-10">
          <p className="text-gray-600 text-sm">
            Upload or replace the logos and section images used across the live site.
            Changes take effect after you click <strong>Save Changes</strong>. Leaving a
            field empty keeps the site&apos;s default look for that spot.
          </p>

          {error && (
            <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded p-4">
              {error}
            </div>
          )}
          {success && (
            <div className="border border-green-200 bg-green-50 text-green-700 text-sm rounded p-4">
              Saved successfully. The live site has been updated.
            </div>
          )}

          <section>
            <h2 className="text-lg font-bold mb-4">Brand logos</h2>
            <div className="space-y-4">
              <MediaFieldUpload
                label="Logo — for light backgrounds (navbar)"
                dimensions="~320×64px, transparent PNG/WebP/SVG"
                folder="logos"
                fit="contain"
                previewClassName="bg-[#F6F1E7]"
                value={media.logo_dark_url}
                onChange={update('logo_dark_url')}
              />
              <MediaFieldUpload
                label="Logo — for dark backgrounds (footer)"
                dimensions="~320×64px, transparent PNG/WebP/SVG"
                folder="logos"
                fit="contain"
                previewClassName="bg-[#15130F]"
                value={media.logo_light_url}
                onChange={update('logo_light_url')}
              />
              <MediaFieldUpload
                label="Symbol — for light backgrounds"
                dimensions="~256×256px square, transparent PNG/WebP/SVG"
                folder="symbols"
                fit="contain"
                previewClassName="bg-[#F6F1E7]"
                value={media.symbol_dark_url}
                onChange={update('symbol_dark_url')}
              />
              <MediaFieldUpload
                label="Symbol — for dark backgrounds"
                dimensions="~256×256px square, transparent PNG/WebP/SVG"
                folder="symbols"
                fit="contain"
                previewClassName="bg-[#15130F]"
                value={media.symbol_light_url}
                onChange={update('symbol_light_url')}
              />
              <MediaFieldUpload
                label="Favicon"
                dimensions="512×512px source, PNG"
                folder="symbols"
                fit="contain"
                value={media.favicon_url}
                onChange={update('favicon_url')}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">Homepage images</h2>
            <div className="space-y-4">
              <MediaFieldUpload
                label="Hero image"
                dimensions="1200×900px (4:3), JPG/PNG/WebP"
                folder="hero"
                value={media.hero_image_url}
                onChange={update('hero_image_url')}
                altValue={media.hero_image_alt}
                onAltChange={update('hero_image_alt')}
              />
              <MediaFieldUpload
                label="About image"
                dimensions="1000×1200px, JPG/PNG/WebP"
                folder="sections"
                value={media.about_image_url}
                onChange={update('about_image_url')}
                altValue={media.about_image_alt}
                onAltChange={update('about_image_alt')}
              />
              <MediaFieldUpload
                label="Manifesto image"
                dimensions="1600×900px, JPG/PNG/WebP"
                folder="sections"
                value={media.manifesto_image_url}
                onChange={update('manifesto_image_url')}
                altValue={media.manifesto_image_alt}
                onAltChange={update('manifesto_image_alt')}
              />
              <MediaFieldUpload
                label="Newsletter image"
                dimensions="1600×800px, JPG/PNG/WebP"
                folder="sections"
                value={media.newsletter_image_url}
                onChange={update('newsletter_image_url')}
                altValue={media.newsletter_image_alt}
                onAltChange={update('newsletter_image_alt')}
              />
              <MediaFieldUpload
                label="Final CTA image"
                dimensions="1600×800px, JPG/PNG/WebP"
                folder="sections"
                value={media.final_cta_image_url}
                onChange={update('final_cta_image_url')}
                altValue={media.final_cta_image_alt}
                onAltChange={update('final_cta_image_alt')}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">Social media</h2>
            <div className="space-y-4">
              <MediaFieldUpload
                label="Social share / Open Graph image"
                dimensions="1200×630px, JPG/PNG"
                folder="social"
                value={media.social_share_image_url}
                onChange={update('social_share_image_url')}
              />
            </div>
          </section>
        </div>
      </Container>
    </main>
  )
}
