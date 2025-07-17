// File: src/components/TimeSlotsDisplay.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Booking {
  id: number;
  user_name: string;
  user_email: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: "active" | "cancelled" | "completed";
  created_at: string;
}

export function TimeSlotsDisplay() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Time slots (9:00 - 02:00 next day)
  const timeSlots = [
    "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
    "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", 
    "21:00", "22:00", "23:00", "00:00", "01:00", "02:00"
  ];

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTimeSlotAvailable = (date: string, time: string) => {
    const today = new Date();
    const [timeHour] = time.split(':').map(Number);

    // Check if time has passed for today
    if (date === today.toISOString().split('T')[0]) {
      if (timeHour >= 3 && timeHour <= 23) {
        // Normal day times
        const [, timeMinute] = time.split(':').map(Number);
        const currentHour = today.getHours();
        const currentMinute = today.getMinutes();

        const timeInMinutes = timeHour * 60 + timeMinute;
        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        if (timeInMinutes <= currentTimeInMinutes) {
          return false;
        }
      }
    }

    // Check if this time conflicts with any existing booking
    return !bookings.some((booking) => {
      if (booking.booking_date !== date || booking.status !== 'active') {
        return false;
      }

      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const checkTimeMinutes = timeToMinutes(time);
      const bookingStartMinutes = timeToMinutes(booking.start_time);
      const bookingEndMinutes = timeToMinutes(booking.end_time);

      // Handle cross-day booking
      if (bookingEndMinutes <= bookingStartMinutes) {
        return (
          checkTimeMinutes >= bookingStartMinutes ||
          checkTimeMinutes <= bookingEndMinutes
        );
      } else {
        return (
          checkTimeMinutes >= bookingStartMinutes &&
          checkTimeMinutes <= bookingEndMinutes
        );
      }
    });
  };

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDate = getTodayDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          ตารางเวลาว่าง (วันนี้)
        </CardTitle>
        <CardDescription>
          {new Date(todayDate).toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-8">
            กำลังโหลด...
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {timeSlots.map((time) => {
              const available = isTimeSlotAvailable(todayDate, time);
              const today = new Date();
              const [timeHour] = time.split(':').map(Number);
              
              let isPastTime = false;
              // For times 00:00-02:00, treat as next day (not past time)
              if (timeHour >= 0 && timeHour <= 2) {
                isPastTime = false;
              } else {
                // For normal day times, check if passed
                const [, timeMinute] = time.split(':').map(Number);
                const currentHour = today.getHours();
                const currentMinute = today.getMinutes();

                const timeInMinutes = timeHour * 60 + timeMinute;
                const currentTimeInMinutes = currentHour * 60 + currentMinute;

                isPastTime = timeInMinutes <= currentTimeInMinutes;
              }

              return (
                <div
                  key={time}
                  className={`p-2 text-center rounded-md border text-xs ${
                    available && !isPastTime
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : isPastTime
                      ? 'bg-gray-100 border-gray-300 text-gray-500'
                      : 'bg-red-100 border-red-300 text-red-800'
                  }`}
                  title={
                    isPastTime
                      ? 'เวลาผ่านไปแล้ว'
                      : available
                      ? 'ว่าง'
                      : 'ไม่ว่าง'
                  }
                >
                  <div className="font-medium">{time}</div>
                  <div className="text-xs mt-1">
                    {isPastTime
                      ? 'หมดเวลาจอง'
                      : available
                      ? 'ว่าง'
                      : 'ไม่ว่าง'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center text-sm">
            <Link href="/booking" className="text-blue-600 hover:text-blue-800">
              จองห้องเลย →
            </Link>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-1"></div>
                <span>ว่าง</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded mr-1"></div>
                <span>ไม่ว่าง</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}