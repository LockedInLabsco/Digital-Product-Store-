interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export default function Button({ children, onClick, className }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors ${className || ''}`}
    >
      {children}
    </button>
  )
}
