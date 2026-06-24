import Link from 'next/link'
import Container from './Container'

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 sticky top-0 bg-white z-50">
      <Container className="py-6 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-gray-600 transition-colors">
          Simple Tools
        </Link>
        <div className="flex gap-8 sm:gap-12">
          <Link
            href="/"
            className="text-gray-700 hover:text-black transition-colors text-sm sm:text-base"
          >
            Home
          </Link>
          <Link
            href="/products"
            className="text-gray-700 hover:text-black transition-colors text-sm sm:text-base"
          >
            Product
          </Link>
        </div>
      </Container>
    </nav>
  )
}
