import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'inverse'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

  const variantClasses = {
    primary: 'bg-gold text-ink hover:bg-gold-hover',
    secondary: 'bg-charcoal text-cream border border-cream/15 hover:border-gold/50',
    outline: 'border border-cream/25 bg-transparent text-cream hover:border-cream',
    inverse: 'bg-cream text-ink hover:bg-cream/85',
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
