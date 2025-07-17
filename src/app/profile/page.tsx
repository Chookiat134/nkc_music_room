// src/app/profile/page.tsx
'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { User, Mail, Calendar, Guitar, Wrench } from 'lucide-react'

interface UserStats {
  total_bookings: number
  active_bookings: number
  total_loans: number
  active_loans: number
  total_maintenance_requests: number
  pending_maintenance: number
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  stats: UserStats
}

// Component สำหรับสร้าง Avatar จากชื่อ
const AvatarFromName = ({ name, size = 80 }: { name: string; size?: number }) => {
  // ดึงตัวอักษรแรกของชื่อ
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // สร้างสีจากชื่อ
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div 
      className={`${getColorFromName(name)} rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </div>
  )
}

// Component สำหรับรูปโปรไฟล์
import type { UserResource } from '@clerk/types'

const ProfileAvatar = ({ user, size = 80 }: { user: UserResource; size?: number }) => {
  // ถ้ามีรูปจาก Clerk ให้ใช้
  if (user.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt="Profile"
        className="rounded-full mx-auto mb-4 object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  // ถ้าไม่มีรูป ให้สร้าง Avatar จากชื่อ
  if (user.fullName) {
    return <AvatarFromName name={user.fullName} size={size} />
  }

  // ถ้าไม่มีชื่อ ให้สร้างจาก email
  if (user.primaryEmailAddress?.emailAddress) {
    const emailName = user.primaryEmailAddress.emailAddress.split('@')[0]
    return <AvatarFromName name={emailName} size={size} />
  }

  // สุดท้ายถ้าไม่มีอะไรเลย ให้ใช้ไอคอน User
  return (
    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <User className="w-10 h-10 text-blue-600" />
    </div>
  )
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        setLoading(true)
        const response = await fetch(`/api/users/profile?clerk_id=${user.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }

        const data = await response.json()
        setUserData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      } finally {
        setLoading(false)
      }
    }

    if (isLoaded && user) {
      fetchUserData()
    }
  }, [user, isLoaded])

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">กรุณาเข้าสู่ระบบ</h2>
          <p className="text-gray-600">คุณต้องเข้าสู่ระบบก่อนเพื่อดูโปรไฟล์</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">โปรไฟล์ของฉัน</h1>
          <p className="text-gray-600">จัดการข้อมูลส่วนตัวและดูสถิติการใช้งาน</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center">
                {/* ใช้ ProfileAvatar component ใหม่ */}
                <ProfileAvatar user={user} size={80} />
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {user.fullName || user.firstName || 'ผู้ใช้'}
                </h2>
                <div className="flex items-center justify-center text-gray-600 mb-2">
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="text-sm">{user.primaryEmailAddress?.emailAddress}</span>
                </div>
                <div className="flex items-center justify-center text-gray-600 mb-4">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    สมาชิกตั้งแต่: {userData?.created_at 
                      ? new Date(userData.created_at).toLocaleDateString('th-TH')
                      : 'ไม่ทราบ'
                    }
                  </span>
                </div>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  userData?.role === 'admin' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {userData?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Booking Stats */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">การจองห้อง</h3>
                    <p className="text-sm text-gray-600">สถิติการจองห้องดนตรี</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">จองทั้งหมด:</span>
                    <span className="font-semibold">{userData?.stats?.total_bookings || 0} ครั้ง</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">กำลังใช้งาน:</span>
                    <span className="font-semibold text-green-600">{userData?.stats?.active_bookings || 0} ห้อง</span>
                  </div>
                </div>
              </div>

              {/* Equipment Stats */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Guitar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">การยืมอุปกรณ์</h3>
                    <p className="text-sm text-gray-600">สถิติการยืม/คืนอุปกรณ์</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ยืมทั้งหมด:</span>
                    <span className="font-semibold">{userData?.stats?.total_loans || 0} ครั้ง</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">กำลังยืม:</span>
                    <span className="font-semibold text-green-600">{userData?.stats?.active_loans || 0} ชิ้น</span>
                  </div>
                </div>
              </div>

              {/* Maintenance Stats */}
              <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">การแจ้งซ่อม</h3>
                    <p className="text-sm text-gray-600">สถิติการแจ้งซ่อมอุปกรณ์</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">แจ้งซ่อมทั้งหมด:</span>
                    <span className="font-semibold">{userData?.stats?.total_maintenance_requests || 0} ครั้ง</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">รอดำเนินการ:</span>
                    <span className="font-semibold text-red-600">{userData?.stats?.pending_maintenance || 0} รายการ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ลิงก์ด่วน</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/booking"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">จองห้องดนตรี</h4>
                <p className="text-sm text-gray-600">จองห้องสำหรับฝึกซ้อม</p>
              </div>
            </a>
            
            <a
              href="/equipment"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Guitar className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">ยืม/คืนอุปกรณ์</h4>
                <p className="text-sm text-gray-600">จัดการการยืมอุปกรณ์</p>
              </div>
            </a>
            
            <a
              href="/maintenance"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Wrench className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">แจ้งซ่อม</h4>
                <p className="text-sm text-gray-600">รายงานอุปกรณ์ชำรุด</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}