import RequirePermission from '@/src/components/admin/RequirePermission'
import AnalyticsClient from './AnalyticsClient'

export default function AdminAnalyticsPage() {
  return (
    <RequirePermission permission="analytics:read">
      <AnalyticsClient />
    </RequirePermission>
  )
}
