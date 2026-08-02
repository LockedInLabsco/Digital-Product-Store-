import { AttributionPayload } from '@/src/types/attribution'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const ALLOWED_ATTRIBUTION_KEYS: (keyof AttributionPayload)[] = [
  'first_touch_source',
  'first_touch_medium',
  'first_touch_campaign',
  'first_touch_content',
  'last_touch_source',
  'last_touch_medium',
  'last_touch_campaign',
  'referrer_domain',
  'landing_page',
]

/**
 * Validates untrusted attribution data (from a client POST body or
 * Paddle custom_data) down to a safe, bounded set of string fields.
 * Never trust this input further than "short plain string or absent".
 */
export function sanitizeAttribution(value: unknown): Partial<AttributionPayload> {
  if (!isPlainObject(value)) return {}

  const result: Partial<AttributionPayload> = {}
  for (const key of ALLOWED_ATTRIBUTION_KEYS) {
    const raw = value[key]
    if (typeof raw === 'string' && raw.length > 0 && raw.length <= 500) {
      result[key] = raw
    }
  }
  return result
}

export function sanitizeDeviceCategory(value: unknown): 'mobile' | 'tablet' | 'desktop' | null {
  return value === 'mobile' || value === 'tablet' || value === 'desktop' ? value : null
}
