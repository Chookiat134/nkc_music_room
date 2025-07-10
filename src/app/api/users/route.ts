// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth, currentUser } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - สร้าง user ใหม่ในฐานข้อมูล
export async function POST(request: NextRequest) {
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
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 })
    }

    // ตรวจสอบว่า user มีอยู่แล้วหรือไม่
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 200 })
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

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}