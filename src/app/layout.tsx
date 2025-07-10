import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Music Room Booking System',
  description: 'ระบบจองห้องดนตรีและยืม/คืนอุปกรณ์ดนตรี',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="th">
        <body className={`${inter.className} min-h-screen flex flex-col`}>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}