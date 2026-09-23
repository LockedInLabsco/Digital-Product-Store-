import RequirePermission from '@/src/components/admin/RequirePermission'
import NewWaitlistClient from './NewWaitlistClient'

export default function NewWaitlistPage() {
  return (
    <RequirePermission permission="waitlists:write">
      <NewWaitlistClient />
    </RequirePermission>
  )
}
