'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'

interface Product {
  id: string
  title: string
  slug: string
  price: number
  is_active: boolean
  created_at: string
}

export default function ProductsClient() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/products')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error(data.error || 'Failed to fetch products')
      }

      setProducts(data.products || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete product')
      }

      setProducts(products.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Products</h2>
              <p className="text-admin-muted">Manage all your digital products</p>
            </div>
            <Link href="/admin/products/new">
              <Button className="bg-admin-accent text-admin-accentText hover:bg-admin-accentHover">
                + New Product
              </Button>
            </Link>
          </div>

          {error && (
            <div className="p-4 bg-red-950/40 border border-red-900 rounded-lg text-red-400 mb-8">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-admin-muted">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 border border-admin-border rounded-lg bg-admin-surface">
              <p className="text-admin-muted mb-6">No products yet</p>
              <Link href="/admin/products/new">
                <Button className="bg-admin-accent text-admin-accentText hover:bg-admin-accentHover">
                  Create Your First Product
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-admin-border bg-admin-surface">
                    <th className="text-left py-4 px-4 font-semibold">Title</th>
                    <th className="text-left py-4 px-4 font-semibold">Slug</th>
                    <th className="text-left py-4 px-4 font-semibold">Price</th>
                    <th className="text-left py-4 px-4 font-semibold">Status</th>
                    <th className="text-left py-4 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-admin-border bg-admin-surface hover:bg-admin-surface2"
                    >
                      <td className="py-4 px-4">
                        <p className="font-medium">{product.title}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-admin-muted text-sm">{product.slug}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium">
                          {product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            product.is_active
                              ? 'bg-green-950/40 text-green-400'
                              : 'bg-admin-surface2 text-admin-text'
                          }`}
                        >
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Link href={`/admin/products/${product.id}/edit`}>
                            <button className="text-admin-text hover:text-admin-muted text-sm font-medium">
                              Edit
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id, product.title)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Container>
    </main>
  )
}
