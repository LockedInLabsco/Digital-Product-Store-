'use client'

import { useRef, useState } from 'react'

interface MediaFieldUploadProps {
  label: string
  dimensions: string
  folder: 'logos' | 'symbols' | 'hero' | 'sections' | 'social' | 'backgrounds'
  value: string
  onChange: (url: string) => void
  altValue?: string
  onAltChange?: (alt: string) => void
  fit?: 'contain' | 'cover'
  previewClassName?: string
  /** Fired alongside onChange with the uploaded file's storage path, if the caller wants it. */
  onUploadPath?: (path: string) => void
}

export default function MediaFieldUpload({
  label,
  dimensions,
  folder,
  value,
  onChange,
  altValue,
  onAltChange,
  fit = 'cover',
  previewClassName = 'bg-gray-100',
  onUploadPath,
}: MediaFieldUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      onChange(data.url)
      if (data.path) onUploadPath?.(data.path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={`flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 ${previewClassName}`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={altValue || label}
              className={`h-full w-full ${fit === 'contain' ? 'object-contain p-2' : 'object-cover'}`}
            />
          ) : (
            <span className="text-xs text-gray-400">No image</span>
          )}
        </div>

        <div className="flex-1">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-gray-500 mb-3">Recommended: {dimensions}</p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="text-xs font-semibold border border-gray-300 rounded px-3 py-1.5 hover:border-black disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : value ? 'Replace' : 'Upload'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                disabled={isUploading}
                className="text-xs font-semibold text-red-600 border border-red-200 rounded px-3 py-1.5 hover:border-red-400 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>

          {onAltChange && (
            <input
              type="text"
              value={altValue || ''}
              onChange={(e) => onAltChange(e.target.value)}
              placeholder="Alt text (for accessibility)"
              className="mt-3 w-full max-w-sm border border-gray-300 rounded px-3 py-1.5 text-xs"
            />
          )}

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
