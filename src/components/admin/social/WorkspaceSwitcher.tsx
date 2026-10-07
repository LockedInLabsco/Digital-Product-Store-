'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WorkspaceListEntry } from '@/src/app/api/admin/social/workspaces/route'

/**
 * "Alx.lifelogs ▾" — the always-visible active-workspace indicator +
 * switcher, rendered once inside PersonalBrandTabs so it's present on
 * every Personal Brand / Social Media page regardless of role or which
 * nav mode (sidebar vs. top tabs) is active. Lists only workspaces this
 * admin actually belongs to (same GET the workspace-picker gate screen
 * uses) — switching posts to /active, then full router.refresh() so
 * every page under the active-workspace cookie re-fetches against the
 * new workspace, same mechanism as WorkspaceSetupClient.
 */
export default function WorkspaceSwitcher() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<WorkspaceListEntry[] | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  function load() {
    fetch('/api/admin/social/workspaces')
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load workspaces')
        return json as { workspaces: WorkspaceListEntry[]; activeWorkspaceId: string | null }
      })
      .then((json) => {
        setWorkspaces(json.workspaces)
        setActiveWorkspaceId(json.activeWorkspaceId)
      })
      .catch(() => {
        // Non-fatal — the switcher simply stays hidden; every page's own
        // fetches independently surface the real "no active workspace"
        // state via the layout gate on next navigation.
      })
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSwitch(workspaceId: string) {
    if (workspaceId === activeWorkspaceId) {
      setIsOpen(false)
      return
    }
    setIsSwitching(true)
    try {
      const res = await fetch('/api/admin/social/workspaces/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      if (!res.ok) throw new Error('Failed to switch workspace')
      setIsOpen(false)
      router.refresh()
      // Client components elsewhere on the page fetch in useEffect on
      // mount only — a full reload is the simplest way to guarantee
      // every Content/Ideas/Formats/Automations panel re-fetches against
      // the newly active workspace, not just Server Components.
      window.location.reload()
    } catch {
      setIsSwitching(false)
    }
  }

  // Nothing to switch between, or still loading — render nothing rather
  // than a dropdown with one disabled-looking option.
  if (!workspaces || workspaces.length === 0) return null

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

  return (
    <div ref={containerRef} className="relative mb-4 inline-block text-sm">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={isSwitching}
        className="flex items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 font-medium hover:bg-admin-surface2 disabled:opacity-50"
      >
        {activeWorkspace?.name || 'Select workspace'}
        <span aria-hidden className="text-admin-muted">▾</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-lg border border-admin-border bg-admin-surface py-1 shadow-lg">
          {workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => handleSwitch(w.id)}
              className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-admin-surface2 ${w.id === activeWorkspaceId ? 'bg-admin-surface2' : ''}`}
            >
              <span className="font-medium">{w.name}</span>
              <span className="text-xs text-admin-muted">
                {w.role} {w.connectedInstagramUsername ? `· @${w.connectedInstagramUsername}` : '· No Instagram connected'}
              </span>
            </button>
          ))}
          <div className="mt-1 border-t border-admin-border pt-1">
            <a href="/admin/personal-brand/settings/workspace" className="block px-3 py-2 text-admin-muted hover:bg-admin-surface2 hover:text-admin-text">
              Manage workspaces
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
