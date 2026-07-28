interface ContainerProps {
  children: React.ReactNode
  className?: string
}

export default function Container({ children, className }: ContainerProps) {
  return (
    <div className={`w-full max-w-container mx-auto px-6 sm:px-8 lg:px-10 ${className || ''}`}>
      {children}
    </div>
  )
}
