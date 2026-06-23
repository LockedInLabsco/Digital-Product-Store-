import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Placeholder for Lemon Squeezy webhook
  return NextResponse.json(
    { message: 'Webhook endpoint - coming soon' },
    { status: 200 }
  )
}
