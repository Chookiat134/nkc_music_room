// src/app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - ดึงรายการจองห้องทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('room_bookings')
      .select('*')
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Filter by date if provided
    if (date) {
      query = query.eq('booking_date', date)
    }

    // Filter by user if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - สร้างการจองใหม่
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { booking_date, start_time, end_time, purpose, user_name, user_email } = body

    // Validation
    if (!booking_date || !start_time || !end_time || !user_name || !user_email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if end_time is after start_time
    if (start_time >= end_time) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    // Check if date is not in the past
    const bookingDate = new Date(booking_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (bookingDate < today) {
      return NextResponse.json({ error: 'Cannot book for past dates' }, { status: 400 })
    }

    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for overlapping bookings
    const { data: existingBookings, error: checkError } = await supabase
      .from('room_bookings')
      .select('*')
      .eq('booking_date', booking_date)
      .eq('status', 'active')
      .or(`and(start_time.lte.${start_time},end_time.gt.${start_time}),and(start_time.lt.${end_time},end_time.gte.${end_time}),and(start_time.gte.${start_time},end_time.lte.${end_time})`)

    if (checkError) {
      console.error('Error checking existing bookings:', checkError)
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json({ 
        error: 'Time slot is already booked',
        details: existingBookings 
      }, { status: 409 })
    }

    // Create booking
    const { data: booking, error: insertError } = await supabase
      .from('room_bookings')
      .insert({
        user_id: userData.id,
        user_name,
        user_email,
        booking_date,
        start_time,
        end_time,
        purpose: purpose || null,
        status: 'active'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating booking:', insertError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Booking created successfully', 
      booking 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - อัปเดตการจอง (ยกเลิกหรือเปลี่ยนสถานะ)
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { booking_id, status, ...updateData } = body

    if (!booking_id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get booking to check ownership
    const { data: existingBooking, error: fetchError } = await supabase
      .from('room_bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if user can modify this booking (owner or admin)
    if (existingBooking.user_id !== userData.id && userData.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized to modify this booking' }, { status: 403 })
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('room_bookings')
      .update({
        status: status || existingBooking.status,
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Booking updated successfully', 
      booking: updatedBooking 
    })

  } catch (error) {
    console.error('Error in PUT /api/bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - ลบการจอง
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('id')

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get booking to check ownership
    const { data: existingBooking, error: fetchError } = await supabase
      .from('room_bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if user can delete this booking (owner or admin)
    if (existingBooking.user_id !== userData.id && userData.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized to delete this booking' }, { status: 403 })
    }

    // Delete booking
    const { error: deleteError } = await supabase
      .from('room_bookings')
      .delete()
      .eq('id', bookingId)

    if (deleteError) {
      console.error('Error deleting booking:', deleteError)
      return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Booking deleted successfully' })

  } catch (error) {
    console.error('Error in DELETE /api/bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}