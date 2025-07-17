// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าเป็น admin
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 })
    }
    const { data: currentUser, error: authError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (authError || !currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // อ่าน query params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || 'all'
    const offset = (page - 1) * limit

    // Filter users
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 })
    }
    let userQuery = supabaseAdmin.from('users').select('*', { count: 'exact' }).order('created_at', { ascending: false })

    if (search) {
      userQuery = userQuery.ilike('name', `%${search}%`) // หรือรวมกับ email
    }
    if (role !== 'all') {
      userQuery = userQuery.eq('role', role)
    }

    userQuery = userQuery.range(offset, offset + limit - 1)

    const { data: users, error: userError, count } = await userQuery
    if (userError || !users) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // ดึงสถิติแยก แล้วรวมเข้าแต่ละ user
    const [bookingsRes, loansRes, maintenanceRes] = await Promise.all([
      supabaseAdmin.from('room_bookings').select('user_id, status'),
      supabaseAdmin.from('equipment_loans').select('user_id, status'),
      supabaseAdmin.from('maintenance_requests').select('user_id, status'),
    ])

    const bookings = bookingsRes.data || []
    const loans = loansRes.data || []
    const maintenance = maintenanceRes.data || []

    const usersWithStats = users.map(user => {
      const userBookings = bookings.filter(b => b.user_id === user.id)
      const userLoans = loans.filter(l => l.user_id === user.id)
      const userMaints = maintenance.filter(m => m.user_id === user.id)

      return {
        ...user,
        total_bookings: userBookings.length,
        active_bookings: userBookings.filter(b => b.status === 'active').length,
        total_loans: userLoans.length,
        active_loans: userLoans.filter(l => l.status === 'borrowed').length,
        total_maintenance_requests: userMaints.length,
        pending_maintenance: userMaints.filter(m => ['pending', 'in_progress'].includes(m.status)).length,
      }
    })

    return NextResponse.json({
      users: usersWithStats,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
