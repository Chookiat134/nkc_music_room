// src/components/layout/Navbar.tsx
'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Calendar, 
  Guitar, 
  Wrench, 
  User, 
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  X
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    label: 'หน้าหลัก',
    href: '/',
    icon: LayoutDashboard
  },
  {
    label: 'จองห้อง',
    href: '/booking',
    icon: Calendar
  },
  {
    label: 'ยืม/คืนอุปกรณ์',
    href: '/equipment',
    icon: Guitar
  },
  {
    label: 'แจ้งซ่อม',
    href: '/maintenance',
    icon: Wrench
  },
  {
    label: 'จัดการผู้ใช้',
    href: '/admin/users',
    icon: Users,
    adminOnly: true
  },
  {
    label: 'จัดการระบบ',
    href: '/admin/dashboard',
    icon: Settings,
    adminOnly: true
  }
]

export function Navbar() {
  const { user, isLoaded } = useUser()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)

  // Check user role from database
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const response = await fetch(`/api/users/role?clerk_id=${user.id}`)
          if (response.ok) {
            const data = await response.json()
            setUserRole(data.role)
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
        }
      }
    }

    if (isLoaded && user) {
      checkUserRole()
    }
  }, [user, isLoaded])

  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || userRole === 'admin'
  )

  if (!isLoaded) {
    return <div className="h-16 bg-white border-b" /> // Loading placeholder
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Guitar className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">
              Music Room
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <User className="h-4 w-4" />
                  <span>โปรไฟล์</span>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <div className="flex space-x-2">
                <Link href="/sign-in">
                  <Button variant="ghost">เข้าสู่ระบบ</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>สมัครสมาชิก</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              className="md:hidden"
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium",
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              
              {user && (
                <Link
                  href="/profile"
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>โปรไฟล์</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// src/components/layout/Footer.tsx


// src/app/layout.tsx (updated)
