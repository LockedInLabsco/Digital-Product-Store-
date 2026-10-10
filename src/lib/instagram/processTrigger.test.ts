import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

interface CannedResponse {
  data: unknown
  error: unknown
}

const mocks = vi.hoisted(() => ({
  script: {} as Record<string, CannedResponse[]>,
  counters: {} as Record<string, number>,
  eqCalls: [] as { table: string; column: string; value: unknown }[],
}))

function queue(table: string, responses: CannedResponse[]) {
  mocks.script[table] = responses
}

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn((table: string) => {
      const idx = mocks.counters[table] ?? 0
      mocks.counters[table] = idx + 1
      const response = mocks.script[table]?.[idx] ?? { data: null, error: null }

      const chain: Record<string, unknown> = {}
      for (const method of ['select', 'insert', 'update', 'order', 'limit', 'not']) {
        chain[method] = vi.fn(() => chain)
      }
      chain.eq = vi.fn((column: string, value: unknown) => {
        mocks.eqCalls.push({ table, column, value })
        return chain
      })
      chain.maybeSingle = vi.fn(async () => response)
      chain.single = vi.fn(async () => response)
      chain.then = ((resolve: (v: CannedResponse) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(response).then(resolve, reject)) as unknown
      return chain
    }),
  },
}))

const sendMocks = vi.hoisted(() => ({
  sendDirectMessage: vi.fn(),
  sendPrivateReplyToComment: vi.fn(),
  replyToComment: vi.fn(),
}))
vi.mock('./client', () => sendMocks)
const { sendDirectMessage, sendPrivateReplyToComment, replyToComment } = sendMocks

import { processTrigger, type TriggerEvent } from './processTrigger'

const DM_RULE = {
  id: 'rule-a',
  connected_account_id: 'account-a',
  name: 'slowday',
  trigger_type: 'dm_keyword',
  keyword: 'slowday',
  match_type: 'contains',
  reply_message: 'hey!',
  button_url: null,
  button_label: null,
  instagram_media_id: null,
  public_reply_enabled: false,
  public_reply_variations: [],
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const COMMENT_RULE = { ...DM_RULE, id: 'rule-comment', trigger_type: 'comment_keyword' }

beforeEach(() => {
  mocks.script = {}
  mocks.counters = {}
  mocks.eqCalls = []
  sendDirectMessage.mockReset()
  sendPrivateReplyToComment.mockReset()
  replyToComment.mockReset()
})

function dmEvent(overrides: Partial<TriggerEvent> = {}): TriggerEvent {
  return {
    triggerType: 'dm_keyword',
    sourceType: 'dm',
    sourceId: 'mid-123',
    recipientIgId: 'igsid-sender',
    text: 'slowday',
    connectedAccountId: 'account-a',
    ...overrides,
  }
}

describe('processTrigger — DM keyword (TEST A)', () => {
  it('matches Account A’s own rule, records a run, and sends from Account A’s own token', async () => {
    queue('ig_automation_rules', [{ data: [DM_RULE], error: null }])
    queue('ig_automation_runs', [{ data: { id: 'run-1' }, error: null }])
    sendDirectMessage.mockResolvedValue({ ok: true, data: { id: 'sent-1' } })

    await processTrigger(dmEvent())

    // Omitting TriggerEvent.provider keeps the existing, unchanged
    // default: every pre-existing caller (the current
    // /api/webhooks/instagram route, the follow-up cron) still sends
    // through the instagram_login token.
    expect(sendDirectMessage).toHaveBeenCalledWith('account-a', 'igsid-sender', 'hey!', null, 'instagram_login')
    // The rules query scoped itself to this event's own connected
    // account — the actual account-isolation mechanism (CASE/Test B
    // below proves the OUTCOME; this proves the QUERY itself does it).
    expect(mocks.eqCalls).toContainEqual({ table: 'ig_automation_rules', column: 'connected_account_id', value: 'account-a' })
  })
})

describe('processTrigger — account isolation (TEST B)', () => {
  it('Account B’s event never matches Account A’s rule — querying Account B’s own scope returns nothing, so no run is created and nothing is sent', async () => {
    // Simulates the DB-level filter doing its job: a query scoped to
    // account-b's own rules never returns account-a's rule at all.
    queue('ig_automation_rules', [{ data: [], error: null }])

    await processTrigger(dmEvent({ connectedAccountId: 'account-b' }))

    expect(mocks.eqCalls).toContainEqual({ table: 'ig_automation_rules', column: 'connected_account_id', value: 'account-b' })
    expect(mocks.counters['ig_automation_runs']).toBeUndefined()
    expect(sendDirectMessage).not.toHaveBeenCalled()
  })
})

describe('processTrigger — duplicate delivery', () => {
  it('a redelivered webhook (unique violation on the run insert) is a silent no-op, never a duplicate send', async () => {
    queue('ig_automation_rules', [{ data: [DM_RULE], error: null }])
    queue('ig_automation_runs', [{ data: null, error: { code: '23505', message: 'duplicate key' } }])

    await processTrigger(dmEvent())

    expect(sendDirectMessage).not.toHaveBeenCalled()
  })
})

describe('processTrigger — comment automation (TEST D, unaffected by this change)', () => {
  it('still matches, records a run, and sends a private reply exactly as before — now additionally scoped to its own connected_account_id', async () => {
    queue('ig_automation_rules', [{ data: [COMMENT_RULE], error: null }])
    queue('ig_automation_runs', [{ data: { id: 'run-2' }, error: null }])
    sendPrivateReplyToComment.mockResolvedValue({ ok: true, data: { id: 'sent-2' } })

    await processTrigger({
      triggerType: 'comment_keyword',
      sourceType: 'comment',
      sourceId: 'comment-123',
      recipientIgId: 'igsid-commenter',
      text: 'slowday',
      mediaId: null,
      connectedAccountId: 'account-a',
    })

    expect(sendPrivateReplyToComment).toHaveBeenCalledWith('account-a', 'comment-123', 'hey!', null, 'instagram_login')
    expect(replyToComment).not.toHaveBeenCalled() // public_reply_enabled is false on COMMENT_RULE
  })
})

describe('processTrigger — N4N DM Automations provider threading (additive)', () => {
  it('an event tagged provider: "instagram_dm" sends with that provider explicitly, never silently using instagram_login', async () => {
    queue('ig_automation_rules', [{ data: [DM_RULE], error: null }])
    queue('ig_automation_runs', [{ data: { id: 'run-3' }, error: null }])
    sendDirectMessage.mockResolvedValue({ ok: true, data: { id: 'sent-3' } })

    await processTrigger(dmEvent({ provider: 'instagram_dm' }))

    expect(sendDirectMessage).toHaveBeenCalledWith('account-a', 'igsid-sender', 'hey!', null, 'instagram_dm')
  })

  it('a comment event tagged provider: "instagram_dm" sends the private reply with that provider explicitly', async () => {
    queue('ig_automation_rules', [{ data: [COMMENT_RULE], error: null }])
    queue('ig_automation_runs', [{ data: { id: 'run-4' }, error: null }])
    sendPrivateReplyToComment.mockResolvedValue({ ok: true, data: { id: 'sent-4' } })

    await processTrigger({
      triggerType: 'comment_keyword',
      sourceType: 'comment',
      sourceId: 'comment-456',
      recipientIgId: 'igsid-commenter-2',
      text: 'slowday',
      mediaId: null,
      connectedAccountId: 'account-a',
      provider: 'instagram_dm',
    })

    expect(sendPrivateReplyToComment).toHaveBeenCalledWith('account-a', 'comment-456', 'hey!', null, 'instagram_dm')
  })
})
