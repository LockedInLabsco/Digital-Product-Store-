import RequirePermission from '@/src/components/admin/RequirePermission'
import NewProductClient from './NewProductClient'

export default function NewProductPage() {
  return (
    <RequirePermission permission="products:write">
      <NewProductClient />
    </RequirePermission>
  )
}
