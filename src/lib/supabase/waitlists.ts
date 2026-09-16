import { cache } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from './client'
import type { Waitlist } from '@/src/types/waitlist'

export interface PublicWaitlistResult {
  waitlist?: Waitlist
  error: boolean
}

/**
 * Fetches a waitlist by slug using the anon client, same pattern as
 * getActiveProductBySlug. RLS on public.waitlists only allows reading
 * rows with status 'active' or 'closed' (see 0006_waitlist_system.sql),
 * so a draft waitlist simply comes back as "not found" here — the
 * public page never learns a draft slug exists. Wrapped in cache() so
 * generateMetadata and the page component share one request per render.
 */
export const getPublicWaitlistBySlug = cache(async function getPublicWaitlistBySlug(
  slug: string
): Promise<PublicWaitlistResult> {
  noStore()

  if (!supabase) {
    console.error('[Waitlists] Supabase public env vars are not configured')
    return { error: true }
  }

  try {
    const { data, error } = await supabase
      .from('waitlists')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('[Waitlists] Supabase waitlist-by-slug query failed', {
        slug,
        message: error.message,
        code: error.code,
      })
      return { error: true }
    }

    if (!data) {
      return { waitlist: undefined, error: false }
    }

    return { waitlist: data as Waitlist, error: false }
  } catch (error) {
    console.error('[Waitlists] Exception fetching waitlist by slug', { slug, error })
    return { error: true }
  }
})
