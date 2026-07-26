import Link from 'next/link'
import Container from './Container'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-20">
      <Container className="py-12">
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12"
          data-reveal="up"
        >
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold mb-4">Simple Tools</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Simple tools for better habits. Buy once, use forever.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6 sm:gap-8">
            <Link
              href="/products"
              className="text-gray-700 hover:text-black transition-colors text-sm"
            >
              Product
            </Link>
            <Link
              href="/"
              className="text-gray-700 hover:text-black transition-colors text-sm"
            >
              Home
            </Link>
            <Link
              href="/terms"
              className="text-gray-700 hover:text-black transition-colors text-sm"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-gray-700 hover:text-black transition-colors text-sm"
            >
              Privacy
            </Link>
            <Link
              href="/refunds"
              className="text-gray-700 hover:text-black transition-colors text-sm"
            >
              Refunds
            </Link>
          </div>
        </div>

        <div
          className="border-t border-gray-200 pt-8 text-center text-gray-600 text-sm"
          data-reveal="fade"
        >
          <p>&copy; 2024 Simple Tools. Made with care.</p>
        </div>
      </Container>
    </footer>
  )
}
