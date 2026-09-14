interface PathIllustrationProps {
  className?: string
  variant?: 'path' | 'focus'
}

/** Original decorative line drawings, used only in empty visual fallbacks. */
export default function PathIllustration({ className = '', variant = 'path' }: PathIllustrationProps) {
  return (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {variant === 'path' ? (
          <>
            <path d="M49 258c46-19 102-9 140-35 42-29-21-43-8-76 10-27 70-31 90-57 10-13 11-29 7-43" />
            <path d="M89 273c47-13 105-5 139-38 40-40-18-63-9-81 9-17 60-23 83-51 15-18 14-42 7-64" />
            <path d="m271 54 17-23 30 8" />
            <path d="M48 224h25m-13-11-1 23M326 163l9-9m-7 22 17-1" stroke="#a3a3a3" strokeWidth="2" />
            <ellipse cx="122" cy="140" rx="29" ry="7" fill="#e5e5e5" stroke="none" />
            <path d="m109 139 5-39 20-1 2 41m-22-34-16 18m35-20 18 12 12-6" />
            <path d="m117 142-6 33-16 22m36-56 9 32 19 15m-73 12 12-3m60-9 10 3" />
            <path d="M112 82c-2-18 25-24 29-6 5 21-26 28-29 6Z" fill="white" />
            <path d="m111 78 27-8m-30 6c-1-13 19-22 28-9" />
            <path d="M74 264c37-8 80-10 109-22" stroke="#a3a3a3" strokeDasharray="3 9" strokeWidth="1.5" />
          </>
        ) : (
          <>
            <path d="m84 214 231-3m-204 4-8 42m189-45 10 43" />
            <path d="m123 202-9-101 131-5 12 103-134 3Z" fill="white" />
            <path d="m125 113 107-4 9 74-109 4-7-74Z" fill="#f5f5f5" />
            <path d="m121 202-17 9 168-3-18-9m-89-58 10 11 23-27m-44 41 61-2" />
            <path d="m283 177 32-4 4 28-32 4-4-28Zm32 3c22-4 22 20 3 16" />
            <path d="M292 159c-8-12 9-15 2-28" stroke="#737373" />
            <path d="m54 185 23-5 6 31-24 4-5-30Zm6 7 13-3m-9 17 7-1" />
            <path d="M167 65v-15m25 18 8-14m-59 17-9-11" />
          </>
        )}
      </g>
    </svg>
  )
}
