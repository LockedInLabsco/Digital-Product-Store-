import RequirePermission from '@/src/components/admin/RequirePermission'
import EditProductClient from './EditProductClient'

export default function EditProductPage({ params }: { params: { id: string } }) {
  return (
    <RequirePermission permission="products:write">
      <EditProductClient params={params} />
    </RequirePermission>
  )
}
