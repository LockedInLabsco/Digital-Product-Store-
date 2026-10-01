import Container from '@/src/components/Container'
import RequirePermission from '@/src/components/admin/RequirePermission'
import WorkSubNav from '../WorkSubNav'
import TasksClient from './TasksClient'

export default function WorkTasksPage() {
  return (
    <RequirePermission permission="work:read_own">
      <main className="min-h-screen bg-admin-bg">
        <Container className="py-12">
          <div className="max-w-6xl">
            <WorkSubNav />
            <TasksClient />
          </div>
        </Container>
      </main>
    </RequirePermission>
  )
}
