import RequirePermission from '@/src/components/admin/RequirePermission'
import EditWaitlistClient from './EditWaitlistClient'

export default function EditWaitlistPage({ params }: { params: { id: string } }) {
  return (
    <RequirePermission permission="waitlists:write">
      <EditWaitlistClient params={params} />
    </RequirePermission>
  )
}
