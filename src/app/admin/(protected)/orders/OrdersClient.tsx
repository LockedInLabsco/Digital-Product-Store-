'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Button from '@/src/components/admin/AdminButton'
import type { Order } from '@/src/types/order'

function formatDate(value: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatAmount(amount: string | null, currency: string | null) {
  if (!amount && !currency) return '-'
  return [amount, currency].filter(Boolean).join(' ')
}

export default function OrdersClient() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch('/api/admin/orders')
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }

        throw new Error(data.error || 'Failed to fetch orders')
      }

      setOrders(data.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleResend = async (orderId: string) => {
    try {
      setResendingOrderId(orderId)
      setError('')
      setSuccess('')

      const response = await fetch(`/api/admin/orders/${orderId}/resend`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend download email')
      }

      setSuccess('Download email resent successfully.')
      await fetchOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend download email')
    } finally {
      setResendingOrderId(null)
    }
  }

  return (
    <main className="min-h-screen bg-admin-bg">
      <Container className="py-12">
        <div className="max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Orders</h2>
              <p className="text-admin-muted">Track paid product deliveries</p>
            </div>
            <Link href="/admin/products">
              <Button variant="outline">Products</Button>
            </Link>
          </div>

          {error && (
            <div className="p-4 bg-red-950/40 border border-red-900 rounded-lg text-red-400 mb-8">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-950/40 border border-green-900 rounded-lg text-green-400 mb-8">
              {success}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-admin-muted">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 border border-admin-border rounded-lg bg-admin-surface">
              <p className="text-admin-muted">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-admin-border bg-admin-surface">
                    <th className="text-left py-4 px-4 font-semibold">Customer</th>
                    <th className="text-left py-4 px-4 font-semibold">Product</th>
                    <th className="text-left py-4 px-4 font-semibold">Amount</th>
                    <th className="text-left py-4 px-4 font-semibold">Transaction</th>
                    <th className="text-left py-4 px-4 font-semibold">Delivery</th>
                    <th className="text-left py-4 px-4 font-semibold">Created</th>
                    <th className="text-left py-4 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-admin-border bg-admin-surface hover:bg-admin-surface2"
                    >
                      <td className="py-4 px-4">
                        <p className="text-sm">{order.customer_email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium">{order.product_title}</p>
                        <p className="text-admin-muted text-sm">{order.product_slug}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium">
                          {formatAmount(order.amount, order.currency)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-admin-muted text-sm break-all">
                          {order.paddle_transaction_id}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            order.delivery_status === 'sent'
                              ? 'bg-green-950/40 text-green-400'
                              : order.delivery_status === 'failed'
                                ? 'bg-red-950/40 text-red-400'
                                : 'bg-admin-surface2 text-admin-text'
                          }`}
                        >
                          {order.delivery_status}
                        </span>
                        {order.error_message && (
                          <p className="text-red-400 text-xs mt-2 max-w-xs">
                            {order.error_message}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-admin-muted text-sm">
                          {formatDate(order.created_at)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleResend(order.id)}
                          disabled={resendingOrderId === order.id}
                          className="text-admin-text hover:text-admin-muted text-sm font-medium disabled:text-admin-faint"
                        >
                          {resendingOrderId === order.id ? 'Sending...' : 'Resend email'}
                        </button>
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
