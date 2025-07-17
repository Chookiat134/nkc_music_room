// src/app/api/users/role/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { currentUser } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clerkId = searchParams.get('clerk_id')

    if (!clerkId || clerkId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ดึง role ของ user จากฐานข้อมูล
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', clerkId)
      .single()

    if (error) {
      // ถ้าไม่เจอ user ให้ return default role
      if (error.code === 'PGRST116') {
        return NextResponse.json({ role: 'user' })
      }
      
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ role: userData.role })

  } catch (error) {
    console.error('Error fetching user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}