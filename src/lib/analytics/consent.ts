'use client'

export type ConsentChoice = 'accepted' | 'rejected'

const CONSENT_STORAGE_KEY = 'n4n_analytics_consent'

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null

  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return value === 'accepted' || value === 'rejected' ? value : null
  } catch {
    // localStorage can throw in privacy modes — fail closed (no consent).
    return null
  }
}

export function setStoredConsent(choice: ConsentChoice): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice)
  } catch {
    // Ignore — nothing we can safely do if storage is unavailable.
  }
}

/** Fired whenever consent changes, so mounted components can react without a full reload. */
export const CONSENT_CHANGE_EVENT = 'n4n:analytics-consent-changed'

export function broadcastConsentChange(choice: ConsentChoice): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: choice }))
}
