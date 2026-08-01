// No email-list provider is connected yet. Rather than fake a
// successful signup, this shows an honest "coming soon" state.
export default function NewsletterForm() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        disabled
        placeholder="your@email.com"
        aria-label="Email address"
        className="w-full flex-1 cursor-not-allowed rounded-sm border border-line/15 bg-transparent px-4 py-3 text-sm text-cream/40 placeholder:text-cream/30"
      />
      <span className="inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-line/25 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cream/50">
        Coming soon
      </span>
    </div>
  )
}
