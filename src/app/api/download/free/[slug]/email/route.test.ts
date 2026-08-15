import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  product: {
    id: 'product-1',
    title: 'Focus Guide',
    price: 0,
    file_path: 'free/focus-guide.pdf',
  } as { id: string; title: string; price: number; file_path: string | null },
  recentClaims: [] as Array<{ id: string }>,
  insertedClaim: null as Record<string, unknown> | null,
  getSignedDownloadUrl: vi.fn(),
  sendDownloadEmail: vi.fn(),
}))

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn((table: string) => {
      if (table === 'products') {
        const query = {
          select: vi.fn(),
          eq: vi.fn(),
          single: vi.fn(async () => ({ data: mocks.product, error: null })),
        }
        query.select.mockReturnValue(query)
        query.eq.mockReturnValue(query)
        return query
      }

      const duplicateQuery = {
        select: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
        limit: vi.fn(async () => ({ data: mocks.recentClaims, error: null })),
        insert: vi.fn(async (claim: Record<string, unknown>) => {
          mocks.insertedClaim = claim
          return { error: null }
        }),
      }
      duplicateQuery.select.mockReturnValue(duplicateQuery)
      duplicateQuery.eq.mockReturnValue(duplicateQuery)
      duplicateQuery.gte.mockReturnValue(duplicateQuery)
      return duplicateQuery
    }),
  },
}))

vi.mock('@/src/lib/supabase/downloads', () => ({
  getSignedDownloadUrl: mocks.getSignedDownloadUrl,
}))

vi.mock('@/src/lib/email/resend', () => ({
  sendDownloadEmail: mocks.sendDownloadEmail,
}))

import { POST } from './route'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/download/free/focus-guide/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('free-product email route', () => {
  beforeEach(() => {
    mocks.product.price = 0
    mocks.product.file_path = 'free/focus-guide.pdf'
    mocks.recentClaims = []
    mocks.insertedClaim = null
    mocks.getSignedDownloadUrl.mockReset().mockResolvedValue('https://download.example/signed')
    mocks.sendDownloadEmail.mockReset().mockResolvedValue({ success: true })
  })

  it('rejects invalid names and emails before querying the product', async () => {
    const response = await POST(makeRequest({ firstName: '', email: 'bad' }), {
      params: { slug: 'focus-guide' },
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      fieldErrors: {
        firstName: 'Enter your first name.',
        email: 'Enter a valid email address.',
      },
    })
    expect(mocks.sendDownloadEmail).not.toHaveBeenCalled()
  })

  it('stores the normalized first name and delivers through the existing email flow', async () => {
    const response = await POST(
      makeRequest({ firstName: '  Ana   Maria ', email: ' ANA@Example.COM ' }),
      { params: { slug: 'focus-guide' } }
    )

    expect(response.status).toBe(200)
    expect(mocks.sendDownloadEmail).toHaveBeenCalledWith({
      email: 'ana@example.com',
      firstName: 'Ana Maria',
      productTitle: 'Focus Guide',
      downloadUrl: 'https://download.example/signed',
      isFree: true,
    })
    expect(mocks.insertedClaim).toMatchObject({
      email: 'ana@example.com',
      first_name: 'Ana Maria',
      download_status: 'delivered',
      email_delivery_status: 'sent',
    })
  })

  it('treats a recent delivered claim as success without sending twice', async () => {
    mocks.recentClaims = [{ id: 'existing-claim' }]

    const response = await POST(
      makeRequest({ firstName: 'Ana', email: 'ana@example.com' }),
      { params: { slug: 'focus-guide' } }
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true, duplicate: true })
    expect(mocks.getSignedDownloadUrl).not.toHaveBeenCalled()
    expect(mocks.sendDownloadEmail).not.toHaveBeenCalled()
    expect(mocks.insertedClaim).toBeNull()
  })

  it('does not allow a paid product through the free delivery route', async () => {
    mocks.product.price = 1999

    const response = await POST(
      makeRequest({ firstName: 'Ana', email: 'ana@example.com' }),
      { params: { slug: 'focus-guide' } }
    )

    expect(response.status).toBe(403)
    expect(mocks.sendDownloadEmail).not.toHaveBeenCalled()
  })
})
