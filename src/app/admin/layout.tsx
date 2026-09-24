// The root layout's <body> defaults to the public site's dark navy/blue
// theme (bg-ink/text-cream) — this resets the admin subtree to its own,
// separate monochrome dark theme instead (see the admin-* Tailwind
// tokens in tailwind.config.ts and the .admin-root form-field rules in
// globals.css). `admin-root` is what scopes those global form-field
// styles to just this subtree.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="admin-root min-h-screen bg-admin-bg text-admin-text">{children}</div>
}
