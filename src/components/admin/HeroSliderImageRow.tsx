'use client'

import { HeroSliderImage } from '@/src/types/settings'
import MediaFieldUpload from './MediaFieldUpload'

interface HeroSliderImageRowProps {
  image: HeroSliderImage
  index: number
  total: number
  onChange: (id: string, patch: Partial<HeroSliderImage>) => void
  onRemove: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
}

export default function HeroSliderImageRow({
  image,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: HeroSliderImageRowProps) {
  return (
    <div className="border border-admin-border rounded-lg p-5 bg-admin-surface">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-admin-surface2 text-xs font-semibold text-admin-muted">
            {index + 1}
          </span>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={image.enabled}
              onChange={(e) => onChange(image.id, { enabled: e.target.checked })}
              className="w-4 h-4 rounded border-admin-border cursor-pointer"
            />
            {image.enabled ? 'Enabled' : 'Disabled'}
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMoveUp(image.id)}
            disabled={index === 0}
            aria-label="Move image up"
            className="text-xs font-semibold border border-admin-border rounded px-2 py-1 hover:border-admin-text disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↑ Up
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(image.id)}
            disabled={index === total - 1}
            aria-label="Move image down"
            className="text-xs font-semibold border border-admin-border rounded px-2 py-1 hover:border-admin-text disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↓ Down
          </button>
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            aria-label="Remove image"
            className="text-xs font-semibold text-red-400 border border-red-900 rounded px-2 py-1 hover:border-red-700"
          >
            Remove
          </button>
        </div>
      </div>

      <MediaFieldUpload
        label={`Slide ${index + 1} image`}
        dimensions="1200×900px (4:3), JPG/PNG/WebP/AVIF, up to 8MB"
        folder="hero"
        fit="cover"
        value={image.url}
        onChange={(url) => onChange(image.id, { url })}
        onUploadPath={(storagePath) => onChange(image.id, { storagePath })}
        altValue={image.alt}
        onAltChange={(alt) => onChange(image.id, { alt })}
      />

      <div className="mt-3">
        <label htmlFor={`object-position-${image.id}`} className="block text-sm font-medium mb-1">
          Object position <span className="text-admin-muted font-normal">(optional)</span>
        </label>
        <input
          id={`object-position-${image.id}`}
          type="text"
          value={image.objectPosition || ''}
          onChange={(e) => onChange(image.id, { objectPosition: e.target.value })}
          placeholder="e.g. center, 75% center, top"
          className="w-full max-w-xs px-3 py-1.5 border border-admin-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
        />
        <p className="text-xs text-admin-muted mt-1">
          Controls which part of the photo stays visible when cropped. Leave blank for center.
        </p>
      </div>
    </div>
  )
}
