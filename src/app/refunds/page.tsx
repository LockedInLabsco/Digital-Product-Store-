import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import Button from '@/src/components/Button'

export default function RefundsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="py-12 sm:py-16">
          <Container>
            <Link
              href="/"
              className="text-gray-600 hover:text-black mb-6 sm:mb-8 inline-block text-sm"
            >
              ← Back Home
            </Link>
            <div className="max-w-3xl">
              <h1 className="text-5xl sm:text-6xl font-bold mb-4 leading-tight">Refund Policy</h1>
              <p className="text-gray-600 text-lg mb-8">Last updated: July 2026</p>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <div className="max-w-3xl prose prose-sm">
              <h2 className="text-2xl font-bold mb-4 mt-8">Digital Products Are Non-Refundable</h2>
              <p className="text-gray-700 mb-4">
                Our digital products are generally non-refundable once you receive your download link. Because these are digital downloads delivered immediately via email, the product has been delivered and you have full access to the content.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">Exceptions to Our Refund Policy</h2>
              <p className="text-gray-700 mb-4">
                We will consider refund requests in the following situations:
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">1. Technical Issues</h3>
              <p className="text-gray-700 mb-4">
                If you cannot access or download your product due to a technical error on our part, we will help you troubleshoot. If we cannot resolve the issue, we will provide a full refund.
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">2. Duplicate Purchases</h3>
              <p className="text-gray-700 mb-4">
                If you were accidentally charged twice for the same product, we will refund the duplicate charge.
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">3. Unauthorized Charges</h3>
              <p className="text-gray-700 mb-4">
                If you believe a charge was made without your authorization, please contact us immediately.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">How to Request a Refund</h2>
              <p className="text-gray-700 mb-4">
                To request a refund, email us at <a href="mailto:hello@not4normal.store" className="text-black underline hover:no-underline">hello@not4normal.store</a> with:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Your email address used for the purchase</li>
                <li>The product you purchased</li>
                <li>The reason for your refund request</li>
                <li>The date of purchase</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4 mt-8">Response Time</h2>
              <p className="text-gray-700 mb-4">
                We will review your refund request within 5 business days. If approved, the refund will be processed to your original payment method within 7-10 business days.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">What About Money-Back Guarantees?</h2>
              <p className="text-gray-700 mb-4">
                Some of our products may include a satisfaction guarantee (usually 30 days). If a product you purchased includes this guarantee, you can request a full refund within the specified timeframe—no questions asked. Check your email or the product page for details.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about our refund policy or want to request a refund, please contact us at <a href="mailto:hello@not4normal.store" className="text-black underline hover:no-underline">hello@not4normal.store</a>.
              </p>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-gray-200 bg-gray-50">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">Need Help?</h2>
              <p className="text-lg text-gray-700 mb-8">
                If you have issues accessing your product or have questions about our refund policy, we&apos;re here to help.
              </p>
              <a href="mailto:hello@not4normal.store">
                <Button>Contact Support</Button>
              </a>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
