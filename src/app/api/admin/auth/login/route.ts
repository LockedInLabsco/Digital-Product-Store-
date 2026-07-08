import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🔐 [POST /api/admin/auth/login] Login attempt')

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      console.error('❌ Missing email or password')
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    // Get admin credentials from environment
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@not4normal.store'
    const adminPassword = process.env.ADMIN_PASSWORD_TEMP

    if (!adminPassword) {
      console.error('❌ ADMIN_PASSWORD_TEMP not configured')
      return NextResponse.json(
        { error: 'Admin system not configured' },
        { status: 500 }
      )
    }

    // Verify credentials
    if (email === adminEmail && password === adminPassword) {
      console.log(`✅ Login successful for ${email}`)
      return NextResponse.json({
        success: true,
        message: 'Login successful',
      })
    }

    console.error(`❌ Invalid credentials for ${email}`)
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  } catch (error) {
    console.error('❌ Login exception:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
