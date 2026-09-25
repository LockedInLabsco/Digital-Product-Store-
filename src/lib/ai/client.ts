/**
 * Server-only Anthropic Messages API client — plain fetch, no SDK
 * dependency, mirroring src/lib/analytics/posthogServer.ts's own
 * approach for the exact same reason: this is a low-volume, server-only
 * integration where a full SDK would be unnecessary weight, and staying
 * on plain fetch keeps ANTHROPIC_API_KEY nowhere near a client bundle by
 * construction (there's no client-usable export to accidentally import).
 */
import 'server-only'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-opus-5'
const REQUEST_TIMEOUT_MS = 45000

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string }

interface CallClaudeOptions {
  system: string
  prompt: string
  maxTokens?: number
}

/**
 * Sends one request to the Anthropic Messages API and returns Claude's
 * text response. No conversation history, no tools, no streaming — every
 * Content OS AI feature is a single structured request/response, not a
 * chat, so the simplest possible call shape is the right one here.
 */
export async function callClaude({ system, prompt, maxTokens = 4096 }: CallClaudeOptions): Promise<AiResult<string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured' }
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      console.error('[AI] Anthropic API error', response.status, bodyText.slice(0, 500))
      return { ok: false, error: `AI request failed (status ${response.status})` }
    }

    const json = await response.json()
    const textBlock = (json.content || []).find((block: any) => block.type === 'text')
    if (!textBlock?.text) {
      return { ok: false, error: 'AI returned no usable response' }
    }

    return { ok: true, data: textBlock.text as string }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    console.error('[AI] Exception calling Anthropic API', isAbort ? 'timed out' : error)
    return { ok: false, error: isAbort ? 'AI request timed out' : 'AI request failed' }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Extracts and parses a JSON object from Claude's response text. The
 * system prompt always instructs Claude to reply with ONLY a JSON
 * object; this strips a markdown code fence defensively in case one
 * slips in anyway, rather than trusting the model's formatting.
 */
export function parseJsonResponse<T>(text: string): AiResult<T> {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  const candidate = fenced ? fenced[1] : trimmed

  try {
    return { ok: true, data: JSON.parse(candidate) as T }
  } catch (error) {
    console.error('[AI] Failed to parse JSON response from Claude')
    return { ok: false, error: 'AI response was not valid JSON' }
  }
}
