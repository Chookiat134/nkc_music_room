// src/app/api/maintenance/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ตรวจสอบ environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🔧 FIX: Await params before using
    const params = await context.params
    const requestId = parseInt(params.id)
    
    // Validate ID
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const requestData = await request.json()

    // 🚀 OPTIMIZATION: Build update data with proper typing
    const updateData: {
      status: string;
      admin_notes: string;
      handled_by_name: string;
      handled_by_email: string;
      is_repair_completed: boolean;
      updated_at: string;
      repair_cost?: number;
      repair_notes?: string;
      started_date?: string;
      completed_date?: string;
    } = {
      status: requestData.status,
      admin_notes: requestData.admin_notes,
      handled_by_name: requestData.handled_by_name,
      handled_by_email: requestData.handled_by_email,
      is_repair_completed: requestData.is_repair_completed,
      updated_at: new Date().toISOString(),
    }

    // Add optional fields with proper typing
    if (requestData.repair_cost) {
      updateData.repair_cost = parseFloat(requestData.repair_cost)
    }

    if (requestData.repair_notes) {
      updateData.repair_notes = requestData.repair_notes
    }

    if (requestData.started_date) {
      updateData.started_date = requestData.started_date
    }

    if (requestData.completed_date) {
      updateData.completed_date = requestData.completed_date
    }

    // 🚀 OPTIMIZATION: Use single query with better error handling
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json(
        { error: 'Failed to update maintenance request', details: error.message }, 
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating maintenance request:', error)
    return NextResponse.json(
      { error: 'Failed to update maintenance request' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 🔧 FIX: Await params before using
    const params = await context.params
    const requestId = parseInt(params.id)
    
    // Validate ID
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    // 🚀 OPTIMIZATION: Combine operations in transaction-like approach
    const { data: maintenanceRequest, error: fetchError } = await supabase
      .from('maintenance_requests')
      .select('image_url')
      .eq('id', requestId)
      .single()

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Maintenance request not found' }, 
        { status: 404 }
      )
    }

    // Delete operations in parallel where possible
    const deletePromises = []

    // Delete image from storage if exists
    if (maintenanceRequest.image_url) {
      const fileName = maintenanceRequest.image_url.split('/').pop()
      if (fileName) {
        deletePromises.push(
          supabase.storage
            .from('maintenance-images')
            .remove([fileName])
        )
      }
    }

    // Delete the maintenance request
    deletePromises.push(
      supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', requestId)
    )

    // 🚀 OPTIMIZATION: Run deletions in parallel
    const results = await Promise.allSettled(deletePromises)
    
    // Check if database deletion succeeded (most important)
    const dbDeletionResult = results[results.length - 1]
    if (dbDeletionResult.status === 'rejected') {
      console.error('Database deletion failed:', dbDeletionResult.reason)
      return NextResponse.json(
        { error: 'Failed to delete maintenance request' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Maintenance request deleted successfully' })
  } catch (error) {
    console.error('Error deleting maintenance request:', error)
    return NextResponse.json(
      { error: 'Failed to delete maintenance request' }, 
      { status: 500 }
    )
  }
}