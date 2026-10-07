import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { resolveActiveAdminMode } from './adminMode'
import type { CurrentAdmin } from '@/src/types/admin'

function admin(roles: CurrentAdmin['roles']): CurrentAdmin {
  return { user: { id: 'admin-1', email: 'admin@example.com' }, roles, permissions: [] }
}

describe('resolveActiveAdminMode', () => {
  it('CASE 2/3: a single-role admin always resolves to their one role, no cookie needed', () => {
    expect(resolveActiveAdminMode(admin(['social_media']), null)).toBe('social_media')
    expect(resolveActiveAdminMode(admin(['developer']), null)).toBe('developer')
  })

  it('trusts a stored cookie when it names a role the admin still holds', () => {
    expect(resolveActiveAdminMode(admin(['owner', 'developer', 'social_media']), 'social_media')).toBe('social_media')
  })

  it('CASE 6: a stale cookie naming a role the admin no longer holds fails safely to another authorized mode, never that role', () => {
    const result = resolveActiveAdminMode(admin(['owner', 'social_media']), 'developer')

    expect(result).not.toBe('developer')
    expect(['owner', 'social_media']).toContain(result)
  })

  it('ignores a cookie value that is not a real role at all', () => {
    const result = resolveActiveAdminMode(admin(['social_media']), 'not-a-real-role')
    expect(result).toBe('social_media')
  })

  it('CASE 1: with no cookie and multiple roles, picks Founder (owner) first per the documented priority order', () => {
    expect(resolveActiveAdminMode(admin(['owner', 'developer', 'social_media']), null)).toBe('owner')
  })

  it('falls through the priority order to the next role the admin actually holds', () => {
    expect(resolveActiveAdminMode(admin(['developer', 'social_media']), null)).toBe('social_media')
    expect(resolveActiveAdminMode(admin(['developer', 'analyst']), null)).toBe('developer')
    expect(resolveActiveAdminMode(admin(['analyst']), null)).toBe('analyst')
  })
})
