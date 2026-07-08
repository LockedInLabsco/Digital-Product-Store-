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

interface Product extends ProductFormData {
  id: string
  created_at: string
}

export default function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
      return
    }

    fetchProduct()
  }, [params.id, router])

  const fetchProduct = async () => {
    try {
      setError('')
      const response = await fetch(`/api/admin/products/${params.id}`)

      if (!response.ok) {
        throw new Error('Product not found')
      }

      const data = await response.json()
      setProduct(data.product)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmit = async (data: ProductFormData) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/admin/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update product')
      }

      const result = await response.json()
      setProduct(result.product)
      setSuccess(`✅ Product "${result.product.title}" updated successfully!`)

      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading product...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Container className="py-12">
          <div className="max-w-2xl">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/admin/products" className="text-black hover:text-gray-600">
              ← Back to Products
            </Link>
          </div>
        </Container>
      </main>
    )
  }

  if (!product) {
    return null
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
            <h1 className="text-3xl font-bold mb-2">Edit Product</h1>
            <p className="text-gray-600">{product.title}</p>
          </div>

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-8">
              {success}
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <ProductForm
              mode="edit"
              initialData={product}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        </div>
      </Container>
    </main>
  )
}
