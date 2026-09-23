'use client'

import { useMemo, useState } from 'react'
import Button from './AdminButton'
import WaitlistThemePreview from './WaitlistThemePreview'
import { isValidWaitlistSlug, slugifyWaitlistName } from '@/src/lib/waitlist/validate'
import {
  getContrastRatio,
  isValidHexColor,
  LOW_CONTRAST_THRESHOLD,
  PRESET_LABELS,
  resolveWaitlistTheme,
  type WaitlistThemeColors,
} from '@/src/lib/waitlist/theme'
import type { WaitlistStatus, WaitlistThemeConfig, WaitlistThemePreset } from '@/src/types/waitlist'

interface WaitlistFormData {
  name: string
  slug: string
  description: string
  headline: string
  supporting_text: string
  button_text: string
  status: WaitlistStatus
  theme_config: WaitlistThemeConfig
}

interface WaitlistFormProps {
  initialData?: Partial<WaitlistFormData>
  onSubmit: (data: WaitlistFormData) => Promise<void>
  isLoading?: boolean
  mode: 'create' | 'edit'
}

const PRESET_OPTIONS: WaitlistThemePreset[] = [
  'not4normal-dark',
  'minimal-white',
  'monochrome',
  'warm-paper',
  'slowday',
  'custom',
]

const COLOR_FIELDS: { key: keyof WaitlistThemeColors; label: string; required: boolean }[] = [
  { key: 'background', label: 'Background', required: true },
  { key: 'text', label: 'Primary text', required: true },
  { key: 'secondaryText', label: 'Secondary text', required: true },
  { key: 'accent', label: 'Accent / button color', required: true },
  { key: 'accentText', label: 'Button text', required: true },
  { key: 'border', label: 'Border / divider', required: true },
  { key: 'surface', label: 'Card / surface color', required: false },
]

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
    theme_config: initialData?.theme_config || { preset: 'not4normal-dark' },
  })
  // Once the admin has hand-edited the slug, stop overwriting it from the name.
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [error, setError] = useState('')

  // Seeds the custom color editor from whatever theme is currently
  // active, so switching to Custom starts from a real look instead of
  // blank fields. Kept separate from formData.theme_config so a preset
  // selection never carries stray color fields into what gets saved.
  const [customColors, setCustomColors] = useState<WaitlistThemeColors>(() =>
    resolveWaitlistTheme(initialData?.theme_config)
  )

  const preset = formData.theme_config.preset
  const isCustom = preset === 'custom'
  const previewTheme = isCustom ? customColors : resolveWaitlistTheme({ preset })

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

  const handlePresetChange = (nextPreset: WaitlistThemePreset) => {
    setFormData((prev) => ({
      ...prev,
      theme_config: { preset: nextPreset, ...(prev.theme_config.layout ? { layout: prev.theme_config.layout } : {}) },
    }))
  }

  const isStandalone = formData.theme_config.layout === 'standalone'

  const handleStandaloneToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      theme_config: { ...prev.theme_config, ...(checked ? { layout: 'standalone' } : { layout: undefined }) },
    }))
  }

  const handleColorChange = (key: keyof WaitlistThemeColors, value: string) => {
    setCustomColors((prev) => ({ ...prev, [key]: value }))
  }

  const contrastWarnings = useMemo(() => {
    if (!isCustom) return []
    const warnings: string[] = []
    if (isValidHexColor(customColors.text) && isValidHexColor(customColors.background)) {
      if (getContrastRatio(customColors.text, customColors.background) < LOW_CONTRAST_THRESHOLD) {
        warnings.push('Primary text may be hard to read against the background.')
      }
    }
    if (isValidHexColor(customColors.accentText) && isValidHexColor(customColors.accent)) {
      if (getContrastRatio(customColors.accentText, customColors.accent) < LOW_CONTRAST_THRESHOLD) {
        warnings.push('Button text may be hard to read against the button color.')
      }
    }
    return warnings
  }, [isCustom, customColors])

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

    if (isCustom) {
      for (const field of COLOR_FIELDS) {
        const value = customColors[field.key]
        if (field.required && !isValidHexColor(value)) {
          setError(`Enter a valid hex color for "${field.label}" (e.g. #F6F3EA)`)
          return
        }
        if (value && !isValidHexColor(value)) {
          setError(`Enter a valid hex color for "${field.label}" (e.g. #F6F3EA)`)
          return
        }
      }
      if (customColors.text.toLowerCase() === customColors.background.toLowerCase()) {
        setError('Primary text and background colors cannot be the same')
        return
      }
      if (customColors.accentText.toLowerCase() === customColors.accent.toLowerCase()) {
        setError('Button text and button color cannot be the same')
        return
      }
    }

    const theme_config: WaitlistThemeConfig = isCustom
      ? { preset: 'custom', ...customColors }
      : { preset }

    try {
      await onSubmit({ ...formData, slug: formData.slug.trim(), theme_config })
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

      <div className="border-t pt-8">
        <h3 className="text-lg font-bold mb-2">Theme</h3>
        <p className="text-sm text-gray-600 mb-6">
          Controls only this waitlist&apos;s public page — the rest of the site is never affected.
        </p>

        <label className="mb-8 flex items-start gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={isStandalone}
            onChange={(e) => handleStandaloneToggle(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium">Standalone landing page</span>
            <span className="block text-xs text-gray-600 mt-0.5">
              Replaces the generic NOT4NORMAL header/footer with a dedicated, self-contained page — its own
              minimal header, hero, audience/problem sections, screenshot preview, and footer. Used by SlowDay;
              enable for any other waitlist that needs its own standalone identity.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Preset</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PRESET_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handlePresetChange(option)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    preset === option
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {PRESET_LABELS[option]}
                </button>
              ))}
            </div>

            {isCustom && (
              <div className="mt-6 space-y-4">
                {COLOR_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={`theme-${field.key}`} className="block text-sm font-medium mb-2">
                      {field.label} {!field.required && <span className="text-gray-400">(optional)</span>}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        aria-label={`${field.label} color picker`}
                        value={isValidHexColor(customColors[field.key]) ? customColors[field.key] : '#000000'}
                        onChange={(e) => handleColorChange(field.key, e.target.value)}
                        className="h-10 w-12 flex-shrink-0 cursor-pointer rounded border border-gray-300 p-1"
                      />
                      <input
                        id={`theme-${field.key}`}
                        type="text"
                        value={customColors[field.key] || ''}
                        onChange={(e) => handleColorChange(field.key, e.target.value)}
                        placeholder="#RRGGBB"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                ))}

                {contrastWarnings.length > 0 && (
                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                    {contrastWarnings.map((warning) => (
                      <p key={warning}>⚠ {warning}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Live preview</label>
            <WaitlistThemePreview
              theme={previewTheme}
              headline={formData.headline}
              supportingText={formData.supporting_text}
              buttonText={formData.button_text}
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
