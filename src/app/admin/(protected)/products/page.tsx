import RequirePermission from '@/src/components/admin/RequirePermission'
import ProductsClient from './ProductsClient'

export default function AdminProductsPage() {
  return (
    <RequirePermission permission="products:read">
      <ProductsClient />
    </RequirePermission>
  )
}
