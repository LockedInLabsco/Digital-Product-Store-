'use client'

import { useCallback, useEffect, useState } from 'react'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import { createSupabaseBrowserClient } from '@/src/lib/supabase/browserClient'

interface PendingEnrollment {
  factorId: string
  qrCode: string
  secret: string
}

/**
 * Self-service two-factor authentication (TOTP) setup — opt-in per
 * admin, not forced. Once a verified factor exists, every future login
 * (email or Google) is required to complete a code challenge at
 * /admin/mfa-challenge before reaching any protected page — see
 * needsMfaChallenge() in lib/supabase/auth.ts and the check in
 * (protected)/layout.tsx.
 */
export default function AccountClient() {
  const [isLoading, setIsLoading] = useState(true)
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingEnrollment | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadFactors = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) throw listError

      const verified = data.totp.find((factor) => factor.status === 'verified')
      setEnrolledFactorId(verified?.id ?? null)

      // Clean up any abandoned unverified factor from a previous
      // incomplete enrollment attempt, so starting over works cleanly.
      const unverified = data.all.filter((factor) => factor.factor_type === 'totp' && factor.status !== 'verified')
      for (const factor of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load two-factor status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFactors()
  }, [loadFactors])

  const handleStartEnroll = async () => {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (enrollError) throw enrollError
      setPending({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment')
    } finally {
      setBusy(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pending) return

    setBusy(true)
    setError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pending.factorId,
        code: code.trim(),
      })
      if (verifyError) throw verifyError

      setPending(null)
      setCode('')
      setSuccess('Two-factor authentication is now enabled.')
      await loadFactors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code — please try again')
    } finally {
      setBusy(false)
    }
  }

  const handleCancelEnroll = async () => {
    if (!pending) return
    setBusy(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.mfa.unenroll({ factorId: pending.factorId })
    } finally {
      setPending(null)
      setCode('')
      setBusy(false)
    }
  }

  const handleDisable = async () => {
    if (!enrolledFactorId) return
    if (!confirm('Disable two-factor authentication for your account?')) return

    setBusy(true)
    setError('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: enrolledFactorId })
      if (unenrollError) throw unenrollError
      setSuccess('Two-factor authentication has been disabled.')
      await loadFactors()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable two-factor authentication')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Container className="py-12">
        <div className="max-w-xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Account</h2>
            <p className="text-gray-600">Manage security settings for your own admin account</p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">{error}</div>
          )}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-6">{success}</div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-bold mb-2">Two-factor authentication</h3>

            {isLoading ? (
              <p className="text-gray-600 text-sm">Loading…</p>
            ) : pending ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.), then
                  enter the 6-digit code it shows.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns a QR code as an inline SVG data URI, not a static asset */}
                <img src={pending.qrCode} alt="Two-factor authentication QR code" className="h-48 w-48" />
                <p className="text-xs text-gray-500">
                  Can&apos;t scan it? Enter this code manually:{' '}
                  <span className="font-mono select-all">{pending.secret}</span>
                </p>
                <form onSubmit={handleVerify} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label htmlFor="enroll-code" className="block text-sm font-medium mb-2">
                      Verification code
                    </label>
                    <input
                      id="enroll-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={busy || code.length !== 6} className="bg-black text-white hover:bg-gray-900">
                    {busy ? 'Verifying…' : 'Verify and enable'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEnroll} disabled={busy}>
                    Cancel
                  </Button>
                </form>
              </div>
            ) : enrolledFactorId ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-700 font-medium">Enabled — required on every sign-in</p>
                <Button variant="outline" onClick={handleDisable} disabled={busy}>
                  {busy ? 'Disabling…' : 'Disable'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Not enabled. Add an authenticator app for extra protection.</p>
                <Button onClick={handleStartEnroll} disabled={busy} className="bg-black text-white hover:bg-gray-900">
                  {busy ? 'Starting…' : 'Set up 2FA'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </main>
  )
}
