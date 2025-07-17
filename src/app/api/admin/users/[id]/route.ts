// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection error' }, { status: 500 })
    }

    // Await the params promise
    const params = await context.params

    // ✅ ตรวจสอบ role ของ user (จาก clerk_id)
    const { data: currentUser, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (roleError || !currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const userIdToDelete = parseInt(params.id)

    // ✅ ตรวจสอบว่าผู้ใช้ที่จะลบมีจริง
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('clerk_id')
      .eq('id', userIdToDelete)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ❌ ป้องกัน admin ลบตัวเอง
    if (targetUser.clerk_id === userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    // ✅ ลบผู้ใช้
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userIdToDelete)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}