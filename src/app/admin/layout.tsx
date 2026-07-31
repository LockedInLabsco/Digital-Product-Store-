// The root layout's <body> now defaults to the public site's dark theme
// (bg-ink/text-cream). Admin pages rely on inherited text color in a few
// places, so this resets the admin subtree back to sane light-theme
// defaults without touching any admin page's own markup.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="bg-white text-black">{children}</div>
}
