'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import type { WorkspaceListEntry } from '@/src/app/api/admin/social/workspaces/route'

/**
 * The two blocking states PersonalBrandLayout can hand off to:
 * 'no_workspace' (zero memberships — must create one) and
 * 'workspace_not_selected' (2+ memberships, nothing chosen yet for this
 * browser — must pick one). Both end the same way: a successful
 * create/select call, then router.refresh() so the server layout
 * re-resolves getActiveWorkspaceContext() and renders the real page
 * instead of this gate.
 */
export default function WorkspaceSetupClient({ reason }: { reason: 'no_workspace' | 'workspace_not_selected' }) {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<WorkspaceListEntry[] | null>(null)
  const [name, setName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(reason === 'no_workspace')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (reason !== 'workspace_not_selected') return
    fetch('/api/admin/social/workspaces')
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load workspaces')
        return json.workspaces as WorkspaceListEntry[]
      })
      .then(setWorkspaces)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load workspaces'))
  }, [reason])

  async function handleSelect(workspaceId: string) {
    setError('')
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/social/workspaces/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to switch workspace')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch workspace')
      setIsSubmitting(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/social/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create workspace')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-16">
        <div className="mx-auto max-w-md">
          <h1 className="mb-2 text-2xl font-bold">
            {reason === 'no_workspace' ? 'Create your Social Workspace' : 'Choose a Social Workspace'}
          </h1>
          <p className="mb-8 text-admin-muted">
            {reason === 'no_workspace'
              ? 'A workspace holds one connected Instagram account, its content, and its team. You can create more later.'
              : 'You belong to more than one Social Workspace — pick which one to work in. You can switch anytime.'}
          </p>

          {error && <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}

          {reason === 'workspace_not_selected' && !showCreateForm && (
            <>
              {!workspaces && <p className="text-admin-muted">Loading…</p>}
              {workspaces && workspaces.length > 0 && (
                <ul className="mb-6 space-y-2">
                  {workspaces.map((w) => (
                    <li key={w.id}>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSelect(w.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-admin-border bg-admin-surface p-4 text-left hover:bg-admin-surface2 disabled:opacity-50"
                      >
                        <span>
                          <span className="block font-medium">{w.name}</span>
                          <span className="block text-sm text-admin-muted">
                            {w.role} {w.connectedInstagramUsername ? `· @${w.connectedInstagramUsername}` : '· No Instagram connected'}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => setShowCreateForm(true)} className="text-sm text-admin-muted underline hover:text-admin-text">
                Create a new workspace instead
              </button>
            </>
          )}

          {showCreateForm && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="workspace-name" className="mb-1 block text-sm font-medium">
                  Workspace name
                </label>
                <input
                  id="workspace-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alx.lifelogs"
                  required
                  className="w-full rounded-lg border border-admin-border bg-admin-surface p-3 text-admin-text"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="rounded-lg bg-admin-text px-4 py-2 font-medium text-admin-bg disabled:opacity-50"
              >
                {isSubmitting ? 'Creating…' : 'Create workspace'}
              </button>
              {reason === 'workspace_not_selected' && (
                <button type="button" onClick={() => setShowCreateForm(false)} className="ml-3 text-sm text-admin-muted underline hover:text-admin-text">
                  Choose an existing workspace instead
                </button>
              )}
            </form>
          )}
        </div>
      </Container>
    </main>
  )
}
