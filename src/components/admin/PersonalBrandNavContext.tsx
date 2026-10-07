'use client'

import { createContext, useContext } from 'react'

/**
 * Tells Social Media (formerly "Personal Brand") pages whether the
 * sidebar itself already exposes every Social Media section — true
 * whenever the admin's CURRENT MODE is 'social_media' (see AdminShell
 * and src/lib/admin/adminMode.ts), regardless of which OTHER roles they
 * also hold — in which case PersonalBrandTabs renders only the
 * WorkspaceSwitcher, since showing the same set of links twice (sidebar
 * + top tabs) would defeat the point of the mode switch. An admin who
 * reaches a Social Media page while a DIFFERENT mode is active (e.g. by
 * a direct URL/bookmark — mode is navigation only, never a route guard)
 * still sees the full top tab row as a fallback way to navigate.
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
