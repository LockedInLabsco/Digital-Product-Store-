'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminButton from '@/src/components/admin/AdminButton'
import AdminModal from '@/src/components/admin/AdminModal'
import type { WkTeamRole } from '@/src/types/work'

interface TeamListItem {
  id: string
  name: string
  description: string | null
  myRole: WkTeamRole | null
}

interface TeamMemberRow {
  id: string
  admin_user_id: string
  team_role: WkTeamRole
  email: string
}

interface EligibleAdmin {
  id: string
  email: string
}

const ROLE_STYLES: Record<WkTeamRole, string> = {
  lead: 'bg-white/10 text-admin-text',
  member: 'bg-admin-surface2 text-admin-muted',
}

export default function TeamsClient() {
  const router = useRouter()
  const [teams, setTeams] = useState<TeamListItem[]>([])
  const [canCreate, setCanCreate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [detailTeamId, setDetailTeamId] = useState<string | null>(null)

  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await fetch('/api/admin/work/teams')
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(data.error || 'Failed to load teams')
      }
      setTeams(data.teams || [])
      setCanCreate(Boolean(data.canCreate))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/work/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, description: createDescription || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create team')
      setCreateOpen(false)
      setCreateName('')
      setCreateDescription('')
      await loadTeams()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Teams</h2>
          <p className="text-admin-muted">Organizational groups for assigning work — separate from admin panel access (see Team).</p>
        </div>
        {canCreate && <AdminButton onClick={() => setCreateOpen(true)}>New Team</AdminButton>}
      </div>

      {error && <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}

      {isLoading ? (
        <div className="py-12 text-center text-admin-muted">Loading teams…</div>
      ) : teams.length === 0 ? (
        <div className="rounded-lg border border-admin-border bg-admin-surface p-12 text-center text-admin-muted">
          {canCreate ? 'No teams yet — create the first one.' : "You don't belong to any teams yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-admin-border bg-admin-surface p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-bold">{team.name}</h3>
                {team.myRole && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[team.myRole]}`}>
                    {team.myRole}
                  </span>
                )}
              </div>
              {team.description && <p className="mb-4 text-sm text-admin-muted">{team.description}</p>}
              <button
                onClick={() => setDetailTeamId(team.id)}
                className="text-sm font-medium text-admin-text hover:text-admin-muted"
              >
                View members -&gt;
              </button>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <AdminModal title="New Team" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {createError && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{createError}</div>}
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
            </div>
            <div className="mt-2 flex justify-end gap-3">
              <AdminButton type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={isCreating}>
                {isCreating ? 'Creating…' : 'Create Team'}
              </AdminButton>
            </div>
          </form>
        </AdminModal>
      )}

      {detailTeamId && (
        <TeamDetailModal teamId={detailTeamId} onClose={() => setDetailTeamId(null)} onChanged={loadTeams} />
      )}
    </div>
  )
}

function TeamDetailModal({ teamId, onClose, onChanged }: { teamId: string; onClose: () => void; onChanged: () => void }) {
  const [team, setTeam] = useState<{ id: string; name: string; description: string | null } | null>(null)
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [canManage, setCanManage] = useState(false)
  const [eligibleAdmins, setEligibleAdmins] = useState<EligibleAdmin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)

  const [addAdminId, setAddAdminId] = useState('')
  const [addRole, setAddRole] = useState<WkTeamRole>('member')
  const [isAdding, setIsAdding] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await fetch(`/api/admin/work/teams/${teamId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load team')
      setTeam(data.team)
      setMembers(data.members || [])
      setCanManage(Boolean(data.canManage))
      setEligibleAdmins(data.eligibleAdmins || [])
      setEditName(data.team?.name || '')
      setEditDescription(data.team?.description || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team')
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    load()
  }, [load])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addAdminId) return
    setIsAdding(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/work/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_user_id: addAdminId, team_role: addRole }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to add member')
      setAddAdminId('')
      setAddRole('member')
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRoleToggle = async (member: TeamMemberRow) => {
    const nextRole: WkTeamRole = member.team_role === 'lead' ? 'member' : 'lead'
    setBusyMemberId(member.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/work/teams/${teamId}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_role: nextRole }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to change role')
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role')
    } finally {
      setBusyMemberId(null)
    }
  }

  const handleRemove = async (member: TeamMemberRow) => {
    if (!confirm(`Remove ${member.email} from this team?`)) return
    setBusyMemberId(member.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/work/teams/${teamId}/members/${member.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to remove member')
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setBusyMemberId(null)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingEdit(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/work/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update team')
      setIsEditing(false)
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team')
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <AdminModal title={team?.name || 'Team'} onClose={onClose}>
      {isLoading ? (
        <div className="py-8 text-center text-admin-muted">Loading…</div>
      ) : (
        <div className="flex flex-col gap-5">
          {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{error}</div>}

          {canManage && isEditing ? (
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
                />
              </div>
              <div className="flex gap-3">
                <AdminButton type="submit" size="sm" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving…' : 'Save'}
                </AdminButton>
                <AdminButton type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </AdminButton>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-2">
              {team?.description ? <p className="text-sm text-admin-muted">{team.description}</p> : <span />}
              {canManage && (
                <button onClick={() => setIsEditing(true)} className="shrink-0 text-sm font-medium text-admin-text hover:text-admin-muted">
                  Edit
                </button>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold">Members</p>
            <div className="flex flex-col gap-2">
              {members.length === 0 && <p className="text-sm text-admin-muted">No members yet.</p>}
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-2 rounded-lg border border-admin-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{member.email}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[member.team_role]}`}>
                      {member.team_role}
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-3">
                      <button
                        onClick={() => handleRoleToggle(member)}
                        disabled={busyMemberId === member.id}
                        className="text-xs font-medium text-admin-text hover:text-admin-muted disabled:opacity-50"
                      >
                        {member.team_role === 'lead' ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        onClick={() => handleRemove(member)}
                        disabled={busyMemberId === member.id}
                        className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {canManage && (
            <form onSubmit={handleAddMember} className="flex flex-col gap-3 border-t border-admin-border pt-4">
              <p className="text-sm font-semibold">Add member</p>
              <div className="flex gap-2">
                <select
                  value={addAdminId}
                  onChange={(e) => setAddAdminId(e.target.value)}
                  className="flex-1 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                >
                  <option value="">Select an admin…</option>
                  {eligibleAdmins.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.email}
                    </option>
                  ))}
                </select>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as WkTeamRole)}
                  className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
              <AdminButton type="submit" disabled={isAdding || !addAdminId} size="sm">
                {isAdding ? 'Adding…' : 'Add Member'}
              </AdminButton>
            </form>
          )}
        </div>
      )}
    </AdminModal>
  )
}
