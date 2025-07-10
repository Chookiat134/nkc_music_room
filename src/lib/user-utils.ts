// lib/user-utils.ts
import { supabaseAdmin } from '@/lib/supabase'
import { currentUser } from '@clerk/nextjs/server'

export interface User {
  id: number
  clerk_id: string
  email: string
  name: string
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}

export async function getOrCreateUser(clerkId: string): Promise<User | null> {
  try {
    // ลองหา user ใน database ก่อน
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is null')
      return null
    }
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single()

    // ถ้าเจอแล้ว return เลย
    if (existingUser && !fetchError) {
      return existingUser
    }

    // ถ้าไม่เจอ (PGRST116) ให้สร้างใหม่
    if (fetchError && fetchError.code === 'PGRST116') {
      console.log(`Creating new user for clerk_id: ${clerkId}`)
      
      // ดึงข้อมูลจาก Clerk
      const clerkUser = await currentUser()
      
      if (!clerkUser || clerkUser.id !== clerkId) {
        console.error('Clerk user not found or ID mismatch')
        return null
      }

      // หา primary email
      const primaryEmail = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      )

      if (!primaryEmail) {
        console.error('No primary email found')
        return null
      }

      // สร้าง user ใหม่
      const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
      const userName = fullName || primaryEmail.emailAddress.split('@')[0] || 'User'

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          clerk_id: clerkId,
          email: primaryEmail.emailAddress,
          name: userName,
          role: 'user'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return null
      }

      console.log('User created successfully:', newUser)
      return newUser
    }

    // Error อื่นๆ
    console.error('Database error:', fetchError)
    return null

  } catch (error) {
    console.error('Error in getOrCreateUser:', error)
    return null
  }
}

export async function getUserRole(clerkId: string): Promise<'admin' | 'user' | null> {
  try {
    const user = await getOrCreateUser(clerkId)
    return user ? user.role : null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

export async function getCurrentUserFromDB(): Promise<User | null> {
  try {
    const clerkUser = await currentUser()
    
    if (!clerkUser) {
      return null
    }

    return await getOrCreateUser(clerkUser.id)
  } catch (error) {
    console.error('Error getting current user from DB:', error)
    return null
  }
}