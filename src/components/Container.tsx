interface ContainerProps {
  children: React.ReactNode
  className?: string
}

export default function Container({ children, className }: ContainerProps) {
  return (
    <div className={`site-container ${className || ''}`}>
      {children}
    </div>
  )
}
