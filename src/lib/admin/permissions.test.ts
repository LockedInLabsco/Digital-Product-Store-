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

  it('scopes personal_brand to only its own permissions plus dashboard read', () => {
    expect(roleHasPermission('personal_brand', 'personal_brand:read')).toBe(true)
    expect(roleHasPermission('personal_brand', 'personal_brand:write')).toBe(true)
    expect(roleHasPermission('personal_brand', 'personal_brand:ai')).toBe(true)
    expect(roleHasPermission('personal_brand', 'dashboard:read')).toBe(true)

    expect(roleHasPermission('personal_brand', 'analytics:read')).toBe(false)
    expect(roleHasPermission('personal_brand', 'waitlists:read')).toBe(false)
    expect(roleHasPermission('personal_brand', 'products:read')).toBe(false)
    expect(roleHasPermission('personal_brand', 'orders:read')).toBe(false)
    expect(roleHasPermission('personal_brand', 'media:read')).toBe(false)
    expect(roleHasPermission('personal_brand', 'team:read')).toBe(false)
    expect(roleHasPermission('personal_brand', 'team:manage')).toBe(false)
  })

  it('no other role has any personal_brand permission', () => {
    const otherRoles = ADMIN_ROLES.filter((role) => !['owner', 'personal_brand', 'social_media'].includes(role))
    for (const role of otherRoles) {
      expect(roleHasPermission(role, 'personal_brand:read')).toBe(false)
      expect(roleHasPermission(role, 'personal_brand:write')).toBe(false)
      expect(roleHasPermission(role, 'personal_brand:ai')).toBe(false)
    }
  })
})
