//
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT - แก้ไขอุปกรณ์ (เฉพาะ admin)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าเป็น admin หรือไม่
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, quantity, condition } = body
    const params = await context.params
    const equipmentId = parseInt(params.id)

    if (!name || !description || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ดึงข้อมูลอุปกรณ์เดิม
    const { data: oldEquipment } = await supabase
      .from('equipment')
      .select('quantity, available_quantity')
      .eq('id', equipmentId)
      .single()

    if (!oldEquipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // คำนวณ available_quantity ใหม่
    const borrowed = oldEquipment.quantity - oldEquipment.available_quantity
    const newAvailableQuantity = Math.max(0, parseInt(quantity) - borrowed)

    const { data: equipment, error } = await supabase
      .from('equipment')
      .update({
        name,
        description,
        quantity: parseInt(quantity),
        available_quantity: newAvailableQuantity,
        condition,
        updated_at: new Date().toISOString()
      })
      .eq('id', equipmentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating equipment:', error)
      return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 })
    }

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - ลบอุปกรณ์ (เฉพาะ admin)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ตรวจสอบว่าเป็น admin หรือไม่
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const params = await context.params
    const equipmentId = parseInt(params.id)

    // ตรวจสอบว่ามีการยืมอยู่หรือไม่
    const { data: activeLoans } = await supabase
      .from('equipment_loans')
      .select('id')
      .eq('equipment_id', equipmentId)
      .eq('status', 'borrowed')

    if (activeLoans && activeLoans.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete equipment with active loans' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', equipmentId)

    if (error) {
      console.error('Error deleting equipment:', error)
      return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Equipment deleted successfully' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}