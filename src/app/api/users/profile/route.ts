// src/app/api/users/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clerkId = searchParams.get('clerk_id')

    if (!clerkId || clerkId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single()

    if (error) {
      // ถ้าไม่เจอ user ในฐานข้อมูล ให้สร้างใหม่
      if (error.code === 'PGRST116') {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            clerk_id: clerkId,
            email: user.primaryEmailAddress?.emailAddress || '',
            name: user.fullName || 'ผู้ใช้',
            role: 'user'
          })
          .select('*')
          .single()

        if (insertError) {
          console.error('Error creating user:', insertError)
          return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
          )
        }

        // สร้าง response สำหรับ user ใหม่
        const response = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          created_at: newUser.created_at,
          stats: {
            total_bookings: 0,
            active_bookings: 0,
            total_loans: 0,
            active_loans: 0,
            total_maintenance_requests: 0,
            pending_maintenance: 0
          }
        }

        return NextResponse.json(response)
      }

      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // ดึงข้อมูลการจองทั้งหมดของ user นี้
    const { data: bookingData, error: bookingError } = await supabase
      .from('room_bookings')
      .select('*')
      .eq('user_id', userData.id)

    if (bookingError) {
      console.error('Error fetching bookings:', bookingError)
    }

    // กรองการจองที่ยังใช้งานจริงๆ (ยังไม่หมดเวลา)
    const now = new Date()
    const activeBookings = bookingData?.filter(booking => {
      if (booking.status !== 'active') return false
      
      // สร้าง Date object สำหรับเวลาสิ้นสุดการจอง
      const bookingEndDateTime = new Date(`${booking.booking_date} ${booking.end_time}`)
      
      // ถ้าเวลาสิ้นสุดยังไม่ผ่านไป ถือว่ายังใช้งานอยู่
      return bookingEndDateTime > now
    }) || []

    // *** แก้ไขส่วนนี้ - ใช้ user_clerk_id แทน user_id ***
    const [loanStats, maintenanceStats] = await Promise.all([
      // สถิติการยืมอุปกรณ์ - เปลี่ยนจาก user_id เป็น user_clerk_id
      supabase
        .from('equipment_loans')
        .select('status')
        .eq('user_clerk_id', clerkId), // ใช้ clerkId แทน userData.id
      
      // สถิติการแจ้งซ่อม - เปลี่ยนจาก user_id เป็น user_clerk_id (ถ้ามี)
      supabase
        .from('maintenance_requests')
        .select('status')
        .eq('user_id', userData.id) // หรือ .eq('user_id', userData.id) ขึ้นอยู่กับโครงสร้างตาราง
    ])

    // Debug: ดูข้อมูลที่ได้
    // console.log('User Clerk ID:', clerkId)
    // console.log('User DB ID:', userData.id)
    // console.log('Total Bookings:', bookingData?.length || 0)
    // console.log('Active Bookings (not expired):', activeBookings.length)
    // console.log('Loan Stats:', loanStats)
    // console.log('Maintenance Stats:', maintenanceStats)

    // คำนวณสถิติ
    const totalBookings = bookingData?.length || 0
    const activeBookingsCount = activeBookings.length
    
    const totalLoans = loanStats.data?.length || 0
    const activeLoans = loanStats.data?.filter(l => l.status === 'borrowed').length || 0
    
    const totalMaintenanceRequests = maintenanceStats.data?.length || 0
    const pendingMaintenance = maintenanceStats.data?.filter(m => m.status === 'pending').length || 0

    const response = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      created_at: userData.created_at,
      stats: {
        total_bookings: totalBookings,
        active_bookings: activeBookingsCount,
        total_loans: totalLoans,
        active_loans: activeLoans,
        total_maintenance_requests: totalMaintenanceRequests,
        pending_maintenance: pendingMaintenance
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}