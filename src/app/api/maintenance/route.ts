// src/app/api/maintenance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ตรวจสอบ environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  // console.error('Missing environment variables:')
  // console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing')
  // console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Present' : 'Missing')
  throw new Error('Missing required environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching maintenance requests:', error)
    return NextResponse.json({ error: 'Failed to fetch maintenance requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const clerkId = formData.get('clerk_id') as string
    
    // Log incoming data for debugging
    // console.log('FormData keys:', Array.from(formData.keys()))
    // console.log('Clerk ID:', clerkId)
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Clerk ID is required' }, { status: 400 })
    }
    
    // วิธีที่ 3: ใช้ Clerk REST API โดยตรง
    console.log('Attempting to get user from Clerk with ID:', clerkId)
    
    const clerkSecretKey = process.env.CLERK_SECRET_KEY
    if (!clerkSecretKey) {
      return NextResponse.json({ error: 'Clerk configuration error' }, { status: 500 })
    }
    
    // เรียก Clerk API โดยตรง
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!clerkResponse.ok) {
      console.error('Clerk API error:', clerkResponse.status, clerkResponse.statusText)
      return NextResponse.json({ 
        error: 'Failed to authenticate user',
        details: `Clerk API returned ${clerkResponse.status}`
      }, { status: 401 })
    }
    
    const clerkUser = await clerkResponse.json()
    
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found in authentication service' }, { status: 404 })
    }
    
    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // Handle image upload if present
    let imageUrl = null
    let imageFilename = null
    const image = formData.get('image') as File | null

    // ใน route.ts
if (image) {
  console.log('Processing image:', image.name, 'Size:', image.size);
  
  const fileName = `${Date.now()}-${image.name}`
  
  // ตรวจสอบว่า bucket มีอยู่หรือไม่
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
  
  if (bucketError) {
    console.error('Error checking buckets:', bucketError)
  } else {
    const maintenanceBucket = buckets.find(bucket => bucket.name === 'maintenance-images')
    if (!maintenanceBucket) {
      console.error('Bucket "maintenance-images" not found. Please create it first.')
      // ไม่ throw error ให้ดำเนินการต่อโดยไม่มีรูปภาพ
    } else {
      // Upload image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('maintenance-images')
        .upload(fileName, image)

      if (uploadError) {
        console.error('Upload error:', uploadError)
      } else {
        console.log('Upload successful');
        const { data: publicUrlData } = supabase.storage
          .from('maintenance-images')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrlData.publicUrl
        imageFilename = image.name
        console.log('Image URL set to:', imageUrl);
      }
    }
  }
}

    // Create maintenance request
    const insertData = {
      user_id: user.id,
      user_name: clerkUser.first_name && clerkUser.last_name 
        ? `${clerkUser.first_name} ${clerkUser.last_name}`
        : clerkUser.first_name || clerkUser.email_addresses[0].email_address,
      user_email: clerkUser.email_addresses[0].email_address,
      equipment_id: formData.get('equipment_id') ? parseInt(formData.get('equipment_id') as string) : null,
      equipment_name: formData.get('equipment_name') as string || null,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as string,
      image_url: imageUrl,
      image_filename: imageFilename,
      reported_date: new Date().toISOString().split('T')[0],
      status: 'pending', // เพิ่ม default status
      is_repair_completed: false // เพิ่ม default value
    }
    
    console.log('Insert data with image:', insertData);
    
    const { data, error } = await supabase
      .from('maintenance_requests')
      .insert(insertData)
      .select('*') // เปลี่ยนจาก select() เป็น select('*')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    console.log('Final response data:', data); // เพิ่ม log
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error creating maintenance request:', error)
    return NextResponse.json({ 
      error: 'Failed to create maintenance request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}