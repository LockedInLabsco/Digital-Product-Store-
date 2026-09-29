import type { Metadata } from 'next'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import { getWebsiteMedia } from '@/src/lib/supabase/settings'

export const metadata: Metadata = {
  title: 'Data Deletion Instructions',
  description: 'How to request deletion of data associated with an Instagram automation interaction connected to N4N Content OS.',
}

export default async function DataDeletionPage() {
  const media = await getWebsiteMedia()

  return (
    <>
      <Navbar media={media} />
      <main className="bg-ink">
        <section className="py-12 sm:py-16">
          <Container>
            <Link
              href="/"
              className="text-cream/55 hover:text-gold mb-6 sm:mb-8 inline-block text-sm"
            >
              ← Back Home
            </Link>
            <div className="max-w-3xl">
              <h1 className="font-serif text-5xl sm:text-6xl mb-4 leading-tight text-cream">Data Deletion Instructions</h1>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-line/10">
          <Container>
            <div className="max-w-3xl prose prose-sm">
              <p className="text-cream/65 mb-4">
                N4N Content OS is a private internal tool used to manage Instagram content and automation.
              </p>
              <p className="text-cream/65 mb-4">
                If you have interacted with an Instagram automation connected to N4N Content OS and would
                like any stored information associated with your interaction to be deleted, please contact
                us at:{' '}
                <a href="mailto:alx.evolves@gmail.com" className="text-cream underline hover:no-underline">
                  alx.evolves@gmail.com
                </a>
                .
              </p>
              <p className="text-cream/65 mb-4">
                Include enough information for us to identify the relevant interaction, such as your
                Instagram username.
              </p>
              <p className="text-cream/65 mb-4">
                Once your request is verified, any stored data associated with that interaction will be
                deleted from our systems within a reasonable period.
              </p>
              <p className="text-cream/65 mb-4">
                If you have questions about how data is handled, please refer to our{' '}
                <Link href="/privacy" className="text-cream underline hover:no-underline">
                  Privacy Policy
                </Link>
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
