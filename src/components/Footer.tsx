import Link from 'next/link'
import Container from './Container'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 mt-20">
      <Container className="py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold mb-4">Digital Store</h3>
            <p className="text-gray-600 text-sm">
              Premium digital products you can download instantly.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Products</h4>
            <div className="space-y-2 text-sm">
              <Link
                href="/products"
                className="text-gray-600 hover:text-black transition-colors"
              >
                All Products
              </Link>
              <br />
              <Link
                href="/"
                className="text-gray-600 hover:text-black transition-colors"
              >
                Home
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <p className="text-gray-600 text-sm">
              Have questions? We're here to help.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 text-center text-gray-600 text-sm">
          <p>&copy; 2024 Digital Product Store. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  )
}
