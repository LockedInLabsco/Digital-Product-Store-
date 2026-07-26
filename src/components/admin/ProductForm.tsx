'use client'

import { useState } from 'react'
import Button from '../Button'

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

interface ProductFormProps {
  initialData?: Partial<ProductFormData>
  onSubmit: (data: ProductFormData) => Promise<void>
  isLoading?: boolean
  mode: 'create' | 'edit'
}

export default function ProductForm({
  initialData,
  onSubmit,
  isLoading = false,
  mode,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    short_description: initialData?.short_description || '',
    price: initialData?.price || 0,
    currency: initialData?.currency || 'USD',
    cover_image_url: initialData?.cover_image_url || '',
    file_path: initialData?.file_path || '',
    paddle_product_id: initialData?.paddle_product_id || '',
    paddle_price_id: initialData?.paddle_price_id || '',
    is_active: initialData?.is_active !== false,
  })

  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked :
        type === 'number' ? parseFloat(value) || 0 :
        value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    if (!formData.slug.trim()) {
      setError('Slug is required')
      return
    }

    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    }
  }

  const isFree = formData.price === 0
  const isPaid = formData.price > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-bold mb-6">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Product Title *
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Product title"
              required
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-2">
              Slug (URL) *
            </label>
            <input
              id="slug"
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="product-url-slug"
              required
            />
            <p className="text-xs text-gray-600 mt-1">URL-friendly name (lowercase, hyphens only)</p>
          </div>

          <div>
            <label htmlFor="short_description" className="block text-sm font-medium mb-2">
              Short Description
            </label>
            <input
              id="short_description"
              type="text"
              name="short_description"
              value={formData.short_description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Brief description for listings"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Full Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Full product description"
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-bold mb-6">Pricing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium mb-2">
              Price
            </label>
            <input
              id="price"
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="0"
            />
            <p className="text-xs text-gray-600 mt-1">
              {isFree ? '✅ Free product' : isPaid ? `💰 Paid product ($${formData.price.toFixed(2)})` : ''}
            </p>
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium mb-2">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-bold mb-6">Media & Files</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="cover_image_url" className="block text-sm font-medium mb-2">
              Cover Image URL
            </label>
            <input
              id="cover_image_url"
              type="url"
              name="cover_image_url"
              value={formData.cover_image_url}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="https://..."
            />
          </div>

          <div>
            <label htmlFor="file_path" className="block text-sm font-medium mb-2">
              File Path (in Supabase bucket)
            </label>
            <input
              id="file_path"
              type="text"
              name="file_path"
              value={formData.file_path}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="folder/product-file.pdf"
            />
            <p className="text-xs text-gray-600 mt-1">Path to the downloadable file in Supabase Storage</p>
          </div>
        </div>
      </div>

      {/* Paddle Configuration (Only for Paid Products) */}
      {isPaid && (
        <div className="border-t pt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-6">Paddle Payment Configuration</h3>
          <p className="text-sm text-gray-600 mb-4">
            Configure Paddle payment IDs for this paid product
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="paddle_product_id" className="block text-sm font-medium mb-2">
                Paddle Product ID
              </label>
              <input
                id="paddle_product_id"
                type="text"
                name="paddle_product_id"
                value={formData.paddle_product_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="pro_..."
              />
              <p className="text-xs text-gray-600 mt-1">From Paddle Dashboard → Products</p>
            </div>

            <div>
              <label htmlFor="paddle_price_id" className="block text-sm font-medium mb-2">
                Paddle Price ID *
              </label>
              <input
                id="paddle_price_id"
                type="text"
                name="paddle_price_id"
                value={formData.paddle_price_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="pri_..."
              />
              <p className="text-xs text-gray-600 mt-1">From Paddle Dashboard → Products → Prices</p>
            </div>
          </div>
        </div>
      )}

      {isFree && (
        <div className="border-t pt-8 bg-green-50 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2">Free Product</h3>
          <p className="text-sm text-gray-600">
            This product is free. Customers will receive a download link via email.
          </p>
        </div>
      )}

      {/* Visibility */}
      <div className="border-t pt-8">
        <h3 className="text-lg font-bold mb-6">Visibility</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-5 h-5 rounded border-gray-300 cursor-pointer"
          />
          <span className="font-medium">Active (visible to customers)</span>
        </label>
      </div>

      {/* Submit */}
      <div className="border-t pt-8 flex gap-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-black text-white hover:bg-gray-900"
        >
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
