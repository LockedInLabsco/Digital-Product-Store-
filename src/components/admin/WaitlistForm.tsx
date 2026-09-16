'use client'

import { useState } from 'react'
import Button from './AdminButton'
import { isValidWaitlistSlug, slugifyWaitlistName } from '@/src/lib/waitlist/validate'
import type { WaitlistStatus } from '@/src/types/waitlist'

interface WaitlistFormData {
  name: string
  slug: string
  description: string
  headline: string
  supporting_text: string
  button_text: string
  status: WaitlistStatus
}

interface WaitlistFormProps {
  initialData?: Partial<WaitlistFormData>
  onSubmit: (data: WaitlistFormData) => Promise<void>
  isLoading?: boolean
  mode: 'create' | 'edit'
}

export default function WaitlistForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode,
}: WaitlistFormProps) {
  const [formData, setFormData] = useState<WaitlistFormData>({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    headline: initialData?.headline || '',
    supporting_text: initialData?.supporting_text || '',
    button_text: initialData?.button_text || '',
    status: initialData?.status || 'draft',
  })
  // Once the admin has hand-edited the slug, stop overwriting it from the name.
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    if (name === 'slug') {
      setSlugTouched(true)
      setFormData((prev) => ({ ...prev, slug: value }))
      return
    }

    if (name === 'name') {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: slugTouched ? prev.slug : slugifyWaitlistName(value),
      }))
      return
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    if (!formData.slug.trim() || !isValidWaitlistSlug(formData.slug.trim())) {
      setError('Slug must be lowercase letters, numbers, and hyphens only (e.g. "phone-control-app")')
      return
    }

    try {
      await onSubmit({ ...formData, slug: formData.slug.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save waitlist')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold mb-6">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name *
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Phone Control App"
              required
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-2">
              Slug (URL) *
            </label>
            <input
              id="slug"
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="phone-control-app"
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              Public URL will be <span className="font-mono">/waitlist/{formData.slug || '…'}</span>
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Short description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Internal note about what this waitlist is for (shown in the admin list)"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="draft">Draft — not visible to the public</option>
              <option value="active">Active — accepting signups</option>
              <option value="closed">Closed — page visible, signups disabled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t pt-8">
        <h3 className="text-lg font-bold mb-6">Public page content</h3>
        <p className="text-sm text-gray-600 mb-4">
          Optional overrides for the public waitlist page. Leave blank to use sensible defaults.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="headline" className="block text-sm font-medium mb-2">
              Headline
            </label>
            <input
              id="headline"
              type="text"
              name="headline"
              value={formData.headline}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="A better way to take back control of your phone."
            />
          </div>

          <div>
            <label htmlFor="supporting_text" className="block text-sm font-medium mb-2">
              Supporting text
            </label>
            <textarea
              id="supporting_text"
              name="supporting_text"
              value={formData.supporting_text}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Short paragraph shown under the headline."
            />
          </div>

          <div>
            <label htmlFor="button_text" className="block text-sm font-medium mb-2">
              Button text
            </label>
            <input
              id="button_text"
              type="text"
              name="button_text"
              value={formData.button_text}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Join the waitlist"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-8 flex gap-4">
        <Button type="submit" disabled={isLoading} className="bg-black text-white hover:bg-gray-900">
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create waitlist' : 'Save changes'}
        </Button>
        <Button variant="outline" type="button" onClick={() => window.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
