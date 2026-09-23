import RequirePermission from '@/src/components/admin/RequirePermission'
import OrdersClient from './OrdersClient'

export default function AdminOrdersPage() {
  return (
    <RequirePermission permission="orders:read">
      <OrdersClient />
    </RequirePermission>
  )
}
