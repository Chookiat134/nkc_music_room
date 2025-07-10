// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// ตรวจสอบว่าตัวแปรที่จำเป็นมีค่าหรือไม่
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// สร้าง client สำหรับการใช้งานทั่วไป (ใช้ anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// สร้าง admin client เฉพาะเมื่อมี service role key
export const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// ฟังก์ชันสำหรับตรวจสอบการตั้งค่า
export const checkSupabaseConfig = () => {
  console.log('Supabase Configuration:', {
    url: supabaseUrl ? '✅ Set' : '❌ Missing',
    anonKey: supabaseAnonKey ? '✅ Set' : '❌ Missing',
    serviceRoleKey: serviceRoleKey ? '✅ Set' : '❌ Missing',
  })
  
  return {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceRoleKey: !!serviceRoleKey,
  }
}

// ฟังก์ชันสำหรับใช้งาน admin operations
export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    console.warn('supabaseAdmin is not available. SUPABASE_SERVICE_ROLE_KEY may be missing.')
    return supabase // fallback ใช้ regular client
  }
  return supabaseAdmin
}