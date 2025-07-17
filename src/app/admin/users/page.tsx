// src/app/admin/users/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { 
  Users, 
  Search,  
  Edit, 
  Trash2, 
  Shield, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  User as UserIcon
} from 'lucide-react'

interface UserStats {
  total_bookings: number
  active_bookings: number
  total_loans: number
  active_loans: number
  total_maintenance_requests: number
  pending_maintenance: number
}

interface User {
  id: number
  clerk_id: string
  name: string
  email: string
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
  total_bookings: number
  active_bookings: number
  total_loans: number
  active_loans: number
  total_maintenance_requests: number
  pending_maintenance: number
  stats: UserStats
  image_url?: string // เพิ่มฟิลด์สำหรับรูปโปรไฟล์
}

interface AdminStats {
  total_users: number
  total_admins: number
  total_regular_users: number
  new_users_this_month: number
  active_users_this_month: number
  stats: UserStats
}

// Component สำหรับสร้าง Avatar จากชื่อ
const AvatarFromName = ({ name, size = 40 }: { name: string; size?: number }) => {
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
      className={`${getColorFromName(name)} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </div>
  )
}

// Component สำหรับรูปโปรไฟล์ของผู้ใช้ในตาราง
const UserAvatar = ({ user, size = 40 }: { user: User; size?: number }) => {
  // ถ้ามีรูปจากฐานข้อมูล ให้ใช้
  if (user.image_url) {
    return (
      <img
        src={user.image_url}
        alt="Profile"
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  // ถ้าไม่มีรูป ให้สร้าง Avatar จากชื่อ
  if (user.name) {
    return <AvatarFromName name={user.name} size={size} />
  }

  // ถ้าไม่มีชื่อ ให้สร้างจาก email
  if (user.email) {
    const emailName = user.email.split('@')[0]
    return <AvatarFromName name={emailName} size={size} />
  }

  // สุดท้ายถ้าไม่มีอะไรเลย ให้ใช้ไอคอน User
  return (
    <div 
      className="bg-gray-100 rounded-full flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <UserIcon className="text-gray-400" style={{ width: size * 0.6, height: size * 0.6 }} />
    </div>
  )
}

export default function AdminUsersPage() {
  const { user: currentUser, isLoaded } = useUser()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [userToChangeRole, setUserToChangeRole] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user')

  const limit = 10

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: searchTerm,
        role: roleFilter
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users)
      setTotalUsers(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete user')
      
      setUsers(users.filter(u => u.id !== userToDelete.id))
      setShowDeleteModal(false)
      setUserToDelete(null)
      fetchStats() // Refresh stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบผู้ใช้')
    }
  }

  // Change user role
  const handleChangeRole = async () => {
    if (!userToChangeRole) return

    try {
      const response = await fetch(`/api/admin/users/${userToChangeRole.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
      
      if (!response.ok) throw new Error('Failed to change role')
      
      setUsers(users.map(u => 
        u.id === userToChangeRole.id ? { ...u, role: newRole } : u
      ))
      setShowRoleModal(false)
      setUserToChangeRole(null)
      fetchStats() // Refresh stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนบทบาท')
    }
  }

  useEffect(() => {
    if (isLoaded && currentUser) {
      fetchUsers()
      fetchStats()
    }
  }, [currentUser, isLoaded, currentPage, searchTerm, roleFilter])

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1)
    fetchUsers()
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">จัดการผู้ใช้</h1>
          <p className="text-gray-600">จัดการผู้ใช้ในระบบ และดูสถิติการใช้งาน</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">ผู้ใช้ทั้งหมด</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_users}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">ผู้ดูแล</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_admins}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">ผู้ใช้ทั่วไป</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_regular_users}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">สมาชิกใหม่เดือนนี้</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.new_users_this_month}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">ผู้ใช้ที่ใช้งานเดือนนี้</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.active_users_this_month}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาผู้ใช้..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">ทุกบทบาท</option>
                <option value="admin">ผู้ดูแล</option>
                <option value="user">ผู้ใช้ทั่วไป</option>
              </select>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ค้นหา
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้ใช้
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    บทบาท
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่สมัคร
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserAvatar user={user} size={40} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'admin' ? 'ผู้ดูแล' : 'ผู้ใช้ทั่วไป'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setUserToChangeRole(user)
                            setNewRole(user.role === 'admin' ? 'user' : 'admin')
                            setShowRoleModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.clerk_id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              setUserToDelete(user)
                              setShowDeleteModal(true)
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                แสดง {((currentPage - 1) * limit) + 1} ถึง {Math.min(currentPage * limit, totalUsers)} จาก {totalUsers} ผู้ใช้
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-lg">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ยืนยันการลบผู้ใช้
              </h3>
              <p className="text-gray-600 mb-6">
                คุณต้องการลบผู้ใช้ &quot;{userToDelete.name}&quot; ใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setUserToDelete(null)
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  ลบผู้ใช้
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Change Modal */}
        {showRoleModal && userToChangeRole && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                เปลี่ยนบทบาทผู้ใช้
              </h3>
              <p className="text-gray-600 mb-4">
                เปลี่ยนบทบาทของ &quot;{userToChangeRole.name}&quot; จาก{' '}
                <span className="font-medium">
                  {userToChangeRole.role === 'admin' ? 'ผู้ดูแล' : 'ผู้ใช้ทั่วไป'}
                </span>{' '}
                เป็น{' '}
                <span className="font-medium">
                  {newRole === 'admin' ? 'ผู้ดูแล' : 'ผู้ใช้ทั่วไป'}
                </span>
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false)
                    setUserToChangeRole(null)
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleChangeRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  เปลี่ยนบทบาท
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}