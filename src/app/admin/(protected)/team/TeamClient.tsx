'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from '@/src/lib/admin/permissions'
import type { AdminInvite, AdminRole, AdminUser } from '@/src/types/admin'

function formatDate(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value))
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-950/40 text-green-400',
  disabled: 'bg-red-950/40 text-red-400',
}

export default function TeamClient({ canManage }: { canManage: boolean }) {
  const router = useRouter()
  const [members, setMembers] = useState<AdminUser[]>([])
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<AdminRole>('analyst')
  const [isInviting, setIsInviting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await fetch('/api/admin/team')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(data.error || 'Failed to load team')
      }

      setMembers(data.members || [])
      setInvites(data.invites || [])
      setCurrentUserId(data.currentUserId || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsInviting(true)
    setError('')
    try {
      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send invite')
      setInviteEmail('')
      setInviteRole('analyst')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (id: string, role: AdminRole) => {
    setBusyId(id)
    setError('')
    try {
      const response = await fetch(`/api/admin/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to change role')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role')
    } finally {
      setBusyId(null)
    }
  }

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    setBusyId(id)
    setError('')
    try {
      const response = await fetch(`/api/admin/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: currentStatus === 'active' ? 'disabled' : 'active' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update status')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from the admin team?`)) return
    setBusyId(id)
    setError('')
    try {
      const response = await fetch(`/api/admin/team/${id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to remove team member')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove team member')
    } finally {
      setBusyId(null)
    }
  }

  const handleRevokeInvite = async (id: string) => {
    setBusyId(id)
    setError('')
    try {
      const response = await fetch(`/api/admin/team/invites/${id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to revoke invite')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Team</h2>
            <p className="text-admin-muted">Manage who has access to this admin workspace</p>
          </div>

          {error && (
            <div className="p-4 bg-red-950/40 border border-red-900 rounded-lg text-red-400 mb-8">{error}</div>
          )}

          {canManage && (
            <form
              onSubmit={handleInvite}
              className="mb-10 flex flex-col gap-3 rounded-lg border border-admin-border bg-admin-surface p-5 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label htmlFor="invite-email" className="block text-sm font-medium mb-2">
                  Invite by email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="w-full px-4 py-2 border border-admin-border rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-accent"
                />
              </div>
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium mb-2">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  className="w-full px-4 py-2 border border-admin-border rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-accent sm:w-48"
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ADMIN_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={isInviting} className="bg-admin-accent text-admin-accentText hover:bg-admin-accentHover">
                {isInviting ? 'Sending…' : 'Invite member'}
              </Button>
            </form>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-admin-muted">Loading team…</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-admin-border bg-admin-surface">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-admin-border">
                      <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Joined</th>
                      {canManage && <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const isYou = member.user_id === currentUserId
                      return (
                        <tr key={member.id} className="border-b border-admin-border">
                          <td className="py-3 px-4 text-sm">
                            {member.email} {isYou && <span className="text-admin-faint">(you)</span>}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {canManage ? (
                              <select
                                value={member.role}
                                disabled={busyId === member.id}
                                onChange={(e) => handleRoleChange(member.id, e.target.value as AdminRole)}
                                className="rounded border border-admin-border px-2 py-1 text-sm disabled:opacity-50"
                              >
                                {ADMIN_ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {ADMIN_ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              ADMIN_ROLE_LABELS[member.role]
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                STATUS_STYLES[member.status] || 'bg-admin-surface2 text-admin-text'
                              }`}
                            >
                              {member.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-admin-muted">{formatDate(member.created_at)}</td>
                          {canManage && (
                            <td className="py-3 px-4">
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleStatusToggle(member.id, member.status)}
                                  disabled={busyId === member.id}
                                  className="text-sm font-medium text-admin-text hover:text-admin-muted disabled:opacity-50"
                                >
                                  {member.status === 'active' ? 'Disable' : 'Enable'}
                                </button>
                                <button
                                  onClick={() => handleRemove(member.id, member.email)}
                                  disabled={busyId === member.id}
                                  className="text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {invites.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-lg font-bold mb-4">Pending invites</h3>
                  <div className="overflow-x-auto rounded-lg border border-admin-border bg-admin-surface">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-admin-border">
                          <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Invited</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Expires</th>
                          {canManage && <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {invites.map((invite) => (
                          <tr key={invite.id} className="border-b border-admin-border">
                            <td className="py-3 px-4 text-sm">{invite.email}</td>
                            <td className="py-3 px-4 text-sm">{ADMIN_ROLE_LABELS[invite.role]}</td>
                            <td className="py-3 px-4 text-sm text-admin-muted">{formatDate(invite.created_at)}</td>
                            <td className="py-3 px-4 text-sm text-admin-muted">{formatDate(invite.expires_at)}</td>
                            {canManage && (
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => handleRevokeInvite(invite.id)}
                                  disabled={busyId === invite.id}
                                  className="text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                                >
                                  Revoke
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </main>
  )
}
