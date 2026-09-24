/**
 * Static stand-in for the 3D N4N hero object. Rendered whenever WebGL is
 * unavailable, the visitor prefers reduced motion, or while the real
 * scene is still loading — the homepage must look intentional and
 * complete either way, never like something failed to load.
 */
export default function WebGLFallback({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative flex aspect-square w-full items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <div className="relative flex h-[68%] w-[68%] items-center justify-center rounded-[2.5rem] border border-line/15 bg-gradient-to-br from-charcoal via-ink to-black shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]">
        <span className="select-none font-serif text-[5rem] font-semibold leading-none tracking-tight text-cream/90 sm:text-[7rem]">
          N4N
        </span>
        <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-gradient-to-t from-transparent via-transparent to-cream/[0.06]" />
      </div>
    </div>
  )
}
