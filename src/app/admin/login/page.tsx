'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/src/components/Container'
import Button from '@/src/components/Button'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Call server-side API to verify credentials
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid email or password')
        return
      }

      // Store auth token in localStorage
      localStorage.setItem('admin_token', 'authenticated')
      router.push('/admin')
    } catch (err) {
      setError('Login failed. Please try again.')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <Container>
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Login</h1>
            <p className="text-gray-600">Not4Normal Product Manager</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@not4normal.store"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white hover:bg-gray-900"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-semibold mb-2">Demo Credentials:</p>
            <p>Email: admin@not4normal.store</p>
            <p>Password: (From ADMIN_PASSWORD_TEMP in .env.local)</p>
          </div>
        </div>
      </Container>
    </main>
  )
}
