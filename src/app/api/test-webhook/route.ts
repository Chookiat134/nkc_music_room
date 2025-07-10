// src/app/api/test-webhook/route.ts
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // ทดสอบการเชื่อมต่อ Supabase
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Supabase connection error:', error)
      return Response.json({ error: 'Database connection failed' }, { status: 500 })
    }

    return Response.json({ 
      message: 'Supabase connection successful',
      data: data
    })
  } catch (error) {
    console.error('Test error:', error)
    return Response.json({ error: 'Test failed' }, { status: 500 })
  }
}