'use client'

import { useEffect, useState } from 'react'
import type { AutomationMediaOption } from '@/src/app/api/admin/personal-brand/automations/media/route'

const labelClass = 'block text-xs font-medium mb-1 text-admin-muted'

interface InstagramMediaPickerProps {
  value: string | null
  onChange: (mediaId: string | null) => void
}

export default function InstagramMediaPicker({ value, onChange }: InstagramMediaPickerProps) {
  const [scope, setScope] = useState<'any' | 'specific'>(value ? 'specific' : 'any')
  const [items, setItems] = useState<AutomationMediaOption[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPicking, setIsPicking] = useState(false)

  useEffect(() => {
    if (scope !== 'specific' || items !== null || isLoading) return
    setIsLoading(true)
    setError('')
    fetch('/api/admin/personal-brand/automations/media')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load Instagram posts')
        setItems(data.media || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load Instagram posts'))
      .finally(() => setIsLoading(false))
  }, [scope, items, isLoading])

  const handleScopeChange = (next: 'any' | 'specific') => {
    setScope(next)
    if (next === 'any') {
      onChange(null)
      setIsPicking(false)
    } else if (!value) {
      setIsPicking(true)
    }
  }

  const selected = value ? items?.find((m) => m.id === value) ?? null : null

  return (
    <div>
      <span className={labelClass}>Post / Reel</span>
      <div className="mb-2 flex flex-col gap-2 text-sm sm:flex-row sm:gap-4">
        <label className="flex items-center gap-2">
          <input type="radio" checked={scope === 'any'} onChange={() => handleScopeChange('any')} />
          Any post
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={scope === 'specific'} onChange={() => handleScopeChange('specific')} />
          Select a specific Instagram post/reel
        </label>
      </div>

      {scope === 'specific' && (
        <div className="rounded border border-admin-border p-3">
          {selected && !isPicking && (
            <div className="flex items-center gap-3">
              {selected.thumbnail_url ? (
                <img src={selected.thumbnail_url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded bg-admin-surface2" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{selected.caption || '(no caption)'}</p>
                <p className="text-xs capitalize text-admin-muted">
                  {selected.content_type} · {selected.posted_at ? new Date(selected.posted_at).toLocaleDateString() : 'unknown date'}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-admin-muted">
                  <span className="font-mono">{selected.id}</span>
                  {selected.permalink && (
                    <>
                      {' · '}
                      <a href={selected.permalink} target="_blank" rel="noopener noreferrer" className="text-admin-accent hover:underline">
                        View on Instagram ↗
                      </a>
                    </>
                  )}
                </p>
              </div>
              <button type="button" onClick={() => setIsPicking(true)} className="shrink-0 text-xs font-medium text-admin-accent">
                Change
              </button>
            </div>
          )}

          {value && !selected && !isPicking && !isLoading && (
            <div className="flex items-center justify-between gap-3 text-sm text-admin-muted">
              <span>
                Selected post not found in your synced Instagram media (it may have been deleted). Stored id:{' '}
                <span className="font-mono">{value}</span>
              </span>
              <button type="button" onClick={() => setIsPicking(true)} className="shrink-0 text-xs font-medium text-admin-accent">
                Change
              </button>
            </div>
          )}

          {(isPicking || (!value && !isLoading)) && (
            <div className={selected ? 'mt-3 border-t border-admin-border pt-3' : ''}>
              {isLoading && <p className="text-sm text-admin-muted">Loading your Instagram posts…</p>}
              {error && <p className="text-sm text-red-400">{error}</p>}
              {items && items.length === 0 && !isLoading && (
                <p className="text-sm text-admin-muted">No Instagram posts found yet.</p>
              )}
              {items && items.length > 0 && (
                <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                  {items.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => {
                        onChange(m.id)
                        setIsPicking(false)
                      }}
                      className={`rounded border p-1 text-left hover:border-admin-accent ${
                        value === m.id ? 'border-admin-accent' : 'border-admin-border'
                      }`}
                    >
                      {m.thumbnail_url ? (
                        <img src={m.thumbnail_url} alt="" className="mb-1 h-20 w-full rounded object-cover" />
                      ) : (
                        <div className="mb-1 flex h-20 w-full items-center justify-center rounded bg-admin-surface2 text-xs text-admin-muted">
                          No preview
                        </div>
                      )}
                      <p className="truncate text-xs font-medium">{m.caption || '(no caption)'}</p>
                      <p className="truncate text-[10px] capitalize text-admin-muted">
                        {m.content_type} · {m.posted_at ? new Date(m.posted_at).toLocaleDateString() : '—'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
