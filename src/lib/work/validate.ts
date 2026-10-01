import type { WkTaskPriority, WkTaskStatus } from '@/src/types/work'

/** Same ValidationResult<T> shape used throughout src/lib/personal-brand/validate.ts. */
export interface ValidationResult<T> {
  value?: T
  error?: string
}

const MAX_TITLE_LENGTH = 300
const MAX_LONG_TEXT = 5000

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/

export const WK_TASK_PRIORITIES: WkTaskPriority[] = ['low', 'normal', 'high']
export const WK_TASK_STATUSES: WkTaskStatus[] = ['not_started', 'in_progress', 'blocked', 'completed', 'cancelled']

function optionalShortText(value: unknown, label: string, maxLength = MAX_TITLE_LENGTH): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string') return { error: `${label} must be text` }
  const trimmed = value.trim()
  if (trimmed.length > maxLength) return { error: `${label} must be ${maxLength} characters or fewer` }
  return { value: trimmed || null }
}

function optionalLongText(value: unknown, label: string): ValidationResult<string | null> {
  return optionalShortText(value, label, MAX_LONG_TEXT)
}

function optionalUuid(value: unknown, label: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) return { error: `${label} is invalid` }
  return { value: value.toLowerCase() }
}

function optionalDate(value: unknown, label: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string' || !DATE_PATTERN.test(value) || Number.isNaN(new Date(value).getTime())) {
    return { error: `${label} must be a valid date (YYYY-MM-DD)` }
  }
  return { value }
}

function optionalTime(value: unknown, label: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) return { error: `${label} must be a valid time (HH:MM)` }
  return { value }
}

/** Shared status+blocked_reason rule — matches the DB's
 * wk_tasks_blocked_reason_check constraint (defense in depth, checked
 * here first so the client gets a clean 400 instead of a raw Postgres
 * error). */
export function validateBlockedReasonRule(status: WkTaskStatus, blockedReason: string | null): string | null {
  if (status === 'blocked' && !blockedReason) return 'A blocked task requires a blocked_reason'
  return null
}

/**
 * Derives the next `completed_at` value from a status transition — the
 * ONLY place that decides this field; a client can never set it directly
 * (TaskPatchInput has no completed_at key at all, so nothing upstream of
 * this function could even smuggle a client-provided value through).
 *
 * Returns `undefined` to mean "leave completed_at as it is" (no status
 * change, or a status change that isn't into/out of 'completed') — the
 * caller should only add completed_at to its update object when this
 * returns something other than undefined, so an unrelated edit (e.g.
 * just changing the title) never touches it.
 */
export function deriveCompletedAt(
  previousStatus: WkTaskStatus,
  nextStatus: WkTaskStatus | undefined,
  nowIso: string = new Date().toISOString()
): string | null | undefined {
  if (nextStatus === undefined || nextStatus === previousStatus) return undefined
  if (nextStatus === 'completed') return nowIso
  if (previousStatus === 'completed') return null
  return undefined
}

export interface TaskCreateInput {
  title: string
  description: string | null
  priority: WkTaskPriority
  status: WkTaskStatus
  blocked_reason: string | null
  start_date: string | null
  due_date: string | null
  due_time: string | null
  assignee_id: string | null
  team_id: string | null
}

/** Validates a task CREATE payload. `assignee_id`/`team_id` are parsed
 * here but NOT authorized here — the route resolves defaults (assignee
 * defaults to the creator) and checks canAssignTaskToUser/team
 * membership against src/lib/admin/workScope.ts before trusting them. */
export function validateTaskCreateInput(body: Record<string, unknown>): ValidationResult<TaskCreateInput> {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return { error: 'Title is required' }
  if (title.length > MAX_TITLE_LENGTH) return { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` }

  const priority = WK_TASK_PRIORITIES.includes(body.priority as WkTaskPriority) ? (body.priority as WkTaskPriority) : 'normal'
  const status = WK_TASK_STATUSES.includes(body.status as WkTaskStatus) ? (body.status as WkTaskStatus) : 'not_started'

  const description = optionalLongText(body.description, 'Description')
  if (description.error) return { error: description.error }
  const blockedReason = optionalShortText(body.blocked_reason, 'Blocked reason', MAX_LONG_TEXT)
  if (blockedReason.error) return { error: blockedReason.error }
  const startDate = optionalDate(body.start_date, 'Start date')
  if (startDate.error) return { error: startDate.error }
  const dueDate = optionalDate(body.due_date, 'Due date')
  if (dueDate.error) return { error: dueDate.error }
  const dueTime = optionalTime(body.due_time, 'Due time')
  if (dueTime.error) return { error: dueTime.error }
  const assigneeId = optionalUuid(body.assignee_id, 'Assignee')
  if (assigneeId.error) return { error: assigneeId.error }
  const teamId = optionalUuid(body.team_id, 'Team')
  if (teamId.error) return { error: teamId.error }

  const blockedRuleError = validateBlockedReasonRule(status, blockedReason.value ?? null)
  if (blockedRuleError) return { error: blockedRuleError }

  return {
    value: {
      title,
      description: description.value ?? null,
      priority,
      status,
      blocked_reason: blockedReason.value ?? null,
      start_date: startDate.value ?? null,
      due_date: dueDate.value ?? null,
      due_time: dueTime.value ?? null,
      assignee_id: assigneeId.value ?? null,
      team_id: teamId.value ?? null,
    },
  }
}

export interface TaskPatchInput {
  title?: string
  description?: string | null
  priority?: WkTaskPriority
  status?: WkTaskStatus
  blocked_reason?: string | null
  start_date?: string | null
  due_date?: string | null
  due_time?: string | null
  assignee_id?: string | null
  team_id?: string | null
}

/** Validates a task PATCH payload — only keys present in `body` are
 * validated/returned, so the route can tell "not provided" apart from
 * "explicitly cleared to null." `blocked_reason`'s requiredness is
 * re-checked by the route against the MERGED (existing + patch) status,
 * not here in isolation — a patch that only sends `{status: 'blocked'}`
 * must still be rejected if there's no blocked_reason on either side. */
export function validateTaskPatchInput(body: Record<string, unknown>): ValidationResult<TaskPatchInput> {
  const value: TaskPatchInput = {}

  if ('title' in body) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return { error: 'Title cannot be empty' }
    if (title.length > MAX_TITLE_LENGTH) return { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` }
    value.title = title
  }

  if ('priority' in body) {
    if (!WK_TASK_PRIORITIES.includes(body.priority as WkTaskPriority)) {
      return { error: `Priority must be one of: ${WK_TASK_PRIORITIES.join(', ')}` }
    }
    value.priority = body.priority as WkTaskPriority
  }

  if ('status' in body) {
    if (!WK_TASK_STATUSES.includes(body.status as WkTaskStatus)) {
      return { error: `Status must be one of: ${WK_TASK_STATUSES.join(', ')}` }
    }
    value.status = body.status as WkTaskStatus
  }

  if ('description' in body) {
    const description = optionalLongText(body.description, 'Description')
    if (description.error) return { error: description.error }
    value.description = description.value ?? null
  }

  if ('blocked_reason' in body) {
    const blockedReason = optionalShortText(body.blocked_reason, 'Blocked reason', MAX_LONG_TEXT)
    if (blockedReason.error) return { error: blockedReason.error }
    value.blocked_reason = blockedReason.value ?? null
  }

  if ('start_date' in body) {
    const startDate = optionalDate(body.start_date, 'Start date')
    if (startDate.error) return { error: startDate.error }
    value.start_date = startDate.value ?? null
  }

  if ('due_date' in body) {
    const dueDate = optionalDate(body.due_date, 'Due date')
    if (dueDate.error) return { error: dueDate.error }
    value.due_date = dueDate.value ?? null
  }

  if ('due_time' in body) {
    const dueTime = optionalTime(body.due_time, 'Due time')
    if (dueTime.error) return { error: dueTime.error }
    value.due_time = dueTime.value ?? null
  }

  if ('assignee_id' in body) {
    const assigneeId = optionalUuid(body.assignee_id, 'Assignee')
    if (assigneeId.error) return { error: assigneeId.error }
    value.assignee_id = assigneeId.value ?? null
  }

  if ('team_id' in body) {
    const teamId = optionalUuid(body.team_id, 'Team')
    if (teamId.error) return { error: teamId.error }
    value.team_id = teamId.value ?? null
  }

  return { value }
}

export interface TeamInput {
  name: string
  description: string | null
}

export function validateTeamInput(body: Record<string, unknown>): ValidationResult<TeamInput> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return { error: 'Name is required' }
  if (name.length > MAX_TITLE_LENGTH) return { error: `Name must be ${MAX_TITLE_LENGTH} characters or fewer` }

  const description = optionalLongText(body.description, 'Description')
  if (description.error) return { error: description.error }

  return { value: { name, description: description.value ?? null } }
}
