import type { Metadata } from 'next'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import { getWebsiteMedia } from '@/src/lib/supabase/settings'
import { supabaseServer } from '@/src/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Data Deletion Request Status',
  description: 'Check the status of an Instagram data deletion request submitted to N4N Content OS.',
}

/**
 * The human-readable status page Meta's Data Deletion Request Callback
 * points to (see src/app/api/admin/social/instagram/data-deletion/route.ts,
 * which generates the confirmation_code this page looks up) — Meta's
 * own documentation requires this page be reachable and explain the
 * request's status, without mandating any particular machine-readable
 * format, so a plain page (consistent with the existing
 * /data-deletion instructions page) is the smallest correct
 * implementation. Public and unauthenticated by design — the person
 * checking status is the Instagram account holder, not a NOT4NORMAL
 * admin, and the confirmation_code itself (not an internal UUID) is
 * what scopes the lookup.
 */
export default async function DataDeletionStatusPage({ searchParams }: { searchParams: { code?: string } }) {
  const media = await getWebsiteMedia()
  const code = typeof searchParams.code === 'string' ? searchParams.code.trim() : ''

  let statusMessage = 'No request was found for this confirmation code.'
  let requestedAt: string | null = null

  if (code) {
    const { data } = await supabaseServer
      .from('instagram_data_deletion_requests')
      .select('status, requested_at')
      .eq('confirmation_code', code)
      .maybeSingle()

    if (data) {
      requestedAt = data.requested_at
      statusMessage =
        data.status === 'completed'
          ? 'Your data deletion request has been completed. Any Instagram connection and identifying information we stored for this account has been removed.'
          : 'Your data deletion request was received. We did not find any stored connection matching this account, so there was no account-linked data to remove.'
    }
  }

  return (
    <>
      <Navbar media={media} />
      <main className="bg-ink">
        <section className="py-12 sm:py-16">
          <Container>
            <Link href="/" className="text-cream/55 hover:text-gold mb-6 sm:mb-8 inline-block text-sm">
              ← Back Home
            </Link>
            <div className="max-w-3xl">
              <h1 className="font-serif text-5xl sm:text-6xl mb-4 leading-tight text-cream">Data Deletion Request Status</h1>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-line/10">
          <Container>
            <div className="max-w-3xl prose prose-sm">
              {code ? (
                <>
                  <p className="text-cream/65 mb-4">Confirmation code: {code}</p>
                  <p className="text-cream/65 mb-4">{statusMessage}</p>
                  {requestedAt && <p className="text-cream/65 mb-4">Requested: {new Date(requestedAt).toLocaleString()}</p>}
                </>
              ) : (
                <p className="text-cream/65 mb-4">No confirmation code was provided. Use the link Meta gave you when you requested deletion.</p>
              )}
              <p className="text-cream/65 mb-4">
                Questions? Contact us at{' '}
                <a href="mailto:alx.evolves@gmail.com" className="text-cream underline hover:no-underline">
                  alx.evolves@gmail.com
                </a>
                .
              </p>
            </div>
          </Container>
        </section>
      </main>
      <Footer media={media} />
    </>
  )
}
