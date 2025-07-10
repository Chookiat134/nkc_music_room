// src/app/api/test-user/route.ts
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        clerk_id: 'test_' + Date.now(),
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      })
      .select()

    if (error) {
      console.error('Insert error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ 
      message: 'User created successfully',
      data: data
    })
  } catch (error) {
    console.error('Test error:', error)
    return Response.json({ error: 'Test failed' }, { status: 500 })
  }
}