// src/app/api/users/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth, currentUser } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - สร้าง user ใหม่ในฐานข้อมูล
export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'ผู้ใช้'

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 })
    }

    // ตรวจสอบว่า user มีอยู่แล้วหรือไม่
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('clerk_id', userId)
      .single()

    if (existingUser) {
      // ถ้ามี user แล้ว ให้อัพเดทข้อมูล (ในกรณีที่มีการเปลี่ยนแปลง)
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          email,
          name,
          updated_at: new Date().toISOString()
        })
        .eq('clerk_id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user:', updateError)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'User updated successfully', 
        user: updatedUser 
      }, { status: 200 })
    }

    // สร้าง user ใหม่
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        clerk_id: userId,
        email,
        name,
        role: 'user' // default role
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'User created successfully', 
      user: newUser 
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}