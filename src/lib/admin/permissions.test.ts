import { describe, expect, it } from 'vitest'
import { ADMIN_ROLES, ALL_PERMISSIONS, permissionsForRoles, roleHasPermission } from './permissions'

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

  it('lets social_media run the Personal Brand Content OS', () => {
    expect(roleHasPermission('social_media', 'personal_brand:read')).toBe(true)
    expect(roleHasPermission('social_media', 'personal_brand:write')).toBe(true)
    expect(roleHasPermission('social_media', 'personal_brand:ai')).toBe(true)
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

  it('no other role has any personal_brand permission', () => {
    const otherRoles = ADMIN_ROLES.filter((role) => !['owner', 'social_media'].includes(role))
    for (const role of otherRoles) {
      expect(roleHasPermission(role, 'personal_brand:read')).toBe(false)
      expect(roleHasPermission(role, 'personal_brand:write')).toBe(false)
      expect(roleHasPermission(role, 'personal_brand:ai')).toBe(false)
    }
  })
})

describe('permissionsForRoles', () => {
  it('unions permissions across every held role', () => {
    const combined = permissionsForRoles(['social_media', 'analyst'])
    // personal_brand:write comes only from social_media; analytics:read is shared by both.
    expect(combined).toEqual(expect.arrayContaining(['personal_brand:write', 'analytics:read']))
    expect(roleHasPermission('analyst', 'personal_brand:write')).toBe(false)
  })

  it('a single role in the array behaves the same as roleHasPermission', () => {
    const combined = permissionsForRoles(['developer'])
    expect(combined).toEqual(expect.arrayContaining(['waitlists:write', 'products:write', 'media:write']))
    expect(combined).not.toContain('team:manage')
  })

  it('owner combined with anything still has every permission', () => {
    const combined = permissionsForRoles(['owner', 'analyst'])
    for (const permission of ALL_PERMISSIONS) {
      expect(combined).toContain(permission)
    }
  })

  it('returns no duplicate permissions when roles overlap', () => {
    const combined = permissionsForRoles(['social_media', 'analyst'])
    const unique = new Set(combined)
    expect(combined.length).toBe(unique.size)
  })

  it('returns an empty list for an empty roles array', () => {
    expect(permissionsForRoles([])).toEqual([])
  })
})
