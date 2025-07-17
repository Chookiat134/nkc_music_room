'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

interface UserInitializerProps {
  onUserInitialized?: (role: 'admin' | 'user') => void
}

export default function UserInitializer({ onUserInitialized }: UserInitializerProps) {
  const { user, isLoaded } = useUser()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeUser = async () => {
      // ถ้า user ยังไม่โหลดเสร็จ หรือไม่มี user หรือเคยสร้างแล้ว ให้ skip
      if (!isLoaded || !user || isInitialized) return

      try {
        // เรียกใช้ API สร้าง/อัพเดท user
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log('User initialized successfully:', data)
          setIsInitialized(true)

          // เรียก callback ถ้ามี พร้อมกับ role
          if (onUserInitialized && data.user?.role) {
            onUserInitialized(data.user.role)
          }
        } else {
          const errorText = await response.text()
          console.error('Failed to initialize user:', errorText)
        }
      } catch (error) {
        console.error('Error initializing user:', error)
      }
    }

    initializeUser()
  }, [user, isLoaded, isInitialized, onUserInitialized])

  // Component นี้ไม่แสดงอะไร
  return null
}