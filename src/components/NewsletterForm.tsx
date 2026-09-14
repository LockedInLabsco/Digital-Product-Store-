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
        className="w-full flex-1 cursor-not-allowed rounded-md border border-neutral-400 bg-offwhite px-4 py-3 text-sm text-beige placeholder:text-dust"
      />
      <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-line px-6 py-3 text-sm font-semibold text-beige">
        Coming soon
      </span>
    </div>
  )
}
