// src/app/api/equipment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - ดึงข้อมูลอุปกรณ์ทั้งหมด (เพิ่มความเร็วแต่ไม่เปลี่ยน format)
export async function GET() {
  try {
    const { data: equipment, error } = await supabase
      .from('equipment')
      .select(`
        id,
        name,
        description,
        quantity,
        available_quantity,
        condition,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching equipment:', error)
      return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 })
    }

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - เพิ่มอุปกรณ์ใหม่ (เฉพาะ admin)
export async function POST(request: NextRequest) {
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

    if (!name || !description || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: equipment, error } = await supabase
      .from('equipment')
      .insert({
        name,
        description,
        quantity: parseInt(quantity),
        available_quantity: parseInt(quantity),
        condition
      })
      .select(`
        id,
        name,
        description,
        quantity,
        available_quantity,
        condition,
        created_at
      `)
      .single()

    if (error) {
      console.error('Error creating equipment:', error)
      return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 })
    }

    return NextResponse.json(equipment, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}