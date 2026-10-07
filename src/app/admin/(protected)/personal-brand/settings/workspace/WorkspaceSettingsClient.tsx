'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import PersonalBrandTabs from '@/src/components/admin/personal-brand/PersonalBrandTabs'
import type { WorkspaceListEntry } from '@/src/app/api/admin/social/workspaces/route'
import type { SocialWorkspaceRole } from '@/src/types/social'

interface MemberRow {
  id: string
  admin_user_id: string
  workspace_role: SocialWorkspaceRole
  email: string | null
  created_at: string
}

interface InviteRow {
  id: string
  email: string
  workspace_role: SocialWorkspaceRole
  created_at: string
}

interface AccessRequestRow {
  id: string
  requesting_admin_user_id: string
  requester_email: string | null
  created_at: string
}

const ROLE_OPTIONS: SocialWorkspaceRole[] = ['owner', 'manager', 'analyst']
const GRANTABLE_ROLE_OPTIONS: Extract<SocialWorkspaceRole, 'manager' | 'analyst'>[] = ['manager', 'analyst']

const ROLE_DESCRIPTIONS: Record<SocialWorkspaceRole, string> = {
  owner: 'Everything — connect/disconnect Instagram, manage members, delete content',
  manager: 'Manage content, ideas, formats, experiments, and automations',
  analyst: 'Read-only — view content and analytics, no edits',
}

/**
 * Workspace team management — Settings → Team Members from the Social
 * Media Multi-Workspace Audit. Operates on the caller's currently ACTIVE
 * workspace (resolved the same way every other Personal Brand page
 * does), so switching workspaces via the switcher and revisiting this
 * page manages a different team, never two mixed together.
 */
export default function WorkspaceSettingsClient() {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<WorkspaceListEntry | null>(null)
  const [members, setMembers] = useState<MemberRow[] | null>(null)
  const [invites, setInvites] = useState<InviteRow[] | null>(null)
  const [accessRequests, setAccessRequests] = useState<AccessRequestRow[] | null>(null)
  const [accessRequestRoles, setAccessRequestRoles] = useState<Record<string, 'manager' | 'analyst'>>({})
  const [canManage, setCanManage] = useState(false)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<SocialWorkspaceRole>('analyst')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const listRes = await fetch('/api/admin/social/workspaces')
      const listJson = await listRes.json()
      if (!listRes.ok) throw new Error(listJson.error || 'Failed to load workspace')

      const active = (listJson.workspaces as WorkspaceListEntry[]).find((w) => w.id === listJson.activeWorkspaceId) || null
      setWorkspace(active)
      if (!active) return

      const membersRes = await fetch(`/api/admin/social/workspaces/${active.id}/members`)
      const membersJson = await membersRes.json()
      if (!membersRes.ok) throw new Error(membersJson.error || 'Failed to load members')

      setMembers(membersJson.members)
      setInvites(membersJson.invites)
      setAccessRequests(membersJson.accessRequests || [])
      setCanManage(membersJson.canManage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!workspace) return
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/social/workspaces/${workspace.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to invite')
      setInviteEmail('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRoleChange(memberId: string, role: SocialWorkspaceRole) {
    if (!workspace) return
    setError('')
    try {
      const res = await fetch(`/api/admin/social/workspaces/${workspace.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update role')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!workspace) return
    if (!window.confirm('Remove this member from the workspace?')) return
    setError('')
    try {
      const res = await fetch(`/api/admin/social/workspaces/${workspace.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to remove member')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!workspace) return
    setError('')
    try {
      const res = await fetch(`/api/admin/social/workspaces/${workspace.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to revoke invite')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite')
    }
  }

  async function handleResolveAccessRequest(requestId: string, decision: 'approved' | 'rejected') {
    if (!workspace) return
    setResolvingRequestId(requestId)
    setError('')
    try {
      const role = accessRequestRoles[requestId] || 'analyst'
      const res = await fetch(`/api/admin/social/workspaces/${workspace.id}/access-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision === 'approved' ? { decision, role } : { decision }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to resolve request')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve request')
    } finally {
      setResolvingRequestId(null)
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-3xl">
          <PersonalBrandTabs />

          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold">Workspace Settings</h2>
            <p className="text-admin-muted">{workspace ? workspace.name : 'Loading…'}</p>
          </div>

          {error && <div className="mb-8 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}

          {workspace && (
            <>
              <section className="mb-10">
                <h3 className="mb-4 text-lg font-semibold">Team Members</h3>
                <div className="overflow-hidden rounded-lg border border-admin-border">
                  {members?.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-4 border-b border-admin-border bg-admin-surface p-4 last:border-0">
                      <div>
                        <p className="font-medium">{m.email || 'Unknown admin'}</p>
                        <p className="text-sm text-admin-muted">{ROLE_DESCRIPTIONS[m.workspace_role]}</p>
                      </div>
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={m.workspace_role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value as SocialWorkspaceRole)}
                            className="rounded border border-admin-border bg-admin-bg px-2 py-1 text-sm"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => handleRemoveMember(m.id)} className="text-sm text-red-400 hover:underline">
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm capitalize text-admin-muted">{m.workspace_role}</span>
                      )}
                    </div>
                  ))}
                  {members && members.length === 0 && <p className="p-4 text-admin-muted">No members yet.</p>}
                </div>
              </section>

              {canManage && accessRequests && accessRequests.length > 0 && (
                <section className="mb-10">
                  <h3 className="mb-4 text-lg font-semibold">Access Requests</h3>
                  <p className="mb-3 text-sm text-admin-muted">
                    Someone tried to connect an Instagram account that already belongs to this workspace, and asked to join instead.
                  </p>
                  <div className="overflow-hidden rounded-lg border border-admin-border">
                    {accessRequests.map((req) => (
                      <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border bg-admin-surface p-4 last:border-0">
                        <div>
                          <p className="font-medium">{req.requester_email || 'Unknown admin'}</p>
                          <p className="text-sm text-admin-muted">Requested access to this workspace</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={accessRequestRoles[req.id] || 'analyst'}
                            onChange={(e) => setAccessRequestRoles((prev) => ({ ...prev, [req.id]: e.target.value as 'manager' | 'analyst' }))}
                            className="rounded border border-admin-border bg-admin-bg px-2 py-1 text-sm"
                          >
                            {GRANTABLE_ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={resolvingRequestId === req.id}
                            onClick={() => handleResolveAccessRequest(req.id, 'approved')}
                            className="text-sm text-green-400 hover:underline disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={resolvingRequestId === req.id}
                            onClick={() => handleResolveAccessRequest(req.id, 'rejected')}
                            className="text-sm text-red-400 hover:underline disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {invites && invites.length > 0 && (
                <section className="mb-10">
                  <h3 className="mb-4 text-lg font-semibold">Pending Invites</h3>
                  <div className="overflow-hidden rounded-lg border border-admin-border">
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-4 border-b border-admin-border bg-admin-surface p-4 last:border-0">
                        <div>
                          <p className="font-medium">{inv.email}</p>
                          <p className="text-sm capitalize text-admin-muted">{inv.workspace_role}</p>
                        </div>
                        {canManage && (
                          <button type="button" onClick={() => handleRevokeInvite(inv.id)} className="text-sm text-red-400 hover:underline">
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {canManage && (
                <section>
                  <h3 className="mb-4 text-lg font-semibold">Invite Someone</h3>
                  <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
                    <div className="flex-1">
                      <label htmlFor="invite-email" className="mb-1 block text-sm font-medium">
                        Email
                      </label>
                      <input
                        id="invite-email"
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="teammate@example.com"
                        className="w-full rounded-lg border border-admin-border bg-admin-surface p-2.5"
                      />
                    </div>
                    <div>
                      <label htmlFor="invite-role" className="mb-1 block text-sm font-medium">
                        Role
                      </label>
                      <select
                        id="invite-role"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as SocialWorkspaceRole)}
                        className="rounded-lg border border-admin-border bg-admin-surface p-2.5"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !inviteEmail.trim()}
                      className="rounded-lg bg-admin-text px-4 py-2.5 font-medium text-admin-bg disabled:opacity-50"
                    >
                      {isSubmitting ? 'Inviting…' : 'Invite'}
                    </button>
                  </form>
                  <p className="mt-2 text-sm text-admin-muted">
                    If they already have a NOT4NORMAL admin account, they get access immediately. Otherwise they&apos;ll get an email invite to create one.
                  </p>
                </section>
              )}

              <section className="mt-10 border-t border-admin-border pt-6">
                <button
                  type="button"
                  onClick={() => router.push('/admin/personal-brand')}
                  className="text-sm text-admin-muted underline hover:text-admin-text"
                >
                  Back to Social Media
                </button>
              </section>
            </>
          )}
        </div>
      </Container>
    </main>
  )
}
