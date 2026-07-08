'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import ProductForm from '@/src/components/admin/ProductForm'

interface ProductFormData {
  title: string
  slug: string
  description: string
  short_description: string
  price: number
  currency: string
  cover_image_url: string
  file_path: string
  paddle_product_id: string
  paddle_price_id: string
  is_active: boolean
}

export default function NewProductPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    }
  }, [router])

  const handleSubmit = async (data: ProductFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create product')
      }

      const result = await response.json()
      setSuccess(`✅ Product "${result.product.title}" created successfully!`)

      setTimeout(() => {
        router.push('/admin/products')
      }, 1500)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <Container className="py-4">
          <Link href="/admin/products" className="text-gray-600 hover:text-black text-sm">
            ← Back to Products
          </Link>
        </Container>
      </div>

      <Container className="py-12">
        <div className="max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Product</h1>
            <p className="text-gray-600">Add a new digital product to your store</p>
          </div>

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-8">
              {success}
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <ProductForm
              mode="create"
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        </div>
      </Container>
    </main>
  )
}
