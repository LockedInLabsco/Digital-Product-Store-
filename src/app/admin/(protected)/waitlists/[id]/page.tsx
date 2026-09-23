import RequirePermission from '@/src/components/admin/RequirePermission'
import WaitlistDetailClient from './WaitlistDetailClient'

export default function WaitlistDetailPage({ params }: { params: { id: string } }) {
  return (
    <RequirePermission permission="waitlists:read">
      <WaitlistDetailClient params={params} />
    </RequirePermission>
  )
}
