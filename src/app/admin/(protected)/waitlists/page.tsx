import RequirePermission from '@/src/components/admin/RequirePermission'
import WaitlistsClient from './WaitlistsClient'

export default function AdminWaitlistsPage() {
  return (
    <RequirePermission permission="waitlists:read">
      <WaitlistsClient />
    </RequirePermission>
  )
}
