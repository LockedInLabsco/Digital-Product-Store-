import React from 'react'

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'inverse'
  size?: 'sm' | 'md' | 'lg'
}

// Deliberately separate from the public-site Button component — the
// admin panel has its own monochrome dark theme (admin-* Tailwind
// tokens, see tailwind.config.ts), independent of the public site's
// dark navy/blue theme those Button variants use.
export default function AdminButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: AdminButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-bg disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

  const variantClasses = {
    primary: 'bg-admin-accent text-admin-accentText hover:bg-admin-accentHover',
    secondary: 'bg-admin-surface2 text-admin-text hover:bg-admin-surface3',
    outline: 'border border-admin-border bg-transparent text-admin-text hover:border-admin-text',
    inverse: 'bg-admin-surface text-admin-text hover:bg-admin-surface2',
  }

  const sizeClasses = {
    sm: 'px-4 py-2.5 text-[0.7rem]',
    md: 'px-6 py-3',
    lg: 'px-7 py-4 text-sm',
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}
