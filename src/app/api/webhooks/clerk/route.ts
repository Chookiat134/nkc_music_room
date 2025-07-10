// src/app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('WEBHOOK_SECRET not found in environment variables')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  try {
    // Get headers and verify webhook
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing svix headers')
      return new Response('Missing webhook headers', { status: 400 })
    }

    const payload = await req.text()
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: WebhookEvent

    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response('Webhook verification failed', { status: 400 })
    }

    const { id } = evt.data
    const eventType = evt.type

    console.log(`Processing webhook: ${eventType} for user: ${id}`)

    switch (eventType) {
      case 'user.created': {
        const { email_addresses, first_name, last_name } = evt.data
        
        const primaryEmail = email_addresses.find(email => 
          email.id === evt.data.primary_email_address_id
        )
        
        if (!primaryEmail) {
          console.error('No primary email found for user:', id)
          return new Response('No primary email found', { status: 400 })
        }

        const fullName = `${first_name || ''} ${last_name || ''}`.trim()
        const userName = fullName || primaryEmail.email_address.split('@')[0] || 'User'

        // ใช้ database function
        if (!supabaseAdmin) {
          console.error('supabaseAdmin is not initialized')
          return new Response('Database connection not available', { status: 500 })
        }

        const { data, error } = await supabaseAdmin
          .rpc('create_user_from_clerk', {
            p_clerk_id: id,
            p_email: primaryEmail.email_address,
            p_name: userName
          })

        if (error) {
          console.error('Error calling create_user_from_clerk:', error)
          // ลองใช้ regular insert แทน
          const { error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
              clerk_id: id,
              email: primaryEmail.email_address,
              name: userName,
              role: 'user'
            })

          if (insertError && insertError.code !== '23505') {
            console.error('Error inserting user:', insertError)
            return new Response('Error creating user', { status: 500 })
          }
        }

        console.log('User created successfully:', {
          clerk_id: id,
          email: primaryEmail.email_address,
          name: userName,
          result: data
        })
        break
      }

      case 'user.updated': {
        const { email_addresses, first_name, last_name } = evt.data
        
        const primaryEmail = email_addresses.find(email => 
          email.id === evt.data.primary_email_address_id
        )
        
        if (!primaryEmail) {
          console.error('No primary email found for user:', id)
          return new Response('No primary email found', { status: 400 })
        }

        const fullName = `${first_name || ''} ${last_name || ''}`.trim()
        const userName = fullName || primaryEmail.email_address.split('@')[0] || 'User'

        // ใช้ database function หรือ regular update
        if (!supabaseAdmin) {
          console.error('supabaseAdmin is not initialized')
          return new Response('Database connection not available', { status: 500 })
        }
        const { data, error } = await supabaseAdmin
          .rpc('update_user_from_clerk', {
            p_clerk_id: id,
            p_email: primaryEmail.email_address,
            p_name: userName
          })

        if (error) {
          console.error('Error calling update_user_from_clerk:', error)
          // ลองใช้ regular update แทน
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              email: primaryEmail.email_address,
              name: userName,
              updated_at: new Date().toISOString()
            })
            .eq('clerk_id', id)

          if (updateError) {
            console.error('Error updating user:', updateError)
            return new Response('Error updating user', { status: 500 })
          }
        }

        console.log('User updated successfully:', {
          clerk_id: id,
          email: primaryEmail.email_address,
          name: userName,
          result: data
        })
        break
      }

      case 'user.deleted': {
        // ใช้ database function หรือ regular delete
        if (!supabaseAdmin) {
          console.error('supabaseAdmin is not initialized')
          return new Response('Database connection not available', { status: 500 })
        }
        const { data, error } = await supabaseAdmin
          .rpc('delete_user_from_clerk', {
            p_clerk_id: id
          })

        if (error) {
          console.error('Error calling delete_user_from_clerk:', error)
          // ลองใช้ regular delete แทน
          const { error: deleteError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('clerk_id', id)

          if (deleteError) {
            console.error('Error deleting user:', deleteError)
            return new Response('Error deleting user', { status: 500 })
          }
        }

        console.log('User deleted successfully:', {
          clerk_id: id,
          result: data
        })
        break
      }

      default:
        console.log('Unhandled webhook event type:', eventType)
    }

    return new Response('Webhook processed successfully', { status: 200 })

  } catch (error) {
    console.error('Unexpected error processing webhook:', error)
    return new Response('Internal server error', { status: 500 })
  }
}