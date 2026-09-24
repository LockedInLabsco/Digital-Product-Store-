'use client'

import { useState } from 'react'
import Container from '@/src/components/Container'
import { createSupabaseBrowserClient } from '@/src/lib/supabase/browserClient'

/**
 * The actual sign-in UI. Two paths into the same place —
 * /auth/callback, which exchanges whatever Supabase hands back for a
 * session and then sends the browser to /admin. Whether that session
 * actually gets admin access from there is decided server-side (see
 * src/app/admin/(protected)/layout.tsx) — this page has no way to know
 * or claim someone is an admin before that.
 */
export default function LoginClient({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState(initialError || '')

  const redirectTo = () => {
    const origin = window.location.origin
    return `${origin}/auth/callback?next=${encodeURIComponent('/admin')}`
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setIsGoogleLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTo() },
      })
      if (oauthError) {
        setError(oauthError.message)
        setIsGoogleLoading(false)
      }
      // On success the browser navigates away to Google, so no further
      // state update here.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Google sign-in')
      setIsGoogleLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsEmailLoading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo() },
      })
      if (otpError) {
        setError(otpError.message)
      } else {
        setEmailSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send sign-in link')
    } finally {
      setIsEmailLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-admin-surface flex items-center justify-center">
      <Container>
        <div className="max-w-sm w-full mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">NOT4NORMAL Admin</h1>
            <p className="text-admin-muted text-sm">Sign in to access the admin workspace</p>
          </div>

          {error && (
            <div className="p-4 bg-red-950/40 border border-red-900 rounded-lg text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          {emailSent ? (
            <div className="p-4 bg-green-950/40 border border-green-900 rounded-lg text-green-400 text-sm text-center">
              Check <strong>{email}</strong> for a sign-in link.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-3 border border-admin-border rounded-lg py-3 text-sm font-semibold hover:border-admin-text transition-colors disabled:opacity-50"
              >
                <GoogleIcon />
                {isGoogleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-4 my-6">
                <div className="h-px flex-1 bg-admin-surface3" />
                <span className="text-xs uppercase tracking-wide text-admin-faint">or</span>
                <div className="h-px flex-1 bg-admin-surface3" />
              </div>

              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 border border-admin-border rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-accent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isEmailLoading}
                  className="w-full bg-admin-accent text-admin-accentText text-sm font-semibold rounded-lg py-3 hover:bg-admin-accentHover disabled:opacity-50"
                >
                  {isEmailLoading ? 'Sending…' : 'Continue with email'}
                </button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-xs text-admin-faint">
            Access is restricted to invited team members.
          </p>
        </div>
      </Container>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  )
}
