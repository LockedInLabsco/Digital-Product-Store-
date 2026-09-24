'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import { createSupabaseBrowserClient } from '@/src/lib/supabase/browserClient'
import SignOutButton from '@/src/components/admin/SignOutButton'

export default function MfaChallengeClient() {
  const router = useRouter()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [isLoadingFactor, setIsLoadingFactor] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadFactor = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) {
        setError(listError.message)
      } else {
        const verifiedTotp = data.totp.find((factor) => factor.status === 'verified')
        if (verifiedTotp) {
          setFactorId(verifiedTotp.id)
        } else {
          setError('No verified authenticator found for this account.')
        }
      }
      setIsLoadingFactor(false)
    }
    loadFactor()
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId) return

    setError('')
    setIsVerifying(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
      if (verifyError) {
        setError(verifyError.message)
        return
      }
      router.push('/admin')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <Container>
        <div className="max-w-sm w-full mx-auto text-center">
          <h1 className="text-2xl font-bold mb-2">Two-factor verification</h1>
          <p className="text-gray-600 text-sm mb-8">
            Enter the 6-digit code from your authenticator app to finish signing in.
          </p>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-6 text-left">
              {error}
            </div>
          )}

          {isLoadingFactor ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : factorId ? (
            <form onSubmit={handleVerify} className="space-y-4 text-left">
              <div>
                <label htmlFor="mfa-code" className="block text-sm font-medium mb-2">
                  Authentication code
                </label>
                <input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-center text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-black"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isVerifying || code.length !== 6}
                className="w-full bg-black text-white text-sm font-semibold rounded-lg py-3 hover:bg-gray-900 disabled:opacity-50"
              >
                {isVerifying ? 'Verifying…' : 'Verify'}
              </button>
            </form>
          ) : null}

          <div className="mt-8">
            <SignOutButton />
          </div>
        </div>
      </Container>
    </main>
  )
}
