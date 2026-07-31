import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import Button from '@/src/components/Button'
import { getWebsiteMedia } from '@/src/lib/supabase/settings'

export default async function PrivacyPage() {
  const media = await getWebsiteMedia()

  return (
    <>
      <Navbar media={media} />
      <main className="bg-ink">
        <section className="py-12 sm:py-16">
          <Container>
            <Link
              href="/"
              className="text-cream/55 hover:text-cream mb-6 sm:mb-8 inline-block text-sm"
            >
              ← Back Home
            </Link>
            <div className="max-w-3xl">
              <h1 className="font-serif text-5xl sm:text-6xl mb-4 leading-tight text-cream">Privacy Policy</h1>
              <p className="text-cream/55 text-lg mb-8">Last updated: July 2026</p>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-cream/10">
          <Container>
            <div className="max-w-3xl prose prose-sm">
              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">What Information We Collect</h2>
              <p className="text-cream/65 mb-4">
                When you purchase a product from Not4Normal, we collect:
              </p>
              <ul className="list-disc list-inside text-cream/65 space-y-2 mb-4">
                <li>Your email address</li>
                <li>Payment information (processed securely by our payment provider)</li>
                <li>Any information you voluntarily provide when contacting us</li>
              </ul>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">How We Use Your Information</h2>
              <p className="text-cream/65 mb-4">
                We use your email address to:
              </p>
              <ul className="list-disc list-inside text-cream/65 space-y-2 mb-4">
                <li>Send you your product download link</li>
                <li>Respond to support requests</li>
                <li>Send occasional updates about our products (you can opt out anytime)</li>
              </ul>
              <p className="text-cream/65 mb-4">
                We do not share, sell, or give your information to third parties.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Payment Processing</h2>
              <p className="text-cream/65 mb-4">
                Payment information is processed securely by trusted payment processors. We do not store your full credit card details on our servers.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Cookies</h2>
              <p className="text-cream/65 mb-4">
                Our website uses basic cookies to improve your experience. These are minimal and do not track personal information.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Your Rights</h2>
              <p className="text-cream/65 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-cream/65 space-y-2 mb-4">
                <li>Know what information we have about you</li>
                <li>Request that we delete your information</li>
                <li>Opt out of marketing emails</li>
              </ul>
              <p className="text-cream/65 mb-4">
                To exercise these rights, contact us at <a href="mailto:hello@not4normal.store" className="text-cream underline hover:no-underline">hello@not4normal.store</a>.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Data Security</h2>
              <p className="text-cream/65 mb-4">
                We take reasonable steps to protect your information. However, no system is 100% secure. If you believe your information has been compromised, please contact us immediately.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Changes to This Policy</h2>
              <p className="text-cream/65 mb-4">
                We may update this privacy policy occasionally. We will notify you of significant changes by email or by posting a notice on our website.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Contact Us</h2>
              <p className="text-cream/65 mb-4">
                If you have questions about this privacy policy or how we handle your information, please contact us at <a href="mailto:hello@not4normal.store" className="text-cream underline hover:no-underline">hello@not4normal.store</a>.
              </p>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-cream/10 bg-offwhite">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-serif text-3xl sm:text-4xl mb-6 text-cream">Questions?</h2>
              <p className="text-lg text-cream/65 mb-8">
                If you have any questions about this privacy policy, please reach out to us.
              </p>
              <a href="mailto:hello@not4normal.store">
                <Button>Contact Support</Button>
              </a>
            </div>
          </Container>
        </section>
      </main>
      <Footer media={media} />
    </>
  )
}
