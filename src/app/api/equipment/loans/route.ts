//src/app/api/equipment/loans/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - ดึงข้อมูลการยืมทั้งหมด
export async function GET() {
  console.log('GET /api/equipment/loans')
  
  try {
    // ดึงข้อมูลการยืมพร้อมข้อมูลอุปกรณ์และผู้ใช้
    const { data: loans, error } = await supabase
      .from('equipment_loans')
      .select(`
        id,
        equipment_id,
        user_clerk_id,
        quantity,
        loan_date,
        return_date,
        expected_return_date,
        status,
        notes,
        returned_by_name,
        returned_by_email,
        borrow_evidence_url,
        return_evidence_url,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching loans:', error)
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
    }

    // ถ้าไม่มีข้อมูลการยืม ให้คืนค่า array ว่าง
    if (!loans || loans.length === 0) {
      return NextResponse.json([])
    }

    // ดึงข้อมูลอุปกรณ์และผู้ใช้แยกต่างหาก
    const equipmentIds = [...new Set(loans.map(loan => loan.equipment_id))]
    const userClerkIds = [...new Set(loans.map(loan => loan.user_clerk_id))]

    // ดึงข้อมูลอุปกรณ์
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, name, description')
      .in('id', equipmentIds)

    if (equipmentError) {
      console.error('Error fetching equipment:', equipmentError)
    }

    // ดึงข้อมูลผู้ใช้
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('clerk_id, name, email')
      .in('clerk_id', userClerkIds)

    if (usersError) {
      console.error('Error fetching users:', usersError)
    }

    // สร้าง maps สำหรับ lookup
    const equipmentMap = new Map(equipmentData?.map(eq => [eq.id, eq]) || [])
    const usersMap = new Map(usersData?.map(user => [user.clerk_id, user]) || [])

    // Transform data สำหรับ frontend
    const transformedLoans = loans.map(loan => {
      const equipment = equipmentMap.get(loan.equipment_id)
      const user = usersMap.get(loan.user_clerk_id)
      
      return {
        id: loan.id,
        user_id: loan.user_clerk_id,
        user_name: user?.name || 'Unknown User',
        user_email: user?.email || 'Unknown Email',
        equipment_id: loan.equipment_id,
        equipment_name: equipment?.name || 'Unknown Equipment',
        quantity: loan.quantity,
        loan_date: loan.loan_date,
        return_date: loan.return_date,
        expected_return_date: loan.expected_return_date,
        status: loan.status,
        notes: loan.notes || '',
        returned_by_name: loan.returned_by_name,
        returned_by_email: loan.returned_by_email,
        borrow_evidence_url: loan.borrow_evidence_url,
        return_evidence_url: loan.return_evidence_url,
        created_at: loan.created_at,
        updated_at: loan.updated_at
      }
    })

    console.log(`Successfully fetched ${transformedLoans.length} loans`)
    return NextResponse.json(transformedLoans)

  } catch (error) {
    console.error('GET /api/equipment/loans error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - สร้างการยืมใหม่
export async function POST(request: NextRequest) {
  console.log('POST /api/equipment/loans')
  
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      equipment_id, 
      quantity, 
      expected_return_date, 
      notes, 
      borrow_evidence_url 
    } = body

    // Validate required fields
    if (!equipment_id || !quantity || !expected_return_date) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        received: { equipment_id, quantity, expected_return_date }
      }, { status: 400 })
    }

    // ตรวจสอบว่าอุปกรณ์มีเพียงพอหรือไม่
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('available_quantity, name')
      .eq('id', equipment_id)
      .single()

    if (equipmentError || !equipment) {
      console.error('Equipment not found:', equipmentError)
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    if (equipment.available_quantity < quantity) {
      return NextResponse.json({ 
        error: 'Not enough equipment available',
        available: equipment.available_quantity,
        requested: quantity
      }, { status: 400 })
    }

    // สร้างการยืม
    const loanData = {
      equipment_id: parseInt(equipment_id),
      user_clerk_id: userId,
      quantity: parseInt(quantity),
      loan_date: new Date().toISOString().split('T')[0],
      expected_return_date,
      notes: notes || null,
      borrow_evidence_url: borrow_evidence_url || null,
      status: 'borrowed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: loan, error: loanError } = await supabase
      .from('equipment_loans')
      .insert(loanData)
      .select()
      .single()

    if (loanError) {
      console.error('Error creating loan:', loanError)
      return NextResponse.json({ 
        error: 'Failed to create loan',
        details: loanError.message 
      }, { status: 500 })
    }

    // อัพเดทจำนวนอุปกรณ์ที่เหลือ
    const { error: updateError } = await supabase
      .from('equipment')
      .update({ 
        available_quantity: equipment.available_quantity - quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', equipment_id)

    if (updateError) {
      console.error('Error updating equipment quantity:', updateError)
      // Rollback loan if equipment update fails
      await supabase.from('equipment_loans').delete().eq('id', loan.id)
      return NextResponse.json({ 
        error: 'Failed to update equipment quantity',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('Loan created successfully:', loan.id)
    return NextResponse.json(loan, { status: 201 })

  } catch (error) {
    console.error('POST /api/equipment/loans error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

