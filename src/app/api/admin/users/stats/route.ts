import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. เช็ค role ว่าเป็น admin หรือไม่
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 2. ดึงข้อมูลสถิติ
    const { data: allUsers, error: statsError } = await supabaseAdmin
      .from('users')
      .select('role, created_at, updated_at')

    if (statsError || !allUsers) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // 3. คำนวณค่าต่าง ๆ
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const total_users = allUsers.length
    const total_admins = allUsers.filter(u => u.role === 'admin').length
    const total_regular_users = allUsers.filter(u => u.role === 'user').length
    const new_users_this_month = allUsers.filter(u => {
      const createdAt = new Date(u.created_at)
      return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear
    }).length
    const active_users_this_month = allUsers.filter(u => {
      const updatedAt = new Date(u.updated_at)
      return updatedAt.getMonth() === currentMonth && updatedAt.getFullYear() === currentYear
    }).length

    return NextResponse.json({
      total_users,
      total_admins,
      total_regular_users,
      new_users_this_month,
      active_users_this_month
    })

  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
