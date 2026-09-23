import { describe, expect, it } from 'vitest'
import { ADMIN_ROLES, ALL_PERMISSIONS, roleHasPermission } from './permissions'

describe('roleHasPermission', () => {
  it('grants owner every permission that exists', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(roleHasPermission('owner', permission)).toBe(true)
    }
  })

  it('lets analyst read analytics but not write anything', () => {
    expect(roleHasPermission('analyst', 'analytics:read')).toBe(true)
    expect(roleHasPermission('analyst', 'waitlists:write')).toBe(false)
    expect(roleHasPermission('analyst', 'products:write')).toBe(false)
    expect(roleHasPermission('analyst', 'team:manage')).toBe(false)
  })

  it('lets social_media read waitlists but not manage the team or write products', () => {
    expect(roleHasPermission('social_media', 'waitlists:read')).toBe(true)
    expect(roleHasPermission('social_media', 'team:read')).toBe(false)
    expect(roleHasPermission('social_media', 'team:manage')).toBe(false)
    expect(roleHasPermission('social_media', 'products:write')).toBe(false)
    expect(roleHasPermission('social_media', 'orders:read')).toBe(false)
  })

  it('lets developer write waitlists/products/media but not manage the team', () => {
    expect(roleHasPermission('developer', 'waitlists:write')).toBe(true)
    expect(roleHasPermission('developer', 'products:write')).toBe(true)
    expect(roleHasPermission('developer', 'media:write')).toBe(true)
    expect(roleHasPermission('developer', 'team:manage')).toBe(false)
    expect(roleHasPermission('developer', 'settings:write')).toBe(false)
  })

  it('only owner can manage the team', () => {
    for (const role of ADMIN_ROLES) {
      expect(roleHasPermission(role, 'team:manage')).toBe(role === 'owner')
    }
  })

  it('every role can read the dashboard', () => {
    for (const role of ADMIN_ROLES) {
      expect(roleHasPermission(role, 'dashboard:read')).toBe(true)
    }
  })
})
