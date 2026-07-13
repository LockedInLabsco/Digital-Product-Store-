'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Container from '@/src/components/Container'

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
      setIsLoading(false)
    }
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    localStorage.removeItem('admin_token')
    router.push('/admin/login')
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <Container className="py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Not4Normal Admin</h1>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-black text-sm"
          >
            Log Out
          </button>
        </Container>
      </div>

      <Container className="py-12">
        <div className="max-w-4xl">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
            <p className="text-gray-600">Manage your digital products</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/admin/products">
              <div className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer h-full">
                <h3 className="text-lg font-bold mb-2">Products</h3>
                <p className="text-gray-600 mb-4">
                  Create, edit, and manage your products
                </p>
                <span className="text-sm text-black font-medium">View Products -&gt;</span>
              </div>
            </Link>

            <Link href="/admin/orders">
              <div className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer h-full">
                <h3 className="text-lg font-bold mb-2">Orders</h3>
                <p className="text-gray-600 mb-4">
                  View and manage customer orders
                </p>
                <span className="text-sm text-black font-medium">View Orders -&gt;</span>
              </div>
            </Link>

            <div className="border border-gray-200 rounded-lg p-6 bg-gray-100 opacity-50 cursor-not-allowed h-full">
              <h3 className="text-lg font-bold mb-2">Analytics</h3>
              <p className="text-gray-600 mb-4">
                View sales and traffic metrics
              </p>
              <span className="text-sm text-gray-500">Coming soon</span>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 bg-gray-100 opacity-50 cursor-not-allowed h-full">
              <h3 className="text-lg font-bold mb-2">Settings</h3>
              <p className="text-gray-600 mb-4">
                Configure store settings
              </p>
              <span className="text-sm text-gray-500">Coming soon</span>
            </div>
          </div>
        </div>
      </Container>
    </main>
  )
}
