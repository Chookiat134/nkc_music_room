// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import UserInitializer from '@/components/UserInitializer'
import './globals.css'

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
        <body className="min-h-screen flex flex-col bg-gray-50">
          {/* UserInitializer จะทำงานเบื้องหลัง */}
          <UserInitializer />
          
          <Navbar />
          
          <main className="flex-1">
            {children}
          </main>
          
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  )
}