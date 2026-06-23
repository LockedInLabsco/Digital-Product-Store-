import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Placeholder for checkout API
  return NextResponse.json(
    { message: 'Checkout endpoint - coming soon' },
    { status: 200 }
  )
}
