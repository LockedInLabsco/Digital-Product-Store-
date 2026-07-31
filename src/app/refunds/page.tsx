import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import Button from '@/src/components/Button'
import { getWebsiteMedia } from '@/src/lib/supabase/settings'

export default async function RefundsPage() {
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
              <h1 className="font-serif text-5xl sm:text-6xl mb-4 leading-tight text-cream">Refund Policy</h1>
              <p className="text-cream/55 text-lg mb-8">Last updated: July 2026</p>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-cream/10">
          <Container>
            <div className="max-w-3xl prose prose-sm">
              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Digital Products Are Non-Refundable</h2>
              <p className="text-cream/65 mb-4">
                Our digital products are generally non-refundable once you receive your download link. Because these are digital downloads delivered immediately via email, the product has been delivered and you have full access to the content.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Exceptions to Our Refund Policy</h2>
              <p className="text-cream/65 mb-4">
                We will consider refund requests in the following situations:
              </p>

              <h3 className="font-serif text-xl mb-3 mt-6 text-cream">1. Technical Issues</h3>
              <p className="text-cream/65 mb-4">
                If you cannot access or download your product due to a technical error on our part, we will help you troubleshoot. If we cannot resolve the issue, we will provide a full refund.
              </p>

              <h3 className="font-serif text-xl mb-3 mt-6 text-cream">2. Duplicate Purchases</h3>
              <p className="text-cream/65 mb-4">
                If you were accidentally charged twice for the same product, we will refund the duplicate charge.
              </p>

              <h3 className="font-serif text-xl mb-3 mt-6 text-cream">3. Unauthorized Charges</h3>
              <p className="text-cream/65 mb-4">
                If you believe a charge was made without your authorization, please contact us immediately.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">How to Request a Refund</h2>
              <p className="text-cream/65 mb-4">
                To request a refund, email us at <a href="mailto:hello@not4normal.store" className="text-cream underline hover:no-underline">hello@not4normal.store</a> with:
              </p>
              <ul className="list-disc list-inside text-cream/65 space-y-2 mb-4">
                <li>Your email address used for the purchase</li>
                <li>The product you purchased</li>
                <li>The reason for your refund request</li>
                <li>The date of purchase</li>
              </ul>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Response Time</h2>
              <p className="text-cream/65 mb-4">
                We will review your refund request within 5 business days. If approved, the refund will be processed to your original payment method within 7-10 business days.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">What About Money-Back Guarantees?</h2>
              <p className="text-cream/65 mb-4">
                Some of our products may include a satisfaction guarantee (usually 30 days). If a product you purchased includes this guarantee, you can request a full refund within the specified timeframe—no questions asked. Check your email or the product page for details.
              </p>

              <h2 className="font-serif text-2xl mb-4 mt-8 text-cream">Contact Us</h2>
              <p className="text-cream/65 mb-4">
                If you have questions about our refund policy or want to request a refund, please contact us at <a href="mailto:hello@not4normal.store" className="text-cream underline hover:no-underline">hello@not4normal.store</a>.
              </p>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-cream/10 bg-offwhite">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-serif text-3xl sm:text-4xl mb-6 text-cream">Need Help?</h2>
              <p className="text-lg text-cream/65 mb-8">
                If you have issues accessing your product or have questions about our refund policy, we&apos;re here to help.
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
