import React from 'react'

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'inverse'
  size?: 'sm' | 'md' | 'lg'
}

// Deliberately separate from the public-site Button component so the
// admin dashboard's light UI stays unaffected by the public dark theme.
export default function AdminButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: AdminButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

  const variantClasses = {
    primary: 'bg-black text-white hover:bg-gray-800',
    secondary: 'bg-gray-100 text-black hover:bg-gray-200',
    outline: 'border border-gray-300 bg-transparent text-black hover:border-black',
    inverse: 'bg-white text-black hover:bg-gray-100',
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
