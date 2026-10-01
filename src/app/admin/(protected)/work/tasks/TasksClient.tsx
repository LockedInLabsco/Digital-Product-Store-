'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminButton from '@/src/components/admin/AdminButton'
import AdminModal from '@/src/components/admin/AdminModal'
import type { WkTask, WkTaskPriority, WkTaskStatus } from '@/src/types/work'

const STATUS_LABELS: Record<WkTaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_OPTIONS: WkTaskStatus[] = ['not_started', 'in_progress', 'blocked', 'completed', 'cancelled']
const PRIORITY_OPTIONS: WkTaskPriority[] = ['low', 'normal', 'high']

const STATUS_STYLES: Record<WkTaskStatus, string> = {
  not_started: 'bg-admin-surface2 text-admin-muted',
  in_progress: 'bg-blue-950/40 text-blue-400',
  blocked: 'bg-red-950/40 text-red-400',
  completed: 'bg-green-950/40 text-green-400',
  cancelled: 'bg-admin-surface2 text-admin-faint',
}

const PRIORITY_STYLES: Record<WkTaskPriority, string> = {
  low: 'bg-admin-surface2 text-admin-muted',
  normal: 'bg-admin-surface2 text-admin-text',
  high: 'bg-orange-950/40 text-orange-400',
}

interface TeamOption {
  id: string
  name: string
  myRole: 'lead' | 'member' | null
}

interface TeamMemberOption {
  admin_user_id: string
  email: string
  team_role: 'lead' | 'member'
}

interface TaskFormState {
  title: string
  description: string
  priority: WkTaskPriority
  status: WkTaskStatus
  blocked_reason: string
  start_date: string
  due_date: string
  due_time: string
  team_id: string
  assignee_id: string
}

const EMPTY_FORM: TaskFormState = {
  title: '',
  description: '',
  priority: 'normal',
  status: 'not_started',
  blocked_reason: '',
  start_date: '',
  due_date: '',
  due_time: '',
  team_id: '',
  assignee_id: '',
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}

export default function TasksClient() {
  const router = useRouter()
  const [tasks, setTasks] = useState<WkTask[]>([])
  const [people, setPeople] = useState<Record<string, string>>({})
  const [teamsById, setTeamsById] = useState<Record<string, string>>({})
  const [myAdminUserId, setMyAdminUserId] = useState<string | null>(null)
  const [allTeams, setAllTeams] = useState<TeamOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [statusFilter, setStatusFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM)
  const [formTeamMembers, setFormTeamMembers] = useState<TeamMemberOption[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (teamFilter) params.set('team_id', teamFilter)
      const response = await fetch(`/api/admin/work/tasks?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(data.error || 'Failed to load tasks')
      }

      setTasks(data.tasks || [])
      setPeople(data.people || {})
      setTeamsById(data.teams || {})
      setMyAdminUserId(data.myAdminUserId || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }, [router, statusFilter, teamFilter])

  const loadTeams = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/work/teams')
      const data = await response.json()
      if (response.ok) setAllTeams(data.teams || [])
    } catch {
      // Team filter/picker just stays empty — not fatal for viewing tasks.
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  // Load the selected team's members whenever the form's team changes, so
  // the assignee dropdown only ever offers people genuinely on that team.
  useEffect(() => {
    if (!form.team_id) {
      setFormTeamMembers([])
      return
    }
    let cancelled = false
    fetch(`/api/admin/work/teams/${form.team_id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.members) return
        setFormTeamMembers(
          data.members.map((m: { admin_user_id: string; email: string; team_role: 'lead' | 'member' }) => ({
            admin_user_id: m.admin_user_id,
            email: m.email,
            team_role: m.team_role,
          }))
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [form.team_id])

  const openCreateModal = () => {
    setEditingTaskId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  const openEditModal = (task: WkTask) => {
    setEditingTaskId(task.id)
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      blocked_reason: task.blocked_reason || '',
      start_date: task.start_date || '',
      due_date: task.due_date || '',
      due_time: task.due_time || '',
      team_id: task.team_id || '',
      assignee_id: task.assignee_id || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (form.status === 'blocked' && !form.blocked_reason.trim()) {
      setFormError('A blocked task requires a reason')
      return
    }

    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        status: form.status,
        blocked_reason: form.status === 'blocked' ? form.blocked_reason : null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        due_time: form.due_time || null,
        team_id: form.team_id || null,
        assignee_id: form.assignee_id || null,
      }
      const url = editingTaskId ? `/api/admin/work/tasks/${editingTaskId}` : '/api/admin/work/tasks'
      const method = editingTaskId ? 'PATCH' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save task')

      setModalOpen(false)
      await loadTasks()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save task')
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuickStatusChange = async (task: WkTask, status: WkTaskStatus) => {
    if (status === 'blocked') {
      // Blocked requires a reason — send them to the full form instead of
      // silently failing the quick-change.
      openEditModal(task)
      setForm((f) => ({ ...f, status: 'blocked' }))
      return
    }

    setBusyTaskId(task.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/work/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update status')
      await loadTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setBusyTaskId(null)
    }
  }

  const handleDelete = async (task: WkTask) => {
    if (!confirm(`Delete "${task.title}"?`)) return
    setBusyTaskId(task.id)
    setError('')
    try {
      const response = await fetch(`/api/admin/work/tasks/${task.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to delete task')
      await loadTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    } finally {
      setBusyTaskId(null)
    }
  }

  const assigneeOptions = useMemo(() => {
    const options = formTeamMembers.map((m) => ({
      id: m.admin_user_id,
      label: `${m.email}${m.team_role === 'lead' ? ' (Lead)' : ''}`,
    }))
    if (myAdminUserId && !options.some((o) => o.id === myAdminUserId)) {
      options.unshift({ id: myAdminUserId, label: 'Myself' })
    }
    return options
  }, [formTeamMembers, myAdminUserId])

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Tasks</h2>
          <p className="text-admin-muted">Work assigned to you, created by you, or on teams you lead.</p>
        </div>
        <AdminButton onClick={openCreateModal}>New Task</AdminButton>
      </div>

      {error && <div className="mb-6 rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-400">{error}</div>}

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-sm"
        >
          <option value="">All teams</option>
          {allTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-admin-muted">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-admin-border bg-admin-surface p-12 text-center text-admin-muted">
          No tasks match these filters yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-admin-border bg-admin-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-admin-border">
                <th className="px-4 py-3 text-left text-sm font-semibold">Title</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Priority</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Assignee</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Team</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Due</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-admin-border last:border-b-0">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{task.title}</div>
                    {task.status === 'blocked' && task.blocked_reason && (
                      <div className="mt-0.5 text-xs text-red-400">Blocked: {task.blocked_reason}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={task.status}
                      disabled={busyTaskId === task.id}
                      onChange={(e) => handleQuickStatusChange(task, e.target.value as WkTaskStatus)}
                      className={`rounded-full border-0 px-3 py-1 text-xs font-medium capitalize disabled:opacity-50 ${STATUS_STYLES[task.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-admin-muted">
                    {task.assignee_id ? people[task.assignee_id] || 'Unknown' : 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-sm text-admin-muted">{task.team_id ? teamsById[task.team_id] || 'Unknown' : '-'}</td>
                  <td className="px-4 py-3 text-sm text-admin-muted">{formatDate(task.due_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEditModal(task)}
                        className="text-sm font-medium text-admin-text hover:text-admin-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task)}
                        disabled={busyTaskId === task.id}
                        className="text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <AdminModal title={editingTaskId ? 'Edit Task' : 'New Task'} onClose={() => setModalOpen(false)} maxWidthClassName="max-w-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {formError && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{formError}</div>}

            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as WkTaskPriority }))}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as WkTaskStatus }))}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.status === 'blocked' && (
              <div>
                <label className="mb-1 block text-sm font-medium">Blocked reason</label>
                <input
                  required
                  value={form.blocked_reason}
                  onChange={(e) => setForm((f) => ({ ...f, blocked_reason: e.target.value }))}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Start date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Due date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Due time</label>
                <input
                  type="time"
                  value={form.due_time}
                  onChange={(e) => setForm((f) => ({ ...f, due_time: e.target.value }))}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Team</label>
                <select
                  value={form.team_id}
                  onChange={(e) => setForm((f) => ({ ...f, team_id: e.target.value, assignee_id: '' }))}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                >
                  <option value="">No team (personal)</option>
                  {allTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Assignee</label>
                <select
                  value={form.assignee_id}
                  onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
                  className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                  disabled={!form.team_id && assigneeOptions.length <= 1}
                >
                  <option value="">Myself</option>
                  {assigneeOptions
                    .filter((o) => o.id !== myAdminUserId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-admin-faint">Assigning to someone else requires picking a team you lead.</p>
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <AdminButton type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : editingTaskId ? 'Save Changes' : 'Create Task'}
              </AdminButton>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  )
}
