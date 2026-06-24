import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Simple Tools - Habits, Focus, Discipline',
  description: 'Simple tools for building better habits. The Simple Habit Reset - a beginner-friendly guide to restart your habits one step at a time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased">
        {children}
      </body>
    </html>
  )
}
