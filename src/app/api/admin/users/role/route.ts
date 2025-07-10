import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'  // ใช้ Supabase Admin Client

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clerkId = searchParams.get('clerk_id') || userId

    // ใช้ Supabase แทน pool.query
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', clerkId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ role: data.role })

  } catch (error) {
    console.error('Error fetching user role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
