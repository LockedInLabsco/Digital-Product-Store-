import Container from '@/src/components/Container'
import SignOutButton from './SignOutButton'

interface AccessDeniedProps {
  /** 'not-admin': signed in to Supabase but no admin_users membership.
   * 'permission': an active admin, just missing this specific permission. */
  reason: 'not-admin' | 'permission'
}

/**
 * Shown instead of protected content — never briefly rendered alongside
 * it. 'not-admin' is the ProtectedLayout's own gate (this Supabase
 * account isn't on the team at all); 'permission' is RequirePermission's
 * gate (a real admin, just not authorized for this specific section).
 */
export default function AccessDenied({ reason }: AccessDeniedProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-bg">
      <Container className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-3 text-admin-muted">
          {reason === 'not-admin'
            ? "You don't have access to this admin workspace."
            : "You don't have permission to view this section."}
        </p>
        <div className="mt-6">
          <SignOutButton className="inline-flex items-center justify-center rounded bg-admin-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-admin-accentHover" />
        </div>
      </Container>
    </main>
  )
}
