// src/app/admin/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
  Users,
  Calendar,
  Guitar,
  Wrench,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  Shield,
  BarChart3,
  UserPlus,
  FileText
} from 'lucide-react'

interface SystemStats {
  total_users: number
  total_admins: number
  total_regular_users: number
  new_users_this_month: number
  active_users_this_month: number
}

interface ActivityStats {
  total_bookings: number
  active_bookings: number
  pending_bookings: number
  total_loans: number
  active_loans: number
  overdue_loans: number
  total_maintenance: number
  pending_maintenance: number
  in_progress_maintenance: number
}

interface SystemHealth {
  database_status: 'healthy' | 'warning' | 'error'
  api_response_time: number
  last_backup: string
  storage_usage: number
  active_sessions: number
}

interface RecentActivity {
  id: string
  type: 'booking' | 'loan' | 'maintenance' | 'user' | 'equipment' | 'system'
  message: string
  user_name?: string
  details?: string
  created_at: string
  metadata?: unknown
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'blue' 
}: {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && trendValue && (
            <div className="flex items-center mt-2">
              {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500 mr-1" />}
              {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 mr-1" />}
              {trend === 'stable' && <Activity className="h-4 w-4 text-gray-500 mr-1" />}
              <span className={`text-sm ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

const SystemHealthCard = ({ health }: { health: SystemHealth }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'error': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle
      case 'warning': return AlertCircle
      case 'error': return AlertCircle
      default: return Clock
    }
  }

  const StatusIcon = getStatusIcon(health.database_status)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">สถานะระบบ</h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(health.database_status)}`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-sm font-medium capitalize">{health.database_status}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">เวลาตอบสนอง API</p>
          <p className="text-xl font-bold text-gray-900">{health.api_response_time}ms</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">การใช้พื้นที่</p>
          <p className="text-xl font-bold text-gray-900">{health.storage_usage}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">เซสชันที่ใช้งาน</p>
          <p className="text-xl font-bold text-gray-900">{health.active_sessions}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">สำรองข้อมูลล่าสุด</p>
          <p className="text-sm font-medium text-gray-900">{health.last_backup}</p>
        </div>
      </div>
    </div>
  )
}

const RecentActivityCard = ({ activities }: { activities: RecentActivity[] }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking': return Calendar
      case 'loan': return Guitar
      case 'maintenance': return Wrench
      case 'user': return UserPlus
      case 'equipment': return Guitar
      case 'system': return Settings
      default: return FileText
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'booking': return 'bg-blue-500'
      case 'loan': return 'bg-green-500'
      case 'maintenance': return 'bg-orange-500'
      case 'user': return 'bg-purple-500'
      case 'equipment': return 'bg-indigo-500'
      case 'system': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} วินาทีที่แล้ว`
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} นาทีที่แล้ว`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} ชั่วโมงที่แล้ว`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} วันที่แล้ว`
    }
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">กิจกรรมล่าสุด</h3>
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">ไม่มีกิจกรรมล่าสุด</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">กิจกรรมล่าสุด</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.type)
          return (
            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.message}</p>
                {activity.user_name && (
                  <p className="text-xs text-gray-600 mt-1">โดย {activity.user_name}</p>
                )}
                {activity.details && (
                  <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const response = await fetch(`/api/users/role?clerk_id=${user.id}`)
          if (response.ok) {
            const data = await response.json()
            setUserRole(data.role)
            if (data.role !== 'admin') {
              router.push('/')
            }
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
          router.push('/')
        }
      }
    }

    if (isLoaded && user) {
      checkUserRole()
    }
  }, [user, isLoaded, router])

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (userRole !== 'admin') return

      try {
        setLoading(true)
        
        // Fetch all dashboard data
        const [statsResponse, activityResponse, recentActivityResponse] = await Promise.all([
          fetch('/api/admin/users/stats'),
          fetch('/api/admin/activity/stats'),
          fetch('/api/admin/recent-activities?limit=10') // ดึงกิจกรรมล่าสุด 10 รายการ
        ])

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setSystemStats(statsData)
        }

        if (activityResponse.ok) {
          const activityData = await activityResponse.json()
          setActivityStats(activityData)
        } else {
          // Mock activity stats (กรณีที่ยังไม่มี API)
          setActivityStats({
            total_bookings: 1250,
            active_bookings: 45,
            pending_bookings: 12,
            total_loans: 890,
            active_loans: 67,
            overdue_loans: 8,
            total_maintenance: 234,
            pending_maintenance: 15,
            in_progress_maintenance: 5
          })
        }

        if (recentActivityResponse.ok) {
          const recentActivityData = await recentActivityResponse.json()
          setRecentActivities(recentActivityData)
        }

        // Mock system health (ในความเป็นจริงควรมา API)
        setSystemHealth({
          database_status: 'healthy',
          api_response_time: 120,
          last_backup: '2 ชั่วโมงที่แล้ว',
          storage_usage: 65,
          active_sessions: 23
        })

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setError('ไม่สามารถโหลดข้อมูลได้')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [userRole])

  // Auto-refresh recent activities every 30 seconds
  useEffect(() => {
    if (userRole !== 'admin') return

    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/admin/recent-activities?limit=10')
        if (response.ok) {
          const data = await response.json()
          setRecentActivities(data)
        }
      } catch (error) {
        console.error('Error refreshing recent activities:', error)
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [userRole])

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">จัดการระบบ</h1>
          <p className="text-gray-600">ภาพรวมและการจัดการระบบ Music Room</p>
        </div>

        {/* User Statistics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">สถิติผู้ใช้งาน</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard
              title="ผู้ใช้ทั้งหมด"
              value={systemStats?.total_users || 0}
              icon={Users}
              color="blue"
              trend="up"
              trendValue="+5.2%"
            />
            <StatCard
              title="ผู้ดูแลระบบ"
              value={systemStats?.total_admins || 0}
              icon={Shield}
              color="purple"
            />
            <StatCard
              title="ผู้ใช้ทั่วไป"
              value={systemStats?.total_regular_users || 0}
              icon={Users}
              color="green"
            />
            <StatCard
              title="ผู้ใช้ใหม่เดือนนี้"
              value={systemStats?.new_users_this_month || 0}
              icon={TrendingUp}
              color="yellow"
              trend="up"
              trendValue="+12.3%"
            />
            <StatCard
              title="ผู้ใช้ที่ใช้งานเดือนนี้"
              value={systemStats?.active_users_this_month || 0}
              icon={Activity}
              color="green"
              trend="up"
              trendValue="+8.1%"
            />
          </div>
        </div>

        {/* Activity Statistics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">สถิติการใช้งาน</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                การจองห้อง
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">ทั้งหมด</span>
                  <span className="font-semibold">{activityStats?.total_bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">กำลังใช้งาน</span>
                  <span className="font-semibold text-green-600">{activityStats?.active_bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">รอการอนุมัติ</span>
                  <span className="font-semibold text-yellow-600">{activityStats?.pending_bookings}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Guitar className="h-5 w-5 mr-2 text-green-600" />
                การยืมอุปกรณ์
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">ทั้งหมด</span>
                  <span className="font-semibold">{activityStats?.total_loans}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">กำลังยืม</span>
                  <span className="font-semibold text-blue-600">{activityStats?.active_loans}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">เลยกำหนดคืน</span>
                  <span className="font-semibold text-red-600">{activityStats?.overdue_loans}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Wrench className="h-5 w-5 mr-2 text-orange-600" />
                การแจ้งซ่อม
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">ทั้งหมด</span>
                  <span className="font-semibold">{activityStats?.total_maintenance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">รอดำเนินการ</span>
                  <span className="font-semibold text-yellow-600">{activityStats?.pending_maintenance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">กำลังซ่อม</span>
                  <span className="font-semibold text-blue-600">{activityStats?.in_progress_maintenance}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Health & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {systemHealth && <SystemHealthCard health={systemHealth} />}
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">การจัดการด่วน</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/admin/users')}
                className="flex items-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">จัดการผู้ใช้</span>
              </button>
              
              <button
                onClick={() => router.push('/admin/bookings')}
                className="flex items-center space-x-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <Calendar className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">จัดการจองห้อง</span>
              </button>
              
              <button
                onClick={() => router.push('/admin/equipment')}
                className="flex items-center space-x-2 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <Guitar className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">จัดการอุปกรณ์</span>
              </button>
              
              <button
                onClick={() => router.push('/admin/maintenance')}
                className="flex items-center space-x-2 p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <Wrench className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">จัดการซ่อมบำรุง</span>
              </button>
              
              <button
                onClick={() => router.push('/admin/reports')}
                className="flex items-center space-x-2 p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-900">รายงาน</span>
              </button>
              
              <button
                onClick={() => router.push('/admin/settings')}
                className="flex items-center space-x-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">ตั้งค่าระบบ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivityCard activities={recentActivities} />
      </div>
    </div>
  )
}