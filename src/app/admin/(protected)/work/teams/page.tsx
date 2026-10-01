import Container from '@/src/components/Container'
import RequirePermission from '@/src/components/admin/RequirePermission'
import WorkSubNav from '../WorkSubNav'
import TeamsClient from './TeamsClient'

export default function WorkTeamsPage() {
  return (
    <RequirePermission permission="work:read_own">
      <main className="min-h-screen bg-admin-bg">
        <Container className="py-12">
          <div className="max-w-4xl">
            <WorkSubNav />
            <TeamsClient />
          </div>
        </Container>
      </main>
    </RequirePermission>
  )
}
