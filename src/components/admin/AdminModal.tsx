'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface AdminModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidthClassName?: string
}

/**
 * The one reusable admin modal/drawer — nothing like this existed before
 * the Work system (destructive actions elsewhere in the admin still use
 * window.confirm(), which is fine for a single yes/no but not for a
 * create/edit form). Matches the existing dark monochrome admin-*
 * palette and the border/surface/rounded-lg conventions used everywhere
 * else (see TeamClient.tsx) rather than inventing a new visual language.
 */
export default function AdminModal({ title, onClose, children, maxWidthClassName = 'max-w-lg' }: AdminModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${maxWidthClassName} rounded-lg border border-admin-border bg-admin-surface p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-admin-muted hover:bg-admin-surface2 hover:text-admin-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
