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

/** Toggleable role chips — a person can hold more than one role at once
 * (e.g. Founder + Social Media), so this is a multi-select, never a
 * dropdown that can only hold one value. */
function RoleChips({
  selected,
  onToggle,
  disabled,
}: {
  selected: AdminRole[]
  onToggle: (role: AdminRole) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ADMIN_ROLES.map((role) => {
        const isSelected = selected.includes(role)
        return (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(role)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              isSelected
                ? 'border-admin-accent bg-admin-accent text-admin-accentText'
                : 'border-admin-border text-admin-muted hover:border-admin-faint hover:text-admin-text'
            }`}
          >
            {ADMIN_ROLE_LABELS[role]}
          </button>
        )
      })}
    </div>
  )
}

export default function TeamClient({ canManage }: { canManage: boolean }) {
  const router = useRouter()
  const [members, setMembers] = useState<AdminUser[]>([])
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoles, setInviteRoles] = useState<AdminRole[]>(['analyst'])
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

  const toggleInviteRole = (role: AdminRole) => {
    setInviteRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteRoles.length === 0) {
      setError('Select at least one role')
      return
    }
    setIsInviting(true)
    setError('')
    try {
      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, roles: inviteRoles }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send invite')
      setInviteEmail('')
      setInviteRoles(['analyst'])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setIsInviting(false)
    }
  }

  const handleToggleMemberRole = async (member: AdminUser, role: AdminRole) => {
    const nextRoles = member.roles.includes(role) ? member.roles.filter((r) => r !== role) : [...member.roles, role]
    if (nextRoles.length === 0) {
      setError('A team member needs at least one role')
      return
    }
    setBusyId(member.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: nextRoles }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to change roles')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change roles')
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
            <p className="text-admin-muted">Manage who has access to this admin workspace — a person can hold more than one role.</p>
          </div>

          {error && (
            <div className="p-4 bg-red-950/40 border border-red-900 rounded-lg text-red-400 mb-8">{error}</div>
          )}

          {canManage && (
            <form
              onSubmit={handleInvite}
              className="mb-10 flex flex-col gap-4 rounded-lg border border-admin-border bg-admin-surface p-5"
            >
              <div>
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
                  className="w-full max-w-sm px-4 py-2 border border-admin-border rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-accent"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Roles</p>
                <RoleChips selected={inviteRoles} onToggle={toggleInviteRole} />
              </div>
              <div>
                <Button type="submit" disabled={isInviting} className="bg-admin-accent text-admin-accentText hover:bg-admin-accentHover">
                  {isInviting ? 'Sending…' : 'Invite member'}
                </Button>
              </div>
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
                      <th className="text-left py-3 px-4 font-semibold text-sm">Roles</th>
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
                              <RoleChips
                                selected={member.roles}
                                onToggle={(role) => handleToggleMemberRole(member, role)}
                                disabled={busyId === member.id}
                              />
                            ) : (
                              member.roles.map((r) => ADMIN_ROLE_LABELS[r]).join(', ')
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
                          <th className="text-left py-3 px-4 font-semibold text-sm">Roles</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Invited</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Expires</th>
                          {canManage && <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {invites.map((invite) => (
                          <tr key={invite.id} className="border-b border-admin-border">
                            <td className="py-3 px-4 text-sm">{invite.email}</td>
                            <td className="py-3 px-4 text-sm">{invite.roles.map((r) => ADMIN_ROLE_LABELS[r]).join(', ')}</td>
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
