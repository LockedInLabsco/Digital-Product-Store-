import RequirePermission from '@/src/components/admin/RequirePermission'
import MediaClient from './MediaClient'

export default function AdminMediaPage() {
  return (
    <RequirePermission permission="media:read">
      <MediaClient />
    </RequirePermission>
  )
}
