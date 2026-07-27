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
    'motion-button button-label rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2'

  const variantClasses = {
    primary: 'bg-black text-white hover:bg-zinc-800',
    secondary: 'bg-zinc-200 text-black hover:bg-white',
    outline: 'border border-current bg-transparent hover:bg-white hover:text-black',
    inverse: 'bg-white text-black hover:bg-zinc-200',
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
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
