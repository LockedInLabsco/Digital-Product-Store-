import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth'

/**
 * Signs out of Supabase Auth server-side — this is what actually
 * invalidates the session and clears its cookies, replacing the old
 * custom httpOnly-cookie clear. The admin shell's sign-out button (see
 * components/admin/AdminShell.tsx) calls this route and then also calls
 * signOut() on its own browser Supabase client, so both the server
 * session and any client-held session are cleared together.
 */
export async function POST() {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
