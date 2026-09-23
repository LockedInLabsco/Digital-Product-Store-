import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth'

/**
 * Shared OAuth (Google) and email magic-link landing spot — both flows
 * redirect here with a `code` param that this exchanges for a real
 * Supabase session (setting the session cookie via the Route Handler
 * cookie adapter — see createSupabaseServerClient). This route only
 * establishes a valid Supabase session; it does NOT decide admin access
 * — that's re-checked independently the moment the browser lands on
 * /admin (src/app/admin/(protected)/layout.tsx), so this callback can't
 * be used to grant anything by itself.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next')) || '/admin'

  if (code) {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[GET /auth/callback] Failed to exchange code for session', error.message)
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`)
}

/** Only ever allow redirecting to a same-app path — never an absolute
 * URL or protocol-relative "//host" (the classic open-redirect vector). */
function safeRedirectPath(value: string | null): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  return value
}
