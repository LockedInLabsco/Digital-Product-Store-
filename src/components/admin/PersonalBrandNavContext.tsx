'use client'

import { createContext, useContext } from 'react'

/**
 * Tells Personal Brand pages whether the sidebar itself already exposes
 * every Personal Brand section (true for a social-media-only admin, see
 * AdminShell) — in which case PersonalBrandTabs renders nothing, since
 * showing the same set of links twice (sidebar + top tabs) would defeat
 * the point of giving this role its own focused workspace. Owner/
 * developer/analyst admins keep seeing the top tabs unchanged.
 */
const PersonalBrandNavContext = createContext(false)

export function PersonalBrandNavProvider({
  sidebarCoversPersonalBrand,
  children,
}: {
  sidebarCoversPersonalBrand: boolean
  children: React.ReactNode
}) {
  return <PersonalBrandNavContext.Provider value={sidebarCoversPersonalBrand}>{children}</PersonalBrandNavContext.Provider>
}

export function useSidebarCoversPersonalBrand() {
  return useContext(PersonalBrandNavContext)
}
