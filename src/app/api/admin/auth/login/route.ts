import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/src/lib/admin/auth'

export async function POST(request: NextRequest) {
  console.log('[POST /api/admin/auth/login] Login attempt')

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      console.error('[POST /api/admin/auth/login] Missing email or password')
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@not4normal.store'
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_TEMP

    if (!adminPassword) {
      console.error('[POST /api/admin/auth/login] ADMIN_PASSWORD not configured')
      return NextResponse.json(
        { error: 'Admin system not configured' },
        { status: 500 }
      )
    }

    if (email === adminEmail && password === adminPassword) {
      console.log(`[POST /api/admin/auth/login] Login successful for ${email}`)
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
      })

      response.cookies.set(ADMIN_SESSION_COOKIE, 'authenticated', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 8,
      })

      return response
    }

    console.error(`[POST /api/admin/auth/login] Invalid credentials for ${email}`)
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  } catch (error) {
    console.error('[POST /api/admin/auth/login] Login exception:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
