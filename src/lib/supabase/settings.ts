import { cache } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from './client'
import { supabaseServer } from './server'
import {
  WebsiteMedia,
  WEBSITE_MEDIA_DEFAULTS,
  WEBSITE_MEDIA_SETTING_KEY,
} from '@/src/types/settings'

function mergeWithDefaults(value: unknown): WebsiteMedia {
  if (!value || typeof value !== 'object') {
    return { ...WEBSITE_MEDIA_DEFAULTS }
  }
  return { ...WEBSITE_MEDIA_DEFAULTS, ...(value as Partial<WebsiteMedia>) }
}

export const getWebsiteMedia = cache(async (): Promise<WebsiteMedia> => {
  noStore()

  if (!supabase) {
    console.warn('[Website Media] Supabase public env vars are not configured')
    return { ...WEBSITE_MEDIA_DEFAULTS }
  }

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', WEBSITE_MEDIA_SETTING_KEY)
      .maybeSingle()

    if (error) {
      console.error('[Website Media] Failed to load settings', error.message)
      return { ...WEBSITE_MEDIA_DEFAULTS }
    }

    return mergeWithDefaults(data?.setting_value)
  } catch (error) {
    console.error('[Website Media] Exception loading settings', error)
    return { ...WEBSITE_MEDIA_DEFAULTS }
  }
})

export async function getWebsiteMediaAdmin(): Promise<WebsiteMedia> {
  const { data, error } = await supabaseServer
    .from('site_settings')
    .select('setting_value')
    .eq('setting_key', WEBSITE_MEDIA_SETTING_KEY)
    .maybeSingle()

  if (error) {
    console.error('[Website Media] Admin failed to load settings', error.message)
    return { ...WEBSITE_MEDIA_DEFAULTS }
  }

  return mergeWithDefaults(data?.setting_value)
}

export async function saveWebsiteMedia(
  partial: Partial<WebsiteMedia>
): Promise<WebsiteMedia> {
  const current = await getWebsiteMediaAdmin()
  const next: WebsiteMedia = { ...current, ...partial }

  const { error } = await supabaseServer.from('site_settings').upsert(
    {
      setting_key: WEBSITE_MEDIA_SETTING_KEY,
      setting_value: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'setting_key' }
  )

  if (error) {
    throw new Error(`Failed to save website media settings: ${error.message}`)
  }

  return next
}
