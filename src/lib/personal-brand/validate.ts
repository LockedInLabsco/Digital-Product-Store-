import {
  PB_CONTENT_STATUSES,
  PB_CONTENT_TYPES,
  PB_EXPERIMENT_STATUSES,
  PB_IDEA_PRIORITIES,
  PB_IDEA_STATUSES,
  PB_PLATFORMS,
  type PbContentStatus,
  type PbContentType,
  type PbExperimentStatus,
  type PbIdeaPriority,
  type PbIdeaStatus,
  type PbPlatform,
} from '@/src/types/personalBrand'

const MAX_SHORT_TEXT = 300
const MAX_LONG_TEXT = 20000
const MAX_TAGS = 20
const MAX_TAG_LENGTH = 40
const URL_MAX_LENGTH = 2048

export interface ContentItemInput {
  platform: PbPlatform
  content_type: PbContentType
  status: PbContentStatus
  title: string | null
  caption: string | null
  script: string | null
  transcript: string | null
  hook: string | null
  cta: string | null
  topic: string | null
  content_pillar: string | null
  goal: string | null
  format_id: string | null
  audio_used: string | null
  duration_seconds: number | null
  posted_at: string | null
  platform_url: string | null
  thumbnail_path: string | null
  notes: string | null
  tags: string[]
}

export interface ValidationResult<T> {
  value?: T
  error?: string
}

function optionalShortText(value: unknown, label: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string') return { error: `${label} must be text` }
  const trimmed = value.trim()
  if (trimmed.length > MAX_SHORT_TEXT) return { error: `${label} must be ${MAX_SHORT_TEXT} characters or fewer` }
  return { value: trimmed || null }
}

function optionalLongText(value: unknown, label: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string') return { error: `${label} must be text` }
  const trimmed = value.trim()
  if (trimmed.length > MAX_LONG_TEXT) return { error: `${label} must be ${MAX_LONG_TEXT} characters or fewer` }
  return { value: trimmed || null }
}

function optionalUrl(value: unknown, label: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string') return { error: `${label} must be text` }
  const trimmed = value.trim()
  if (trimmed.length > URL_MAX_LENGTH) return { error: `${label} is too long` }
  return { value: trimmed || null }
}

function optionalId(value: unknown, label: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string') return { error: `${label} is invalid` }
  return { value: value.trim() || null }
}

function optionalPositiveInt(value: unknown, label: string): ValidationResult<number | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num < 0) return { error: `${label} must be a non-negative number` }
  return { value: Math.round(num) }
}

function optionalTimestamp(value: unknown, label: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  if (typeof value !== 'string') return { error: `${label} is invalid` }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { error: `${label} is not a valid date` }
  return { value: date.toISOString() }
}

function parseTags(value: unknown): ValidationResult<string[]> {
  if (value === undefined || value === null) return { value: [] }
  if (!Array.isArray(value)) return { error: 'Tags must be a list' }
  if (value.length > MAX_TAGS) return { error: `A content item can have at most ${MAX_TAGS} tags` }

  const tags: string[] = []
  for (const raw of value) {
    if (typeof raw !== 'string') return { error: 'Each tag must be text' }
    const trimmed = raw.trim().toLowerCase()
    if (!trimmed) continue
    if (trimmed.length > MAX_TAG_LENGTH) return { error: `Tags must be ${MAX_TAG_LENGTH} characters or fewer` }
    if (!tags.includes(trimmed)) tags.push(trimmed)
  }
  return { value: tags }
}

/**
 * Validates + normalizes a content item create/update payload. Every
 * field except platform/content_type/status is optional — this is a
 * personal content log, not a form with mandatory metadata, so an admin
 * can save a bare draft with just a title and fill in the rest later.
 */
export function validateContentItemInput(body: Record<string, unknown>): ValidationResult<ContentItemInput> {
  const platform = typeof body.platform === 'string' ? body.platform : 'instagram'
  if (!PB_PLATFORMS.includes(platform as PbPlatform)) {
    return { error: `Platform must be one of: ${PB_PLATFORMS.join(', ')}` }
  }

  const contentType = body.content_type
  if (typeof contentType !== 'string' || !PB_CONTENT_TYPES.includes(contentType as PbContentType)) {
    return { error: `Content type must be one of: ${PB_CONTENT_TYPES.join(', ')}` }
  }

  const status = typeof body.status === 'string' ? body.status : 'draft'
  if (!PB_CONTENT_STATUSES.includes(status as PbContentStatus)) {
    return { error: `Status must be one of: ${PB_CONTENT_STATUSES.join(', ')}` }
  }

  const title = optionalShortText(body.title, 'Title')
  if (title.error) return { error: title.error }
  const caption = optionalLongText(body.caption, 'Caption')
  if (caption.error) return { error: caption.error }
  const script = optionalLongText(body.script, 'Script')
  if (script.error) return { error: script.error }
  const transcript = optionalLongText(body.transcript, 'Transcript')
  if (transcript.error) return { error: transcript.error }
  const hook = optionalLongText(body.hook, 'Hook')
  if (hook.error) return { error: hook.error }
  const cta = optionalShortText(body.cta, 'CTA')
  if (cta.error) return { error: cta.error }
  const topic = optionalShortText(body.topic, 'Topic')
  if (topic.error) return { error: topic.error }
  const contentPillar = optionalShortText(body.content_pillar, 'Content pillar')
  if (contentPillar.error) return { error: contentPillar.error }
  const goal = optionalShortText(body.goal, 'Goal')
  if (goal.error) return { error: goal.error }
  const audioUsed = optionalShortText(body.audio_used, 'Audio used')
  if (audioUsed.error) return { error: audioUsed.error }
  const notes = optionalLongText(body.notes, 'Notes')
  if (notes.error) return { error: notes.error }
  const formatId = optionalId(body.format_id, 'Format')
  if (formatId.error) return { error: formatId.error }
  const duration = optionalPositiveInt(body.duration_seconds, 'Duration')
  if (duration.error) return { error: duration.error }
  const postedAt = optionalTimestamp(body.posted_at, 'Posted date')
  if (postedAt.error) return { error: postedAt.error }
  const platformUrl = optionalUrl(body.platform_url, 'Platform URL')
  if (platformUrl.error) return { error: platformUrl.error }
  const thumbnailPath = optionalUrl(body.thumbnail_path, 'Thumbnail URL')
  if (thumbnailPath.error) return { error: thumbnailPath.error }
  const tags = parseTags(body.tags)
  if (tags.error) return { error: tags.error }

  return {
    value: {
      platform: platform as PbPlatform,
      content_type: contentType as PbContentType,
      status: status as PbContentStatus,
      title: title.value ?? null,
      caption: caption.value ?? null,
      script: script.value ?? null,
      transcript: transcript.value ?? null,
      hook: hook.value ?? null,
      cta: cta.value ?? null,
      topic: topic.value ?? null,
      content_pillar: contentPillar.value ?? null,
      goal: goal.value ?? null,
      format_id: formatId.value ?? null,
      audio_used: audioUsed.value ?? null,
      duration_seconds: duration.value ?? null,
      posted_at: postedAt.value ?? null,
      platform_url: platformUrl.value ?? null,
      thumbnail_path: thumbnailPath.value ?? null,
      notes: notes.value ?? null,
      tags: tags.value ?? [],
    },
  }
}

export interface ContentMetricInput {
  recorded_at: string
  views: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  followers_gained: number | null
  profile_visits: number | null
  dms_generated: number | null
  watch_time_seconds: number | null
  average_watch_time_seconds: number | null
  completion_rate: number | null
}

function optionalNonNegativeNumber(value: unknown, label: string): ValidationResult<number | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num < 0) return { error: `${label} must be a non-negative number` }
  return { value: num }
}

function optionalRateFraction(value: unknown, label: string): ValidationResult<number | null> {
  if (value === undefined || value === null || value === '') return { value: null }
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num < 0 || num > 1) return { error: `${label} must be between 0 and 1` }
  return { value: num }
}

/**
 * Validates a metrics snapshot. Every performance field is optional —
 * platforms don't expose the same metrics, and a snapshot taken a few
 * hours after posting won't have every number yet. Only `recorded_at`
 * (defaults to now) is required.
 */
export function validateContentMetricInput(body: Record<string, unknown>): ValidationResult<ContentMetricInput> {
  const recordedAt = optionalTimestamp(body.recorded_at, 'Recorded at')
  if (recordedAt.error) return { error: recordedAt.error }

  const numericFields: [string, unknown][] = [
    ['Views', body.views],
    ['Reach', body.reach],
    ['Likes', body.likes],
    ['Comments', body.comments],
    ['Shares', body.shares],
    ['Saves', body.saves],
    ['Followers gained', body.followers_gained],
    ['Profile visits', body.profile_visits],
    ['DMs generated', body.dms_generated],
    ['Watch time', body.watch_time_seconds],
    ['Average watch time', body.average_watch_time_seconds],
  ]

  const parsed: Record<string, number | null> = {}
  for (const [label, raw] of numericFields) {
    const result = optionalNonNegativeNumber(raw, label)
    if (result.error) return { error: result.error }
    parsed[label] = result.value ?? null
  }

  const completionRate = optionalRateFraction(body.completion_rate, 'Completion rate')
  if (completionRate.error) return { error: completionRate.error }

  return {
    value: {
      recorded_at: recordedAt.value ?? new Date().toISOString(),
      views: parsed['Views'] ?? null,
      reach: parsed['Reach'] ?? null,
      likes: parsed['Likes'] ?? null,
      comments: parsed['Comments'] ?? null,
      shares: parsed['Shares'] ?? null,
      saves: parsed['Saves'] ?? null,
      followers_gained: parsed['Followers gained'] ?? null,
      profile_visits: parsed['Profile visits'] ?? null,
      dms_generated: parsed['DMs generated'] ?? null,
      watch_time_seconds: parsed['Watch time'] ?? null,
      average_watch_time_seconds: parsed['Average watch time'] ?? null,
      completion_rate: completionRate.value ?? null,
    },
  }
}

export interface FormatInput {
  name: string
  description: string | null
  hook_structure: string | null
  body_structure: string | null
  cta_structure: string | null
  status: 'active' | 'retired'
  notes: string | null
}

export function validateFormatInput(body: Record<string, unknown>): ValidationResult<FormatInput> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return { error: 'Name is required' }
  if (name.length > MAX_SHORT_TEXT) return { error: `Name must be ${MAX_SHORT_TEXT} characters or fewer` }

  const status = body.status === 'retired' ? 'retired' : 'active'

  const description = optionalLongText(body.description, 'Description')
  if (description.error) return { error: description.error }
  const hookStructure = optionalLongText(body.hook_structure, 'Hook structure')
  if (hookStructure.error) return { error: hookStructure.error }
  const bodyStructure = optionalLongText(body.body_structure, 'Body structure')
  if (bodyStructure.error) return { error: bodyStructure.error }
  const ctaStructure = optionalLongText(body.cta_structure, 'CTA structure')
  if (ctaStructure.error) return { error: ctaStructure.error }
  const notes = optionalLongText(body.notes, 'Notes')
  if (notes.error) return { error: notes.error }

  return {
    value: {
      name,
      description: description.value ?? null,
      hook_structure: hookStructure.value ?? null,
      body_structure: bodyStructure.value ?? null,
      cta_structure: ctaStructure.value ?? null,
      status,
      notes: notes.value ?? null,
    },
  }
}

export interface IdeaInput {
  title: string
  raw_idea: string | null
  notes: string | null
  topic: string | null
  content_pillar: string | null
  possible_hook: string | null
  format_id: string | null
  priority: PbIdeaPriority
  status: PbIdeaStatus
  source: string | null
}

export function validateIdeaInput(body: Record<string, unknown>): ValidationResult<IdeaInput> {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return { error: 'Title is required' }
  if (title.length > MAX_SHORT_TEXT) return { error: `Title must be ${MAX_SHORT_TEXT} characters or fewer` }

  const priority = PB_IDEA_PRIORITIES.includes(body.priority as PbIdeaPriority) ? (body.priority as PbIdeaPriority) : 'normal'
  const status = PB_IDEA_STATUSES.includes(body.status as PbIdeaStatus) ? (body.status as PbIdeaStatus) : 'idea'

  const rawIdea = optionalLongText(body.raw_idea, 'Raw idea')
  if (rawIdea.error) return { error: rawIdea.error }
  const notes = optionalLongText(body.notes, 'Notes')
  if (notes.error) return { error: notes.error }
  const topic = optionalShortText(body.topic, 'Topic')
  if (topic.error) return { error: topic.error }
  const contentPillar = optionalShortText(body.content_pillar, 'Content pillar')
  if (contentPillar.error) return { error: contentPillar.error }
  const possibleHook = optionalLongText(body.possible_hook, 'Possible hook')
  if (possibleHook.error) return { error: possibleHook.error }
  const formatId = optionalId(body.format_id, 'Format')
  if (formatId.error) return { error: formatId.error }
  const source = optionalShortText(body.source, 'Source')
  if (source.error) return { error: source.error }

  return {
    value: {
      title,
      raw_idea: rawIdea.value ?? null,
      notes: notes.value ?? null,
      topic: topic.value ?? null,
      content_pillar: contentPillar.value ?? null,
      possible_hook: possibleHook.value ?? null,
      format_id: formatId.value ?? null,
      priority,
      status,
      source: source.value ?? null,
    },
  }
}

export interface ExperimentInput {
  name: string
  hypothesis: string | null
  variable_tested: string | null
  description: string | null
  status: PbExperimentStatus
  started_at: string | null
  ended_at: string | null
  result: string | null
  notes: string | null
}

export function validateExperimentInput(body: Record<string, unknown>): ValidationResult<ExperimentInput> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return { error: 'Name is required' }
  if (name.length > MAX_SHORT_TEXT) return { error: `Name must be ${MAX_SHORT_TEXT} characters or fewer` }

  const status = PB_EXPERIMENT_STATUSES.includes(body.status as PbExperimentStatus)
    ? (body.status as PbExperimentStatus)
    : 'planned'

  const hypothesis = optionalLongText(body.hypothesis, 'Hypothesis')
  if (hypothesis.error) return { error: hypothesis.error }
  const variableTested = optionalShortText(body.variable_tested, 'Variable tested')
  if (variableTested.error) return { error: variableTested.error }
  const description = optionalLongText(body.description, 'Description')
  if (description.error) return { error: description.error }
  const startedAt = optionalTimestamp(body.started_at, 'Started at')
  if (startedAt.error) return { error: startedAt.error }
  const endedAt = optionalTimestamp(body.ended_at, 'Ended at')
  if (endedAt.error) return { error: endedAt.error }
  const result = optionalLongText(body.result, 'Result')
  if (result.error) return { error: result.error }
  const notes = optionalLongText(body.notes, 'Notes')
  if (notes.error) return { error: notes.error }

  return {
    value: {
      name,
      hypothesis: hypothesis.value ?? null,
      variable_tested: variableTested.value ?? null,
      description: description.value ?? null,
      status,
      started_at: startedAt.value ?? null,
      ended_at: endedAt.value ?? null,
      result: result.value ?? null,
      notes: notes.value ?? null,
    },
  }
}
