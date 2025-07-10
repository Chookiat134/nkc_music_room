import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบ role ของผู้ใช้ที่กำลังเรียก API
    const { data: currentUser, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (roleError || !currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { role } = await request.json()
    const userIdToUpdate = parseInt(params.id)

    // ตรวจสอบว่า role ถูกต้องหรือไม่
    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // ตรวจสอบว่าผู้ใช้ที่จะแก้ไขมีจริง
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userIdToUpdate)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // อัปเดต role ของ user
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        role: role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userIdToUpdate)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
    }

    return NextResponse.json({ user: updatedUser })

  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
