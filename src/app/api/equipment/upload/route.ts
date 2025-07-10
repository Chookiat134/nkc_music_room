// src/app/api/equipment/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - อัพโหลดไฟล์หลักฐาน
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'borrow' หรือ 'return'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!type || !['borrow', 'return'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // ตรวจสอบขนาดไฟล์ (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large' }, { status: 400 })
    }

    // สร้างชื่อไฟล์ใหม่
    const timestamp = Date.now()
    const fileName = `${type}_${userId}_${timestamp}_${file.name}`
    const filePath = `equipment-evidence/${fileName}`

    // อัพโหลดไฟล์ไป Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const {  error } = await supabase.storage
      .from('equipment-evidence')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Error uploading file:', error)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // ดึง public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-evidence')
      .getPublicUrl(filePath)

    return NextResponse.json({ 
      url: publicUrl,
      path: filePath 
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}