import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import Button from '@/src/components/Button'

export default function TermsPage() {
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
              <h1 className="text-5xl sm:text-6xl font-bold mb-4 leading-tight">Terms of Service</h1>
              <p className="text-gray-600 text-lg mb-8">Last updated: July 2026</p>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <div className="max-w-3xl prose prose-sm">
              <h2 className="text-2xl font-bold mb-4 mt-8">1. What We Sell</h2>
              <p className="text-gray-700 mb-4">
                Not4Normal creates and sells digital products, guides, templates, and self-improvement tools. These are digital downloads delivered to your email after purchase.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">2. How You Get Your Products</h2>
              <p className="text-gray-700 mb-4">
                When you purchase a product, we send you a download link via email. You can use this link to access and download your product. The link is unique to you and should not be shared.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">3. Payment</h2>
              <p className="text-gray-700 mb-4">
                Payment is processed securely. We accept standard payment methods. By making a purchase, you agree that you are authorized to make the payment and that the payment information you provide is accurate.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">4. Use of Products</h2>
              <p className="text-gray-700 mb-4">
                Our digital products are for your personal use only. You may not:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Share your download links with others</li>
                <li>Resell or redistribute the products</li>
                <li>Use the products for commercial purposes without permission</li>
                <li>Remove or alter any copyright or ownership notices</li>
              </ul>

              <h2 className="text-2xl font-bold mb-4 mt-8">5. No Refunds</h2>
              <p className="text-gray-700 mb-4">
                Digital products are generally non-refundable once you receive your download link. This is because the product has been delivered and you have immediate access to the content.
              </p>
              <p className="text-gray-700 mb-4">
                We will consider refund requests in cases of:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Technical issues preventing access to your download</li>
                <li>Duplicate or accidental charges</li>
              </ul>
              <p className="text-gray-700 mb-4">
                If you believe you qualify, email us at <a href="mailto:hello@not4normal.store" className="text-black underline hover:no-underline">hello@not4normal.store</a>.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">6. Limitations</h2>
              <p className="text-gray-700 mb-4">
                Our products are provided &quot;as is.&quot; We do not guarantee that they will meet your specific needs or produce any particular results. We are not responsible for any outcomes from using our products.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">7. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We may update these terms at any time. Your continued use of our site and products constitutes acceptance of the updated terms.
              </p>

              <h2 className="text-2xl font-bold mb-4 mt-8">8. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about these terms, please contact us at <a href="mailto:hello@not4normal.store" className="text-black underline hover:no-underline">hello@not4normal.store</a>.
              </p>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-20 border-t border-gray-200 bg-gray-50">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">Questions?</h2>
              <p className="text-lg text-gray-700 mb-8">
                If you have any questions about these terms, please reach out to us.
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
