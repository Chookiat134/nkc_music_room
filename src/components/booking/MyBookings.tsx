// src/components/booking/MyBookings.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Calendar, Clock, User, AlertCircle, Trash2,  CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Booking {
  id: number
  user_name: string
  user_email: string
  booking_date: string
  start_time: string
  end_time: string
  purpose: string
  status: 'active' | 'cancelled' | 'completed'
  created_at: string
}

interface MyBookingsProps {
  userId?: string
}

export function MyBookings({ userId }: MyBookingsProps) {
  const { user } = useUser()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (user) {
      fetchMyBookings()
    }
  }, [user])

// เพิ่มฟังก์ชันนี้ใน MyBookings component
const updateExpiredBookings = () => {
  const now = new Date()
  
  setBookings(prevBookings => 
    prevBookings.map(booking => {
      if (booking.status === 'active') {
        const bookingEndDateTime = new Date(`${booking.booking_date} ${booking.end_time}`)
        
        // If booking end time has passed, mark as completed
        if (bookingEndDateTime < now) {
          return { ...booking, status: 'completed' as const }
        }
      }
      return booking
    })
  )
}

// เพิ่ม useEffect สำหรับเช็คทุก ๆ นาที
useEffect(() => {
  if (bookings.length > 0) {
    updateExpiredBookings()
    
    // Set interval to check every minute
    const interval = setInterval(updateExpiredBookings, 60000)
    return () => clearInterval(interval)
  }
}, [bookings.length])

  const fetchMyBookings = async () => {
  setLoading(true)
  try {
    const url = userId 
      ? `/api/bookings?user_id=${userId}`
      : `/api/bookings`
    
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      const filteredData = userId ? data : data.filter((booking: Booking) => 
        booking.user_email === user?.emailAddresses[0]?.emailAddress
      )
      
      // Update expired bookings before setting state
      const now = new Date()
      const updatedData = filteredData.map((booking: Booking) => {
        if (booking.status === 'active') {
          const bookingEndDateTime = new Date(`${booking.booking_date} ${booking.end_time}`)
          if (bookingEndDateTime < now) {
            return { ...booking, status: 'completed' as const }
          }
        }
        return booking
      })
      
      setBookings(updatedData)
    }
  } catch (error) {
    console.error('Error fetching bookings:', error)
    setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการโหลดข้อมูล' })
  } finally {
    setLoading(false)
  }
}

  const handleCancelBooking = async (bookingId: number) => {
  try {
    const response = await fetch('/api/bookings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        booking_id: bookingId,
        status: 'cancelled'
      }),
    })

    const result = await response.json()

    if (response.ok) {
      setMessage({ type: 'success', text: 'ยกเลิกการจองสำเร็จ' })
      
      // Update bookings state immediately without refetching
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'cancelled' as const }
            : booking
        )
      )
    } else {
      setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาด' })
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์' })
  }
}

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">ใช้งาน</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">ยกเลิก</Badge>
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">เสร็จสิ้น</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const canCancelBooking = (booking: Booking) => {
    if (booking.status !== 'active') return false
    
    const bookingDateTime = new Date(`${booking.booking_date} ${booking.start_time}`)
    const now = new Date()
    
    // Can cancel if booking is at least 1 hour in the future
    return bookingDateTime.getTime() > now.getTime() + (60 * 60 * 1000)
  }

  if (loading) {
    return <div className="text-center p-4">กำลังโหลด...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">การจองของฉัน</h2>
        <Button onClick={fetchMyBookings} variant="outline" size="sm">
          รีเฟรช
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>ยังไม่มีการจองห้อง</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings
            .sort((a, b) => {
              // Sort by date and time (newest first)
              const dateA = new Date(`${a.booking_date} ${a.start_time}`)
              const dateB = new Date(`${b.booking_date} ${b.start_time}`)
              return dateB.getTime() - dateA.getTime()
            })
            .map((booking) => (
              <Card key={booking.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{booking.user_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(booking.status)}
                      {canCancelBooking(booking) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4 mr-1" />
                              ยกเลิก
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
                              <AlertDialogDescription>
                                คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleCancelBooking(booking.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                ยืนยันยกเลิก
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        {new Date(booking.booking_date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{booking.start_time} - {booking.end_time}</span>
                    </div>

                    <div className="text-gray-500 text-xs">
                      จองเมื่อ: {new Date(booking.created_at).toLocaleDateString('th-TH')}
                    </div>
                  </div>

                  {booking.purpose && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium text-gray-700">วัตถุประสงค์:</span>
                      <p className="text-sm text-gray-600 mt-1">{booking.purpose}</p>
                    </div>
                  )}

                  {booking.status === 'active' && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      {canCancelBooking(booking) ? (
                        <p className="text-sm text-blue-700">
                          <CheckCircle className="h-4 w-4 inline mr-1" />
                          สามารถยกเลิกการจองได้จนถึง 1 ชั่วโมงก่อนเวลาจอง
                        </p>
                      ) : (
                        <p className="text-sm text-orange-700">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          ไม่สามารถยกเลิกการจองได้ (เหลือเวลาน้อยกว่า 1 ชั่วโมง)
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}