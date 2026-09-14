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
  // Literal class names keep Tailwind's component styles in the generated CSS.
  // Component-layer defaults allow caller utilities to override them reliably.
  const variants = {
    primary: 'button-primary',
    secondary: 'button-secondary',
    outline: 'button-outline',
    inverse: 'button-inverse',
  }
  const sizes = { sm: 'button-sm', md: 'button-md', lg: 'button-lg' }

  return (
    <button
      className={`public-button ${variants[variant]} ${sizes[size]} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  )
}
