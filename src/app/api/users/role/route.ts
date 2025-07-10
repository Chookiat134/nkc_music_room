import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - ดึง role ของ user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clerkId = searchParams.get('clerk_id')

    if (!clerkId) {
      return NextResponse.json({ error: 'Missing clerk_id' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', clerkId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ role: user.role })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}