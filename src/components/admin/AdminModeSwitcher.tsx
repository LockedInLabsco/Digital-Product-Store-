'use client'

import { useEffect, useRef, useState } from 'react'
import type { AdminRole } from '@/src/types/admin'
import type { AdminNavIconKey } from './AdminSidebarShell'

export interface AdminModeOption {
  role: AdminRole
  label: string
  icon: AdminNavIconKey
}

/**
 * "Founder ▾" — the mode switcher near the top of the sidebar. UI/
 * navigation context only, exactly like src/components/admin/social/WorkspaceSwitcher.tsx
 * (deliberately a separate control, never merged into one dropdown with
 * it — see the Admin Navigation Redesign report's "Social Workspace vs
 * Role" section for why): switching modes changes which nav list is
 * SHOWN, nothing more. The server-side switch route
 * (/api/admin/mode/active) independently re-verifies the admin actually
 * holds the requested role before persisting it — this component
 * cannot grant access to a mode by itself, it can only ask for one.
 *
 * With a single available mode, renders a static (non-interactive)
 * label instead of a dropdown — there is nothing to switch to, and a
 * one-option menu is just clutter.
 */
export default function AdminModeSwitcher({
  currentMode,
  availableModes,
  homeHrefByMode,
}: {
  currentMode: AdminModeOption
  availableModes: AdminModeOption[]
  homeHrefByMode: Record<AdminRole, string>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /**
   * ROOT CAUSE of "switching sometimes doesn't take effect without a
   * manual refresh": this used to call router.push(homeHrefByMode[role])
   * immediately followed by router.refresh(). Next.js 14's App Router
   * does not guarantee those two calls land in a deterministic order —
   * refresh() refreshes whatever route is current AT THE MOMENT it
   * runs, and if push()'s navigation hasn't committed yet (a real,
   * observed race, not hypothetical — the intermittent, direction-
   * sensitive symptom reported matches exactly this), refresh() can end
   * up invalidating the OLD route instead of the new one, or get
   * coalesced away entirely by React's automatic batching. The shared
   * sidebar lives in the parent (protected) layout, which only re-reads
   * the mode cookie when ITS OWN segment is actually re-fetched from
   * the server — a soft client-side navigation can serve it straight
   * from Next's Router Cache instead, exactly the "stale Server
   * Component cache" failure mode. A hard navigation has no such race:
   * the entire tree, including the shared layout, is always freshly
   * rendered server-side against the now-updated cookie — the same
   * fix already proven for src/components/admin/social/WorkspaceSwitcher.tsx,
   * which hit this identical class of bug first.
   */
  async function handleSwitch(role: AdminRole) {
    setIsOpen(false)
    if (role === currentMode.role) return
    setIsSwitching(true)
    try {
      const res = await fetch('/api/admin/mode/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: role }),
      })
      if (!res.ok) throw new Error('Failed to switch mode')
      window.location.href = homeHrefByMode[role]
    } catch {
      setIsSwitching(false)
    }
  }

  if (availableModes.length <= 1) {
    return (
      <div className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-admin-text">{currentMode.label}</div>
    )
  }

  return (
    <div ref={containerRef} className="relative mb-1">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={isSwitching}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-admin-text hover:bg-white/5 disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {currentMode.label}
        <span aria-hidden className="text-admin-muted">▾</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-full min-w-[12rem] rounded-lg border border-admin-border bg-admin-surface py-1 shadow-lg" role="menu">
          {availableModes.map((option) => (
            <button
              key={option.role}
              type="button"
              role="menuitem"
              onClick={() => handleSwitch(option.role)}
              className={`block w-full px-3 py-2 text-left text-sm font-medium ${
                option.role === currentMode.role ? 'bg-white/10 text-admin-text' : 'text-admin-muted hover:bg-white/5 hover:text-admin-text'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
