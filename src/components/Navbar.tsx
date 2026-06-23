import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 py-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          DPS
        </Link>
        <div className="flex gap-8">
          <Link href="/products" className="hover:text-gray-600 transition-colors">
            Products
          </Link>
          <Link href="/" className="hover:text-gray-600 transition-colors">
            Home
          </Link>
        </div>
      </div>
    </nav>
  )
}
