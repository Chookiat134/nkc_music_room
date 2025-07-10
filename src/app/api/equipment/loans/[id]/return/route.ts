// src/app/api/equipment/loans/[id]/return/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth, currentUser } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - คืนอุปกรณ์
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const resolvedParams = await params
    const loanId = parseInt(resolvedParams.id)
    const body = await request.json()
    const { notes, return_evidence_url } = body

    // ดึงข้อมูลการยืม
    const { data: loan, error: loanError } = await supabase
      .from('equipment_loans')
      .select('*')
      .eq('id', loanId)
      .single()

    if (loanError || !loan) {
      console.error('Loan not found:', loanError)
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    if (loan.status !== 'borrowed' && loan.status !== 'overdue') {
      return NextResponse.json({ error: 'Loan is not active' }, { status: 400 })
    }

    // ✅ แก้ไข: ตรวจสอบสิทธิ์อย่างถูกต้อง
    const { data: currentUserData } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    const isAdmin = currentUserData?.role === 'admin'
    
    // ✅ แก้ไข: เปรียบเทียบกับ user_clerk_id ใน loan แทนที่จะเป็น user_email
    const isLoanOwner = loan.user_clerk_id === userId

    console.log('Permission check:', {
      userId,
      loanUserId: loan.user_clerk_id,
      isAdmin,
      isLoanOwner,
      userRole: currentUserData?.role
    })

    if (!isAdmin && !isLoanOwner) {
      return NextResponse.json({ 
        error: 'Forbidden - You can only return your own equipment or need admin privileges',
        debug: {
          userId,
          loanUserId: loan.user_clerk_id,
          isAdmin,
          isLoanOwner
        }
      }, { status: 403 })
    }

    // อัพเดทการยืม
    const returnData: {
      status: string
      return_date: string
      returned_by_name: string
      returned_by_email: string
      return_evidence_url: string | null
      updated_at: string
      notes?: string
    } = {
      status: 'returned',
      return_date: new Date().toISOString().split('T')[0],
      returned_by_name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
      returned_by_email: clerkUser.emailAddresses[0]?.emailAddress || '',
      return_evidence_url: return_evidence_url || null,
      updated_at: new Date().toISOString()
    }

    // ✅ แก้ไข: จัดการ notes อย่างปลอดภัย
    if (notes) {
      const existingNotes = loan.notes || ''
      returnData.notes = existingNotes 
        ? `${existingNotes}\n\nการคืน: ${notes}` 
        : `การคืน: ${notes}`
    } else {
      returnData.notes = loan.notes
    }

    const { data: updatedLoan, error: updateLoanError } = await supabase
      .from('equipment_loans')
      .update(returnData)
      .eq('id', loanId)
      .select()
      .single()

    if (updateLoanError) {
      console.error('Error updating loan:', updateLoanError)
      return NextResponse.json({ 
        error: 'Failed to update loan',
        details: updateLoanError.message 
      }, { status: 500 })
    }

    // อัพเดทจำนวนอุปกรณ์ที่ว่าง
    const { data: equipment, error: equipmentFetchError } = await supabase
      .from('equipment')
      .select('available_quantity')
      .eq('id', loan.equipment_id)
      .single()

    if (equipmentFetchError) {
      console.error('Error fetching equipment:', equipmentFetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch equipment data',
        details: equipmentFetchError.message 
      }, { status: 500 })
    }

    if (equipment) {
      const { error: updateEquipmentError } = await supabase
        .from('equipment')
        .update({ 
          available_quantity: equipment.available_quantity + loan.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', loan.equipment_id)

      if (updateEquipmentError) {
        console.error('Error updating equipment quantity:', updateEquipmentError)
        // ✅ ถ้าอัพเดทอุปกรณ์ไม่สำเร็จ ควร rollback การคืน
        await supabase
          .from('equipment_loans')
          .update({ 
            status: loan.status,
            return_date: null,
            returned_by_name: null,
            returned_by_email: null,
            return_evidence_url: null,
            notes: loan.notes,
            updated_at: loan.updated_at
          })
          .eq('id', loanId)
        
        return NextResponse.json({ 
          error: 'Failed to update equipment quantity',
          details: updateEquipmentError.message 
        }, { status: 500 })
      }
    }

    console.log('Equipment returned successfully:', updatedLoan.id)
    return NextResponse.json(updatedLoan)
    
  } catch (error) {
    console.error('POST /api/equipment/loans/[id]/return error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}