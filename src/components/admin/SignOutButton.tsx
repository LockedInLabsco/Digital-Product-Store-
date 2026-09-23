'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/src/lib/supabase/browserClient'

interface SignOutButtonProps {
  className?: string
}

/**
 * The one sign-out path for the whole admin area — clears the server
 * session (POST /api/admin/auth/logout, which calls Supabase's
 * auth.signOut()) and the browser client's own local session, then
 * sends the user to /admin/login. No localStorage to clear anymore.
 */
export default function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
    } finally {
      router.push('/admin/login')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={className || 'text-gray-600 hover:text-black text-sm disabled:opacity-50'}
    >
      {isSigningOut ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
