// src/app/api/upload-evidence/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

// สร้าง client แค่ครั้งเดียว (singleton pattern)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ authentication แบบไม่รอนาน
    const authPromise = auth()
    
    // อ่าน formData พร้อมกัน
    const formDataPromise = request.formData()
    
    // รอทั้งสองอย่างพร้อมกัน
    const [{ userId }, formData] = await Promise.all([authPromise, formDataPromise])
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'equipment-evidence'
    const userIdFromForm = formData.get('userId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // ตรวจสอบขนาดไฟล์
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File size too large. Maximum size is ${maxSize / 1024 / 1024}MB` 
      }, { status: 400 })
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      }, { status: 400 })
    }

    // สร้างชื่อไฟล์ที่ไม่ซ้ำ (เร็วขึ้น)
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8) // สั้นลง
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`
    
    const filePath = `${folder}/${userIdFromForm}/${fileName}`

    // แปลงไฟล์เป็น buffer แบบ stream (เร็วกว่า arrayBuffer)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    
    // อัปโหลดไฟล์พร้อมกับสร้าง public URL
    const uploadPromise = supabase.storage
      .from('evidence')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '31536000', // 1 year
        upsert: false
      })

    const { error } = await uploadPromise

    if (error) {
      console.error('Supabase storage error:', error)
      return NextResponse.json({ 
        error: `Storage upload failed: ${error.message}` 
      }, { status: 500 })
    }

    // ดึง public URL (ไม่ต้องรอ เพราะ Supabase จะสร้างให้ทันที)
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${filePath}`

    return NextResponse.json({ publicUrl })

  } catch (error) {
    console.error('Error in upload API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}