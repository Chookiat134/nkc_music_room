// src/app/booking/page.tsx (Fixed)
"use client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyBookings } from "@/components/booking/MyBookings";

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

export default function BookingPage() {
  const { user, isLoaded } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    booking_date: "",
    start_time: "",
    end_time: "",
    purpose: "",
  });

  // Time slots (9:00 - 18:00)
  const timeSlots = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
    "23:00",
    "00:00",
    "01:00",
    "02:00",
  ];

  // Load bookings
  useEffect(() => {
    if (isLoaded) {
      fetchBookings();
    }
  }, [isLoaded]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/bookings");
      if (response.ok) {
        const data = await response.json();

        // Update expired bookings
        const now = new Date();
        const updatedData = data.map((booking: Booking) => {
          if (booking.status === "active") {
            const bookingEndDateTime = new Date(
              `${booking.booking_date} ${booking.end_time}`
            );
            if (bookingEndDateTime < now) {
              return { ...booking, status: "completed" as const };
            }
          }
          return booking;
        });

        setBookings(updatedData);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!formData.booking_date || !formData.start_time || !formData.end_time) {
      setMessage({ type: "error", text: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setMessage({ type: "error", text: "เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด" });
      return;
    }

    // Check if date is not in the past
    const selectedDate = new Date(formData.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setMessage({ type: "error", text: "ไม่สามารถจองย้อนหลังได้" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          user_name: user.fullName || user.firstName || "ไม่ระบุชื่อ",
          user_email: user.emailAddresses[0]?.emailAddress || "",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "จองห้องสำเร็จ!" });
        setFormData({
          booking_date: "",
          start_time: "",
          end_time: "",
          purpose: "",
        });
        fetchBookings(); // Refresh bookings list
      } else {
        setMessage({ type: "error", text: result.error || "เกิดข้อผิดพลาด" });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">ใช้งาน</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">ยกเลิก</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-800">เสร็จสิ้น</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isTimeSlotAvailable = (date: string, time: string) => {
    if (!date) return true;

    const selectedDate = new Date(date);
    const today = new Date();
    const [timeHour] = time.split(":").map(Number);

    // Check if time has passed for today
    if (selectedDate.toDateString() === today.toDateString()) {
      if (timeHour >= 3 && timeHour <= 23) {
        // Normal day times
        const [, timeMinute] = time.split(":").map(Number);
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
      if (booking.booking_date !== date || booking.status !== "active") {
        return false;
      }

      // Convert times to minutes for easier comparison
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const checkTimeMinutes = timeToMinutes(time);
      const bookingStartMinutes = timeToMinutes(booking.start_time);
      const bookingEndMinutes = timeToMinutes(booking.end_time);

      // Handle cross-day booking (e.g., 23:00-01:00)
      if (bookingEndMinutes <= bookingStartMinutes) {
        // Cross-day booking: check if time is >= start OR <= end
        return (
          checkTimeMinutes >= bookingStartMinutes ||
          checkTimeMinutes <= bookingEndMinutes
        );
      } else {
        // Same-day booking: check if time is >= start AND <= end
        // แก้จาก < เป็น <= เพื่อให้เวลาสิ้นสุดเป็นไม่ว่างด้วย
        return (
          checkTimeMinutes >= bookingStartMinutes &&
          checkTimeMinutes <= bookingEndMinutes
        );
      }
    });
  };

  const getBookingForTimeSlot = (date: string, time: string) => {
    if (!date) return null;

    return bookings.find((booking) => {
      if (booking.booking_date !== date || booking.status !== "active") {
        return false;
      }

      // Convert times to minutes for easier comparison
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const checkTimeMinutes = timeToMinutes(time);
      const bookingStartMinutes = timeToMinutes(booking.start_time);
      const bookingEndMinutes = timeToMinutes(booking.end_time);

      // Handle cross-day booking
      if (bookingEndMinutes <= bookingStartMinutes) {
        // แก้จาก < เป็น <= เพื่อให้เวลาสิ้นสุดเป็นไม่ว่างด้วย
        return (
          checkTimeMinutes >= bookingStartMinutes ||
          checkTimeMinutes <= bookingEndMinutes
        );
      } else {
        // Same-day booking: แก้จาก < เป็น <= เพื่อให้เวลาสิ้นสุดเป็นไม่ว่างด้วย
        return (
          checkTimeMinutes >= bookingStartMinutes &&
          checkTimeMinutes <= bookingEndMinutes
        );
      }
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        กำลังโหลด...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>กรุณาเข้าสู่ระบบเพื่อจองห้องดนตรี</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            จองห้องดนตรี
          </h1>
          <p className="text-gray-600">
            จองห้องดนตรีสำหรับการฝึกซ้อมและการแสดง
          </p>
        </div>

        <Tabs defaultValue="booking" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="booking" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              จองห้องใหม่
            </TabsTrigger>
            <TabsTrigger value="my-bookings" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              การจองของฉัน
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              ตารางการจอง
            </TabsTrigger>
          </TabsList>

          {/* Booking Form Tab */}
          <TabsContent value="booking" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Booking Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    ฟอร์มจองห้อง
                  </CardTitle>
                  <CardDescription>กรอกข้อมูลเพื่อจองห้องดนตรี</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="booking_date">วันที่จอง</Label>
                      <div className="relative">
                        <DatePicker
                          selected={
                            formData.booking_date
                              ? new Date(formData.booking_date)
                              : null
                          }
                          onChange={(date) => {
                            if (date) {
                              // แปลงเป็น local date string แทน ISO string
                              const year = date.getFullYear();
                              const month = String(
                                date.getMonth() + 1
                              ).padStart(2, "0");
                              const day = String(date.getDate()).padStart(
                                2,
                                "0"
                              );
                              const formattedDate = `${year}-${month}-${day}`;

                              setFormData({
                                ...formData,
                                booking_date: formattedDate,
                              });
                            }
                          }}
                          dateFormat="dd/MM/yyyy"
                          minDate={new Date()}
                          placeholderText="เลือกวันที่"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-gray-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-900 placeholder:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white"
                          wrapperClassName="w-full"
                          required
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <svg
                            className="h-4 w-4 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start_time">เวลาเริ่ม</Label>
                        <div className="relative">
                          <select
                            id="start_time"
                            value={formData.start_time}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                start_time: e.target.value,
                              })
                            }
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-gray-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white appearance-none"
                            required
                          >
                            <option value="">เลือกเวลา</option>
                            {timeSlots.slice(0, -1).map((time) => {
                              const available = isTimeSlotAvailable(
                                formData.booking_date,
                                time
                              );

                              return (
                                <option
                                  key={time}
                                  value={time}
                                  disabled={!available}
                                >
                                  {time} {!available ? `(ไม่ว่าง)` : ""}
                                </option>
                              );
                            })}
                          </select>
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg
                              className="h-4 w-4 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="end_time">เวลาสิ้นสุด</Label>
                        <div className="relative">
                          <select
                            id="end_time"
                            value={formData.end_time}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                end_time: e.target.value,
                              })
                            }
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-gray-900 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-white appearance-none"
                            required
                          >
                            <option value="">เลือกเวลา</option>
                            {(() => {
                              const startIndex = timeSlots.findIndex(
                                (time) => time === formData.start_time
                              );
                              const endTimeOptions: JSX.Element[] = [];

                              // ถ้ายังไม่เลือกเวลาเริ่ม ให้แสดงทั้งหมด
                              if (startIndex === -1) {
                                timeSlots.slice(1).forEach((time) => {
                                  const available = isTimeSlotAvailable(
                                    formData.booking_date,
                                    time
                                  );
                                  endTimeOptions.push(
                                    <option
                                      key={time}
                                      value={time}
                                      disabled={!available}
                                    >
                                      {time} {!available ? `(ไม่ว่าง)` : ""}
                                    </option>
                                  );
                                });
                                return endTimeOptions;
                              }

                              // แสดงเวลาหลังจาก start_time
                              for (
                                let i = startIndex + 1;
                                i < timeSlots.length;
                                i++
                              ) {
                                const time = timeSlots[i];
                                const available = isTimeSlotAvailable(
                                  formData.booking_date,
                                  time
                                );
                                endTimeOptions.push(
                                  <option
                                    key={time}
                                    value={time}
                                    disabled={!available}
                                  >
                                    {time} {!available ? `(ไม่ว่าง)` : ""}
                                  </option>
                                );
                              }
                              return endTimeOptions;
                            })()}
                          </select>
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg
                              className="h-4 w-4 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="purpose">วัตถุประสงค์ (ไม่บังคับ)</Label>
                      <Textarea
                        id="purpose"
                        placeholder="เช่น ฝึกซ้อมเพลง, บันทึกเสียง, ประชุมวง..."
                        value={formData.purpose}
                        onChange={(e) =>
                          setFormData({ ...formData, purpose: e.target.value })
                        }
                        rows={3}
                      />
                    </div>

                    {message && (
                      <Alert
                        className={
                          message.type === "error"
                            ? "border-red-500 bg-red-50"
                            : "border-green-500 bg-green-50"
                        }
                      >
                        {message.type === "error" ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        <AlertDescription
                          className={
                            message.type === "error"
                              ? "text-red-700"
                              : "text-green-700"
                          }
                        >
                          {message.text}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? "กำลังจอง..." : "จองห้อง"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Time Slot Availability */}
              {formData.booking_date && (
                <Card>
                  <CardHeader>
                    <CardTitle>ตารางเวลาว่าง</CardTitle>
                    <CardDescription>
                      {new Date(formData.booking_date).toLocaleDateString(
                        "en-GB"
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {timeSlots.map((time) => {
                        const available = isTimeSlotAvailable(
                          formData.booking_date,
                          time
                        );
                        const booking = getBookingForTimeSlot(
                          formData.booking_date,
                          time
                        );
                        const selectedDate = new Date(formData.booking_date);
                        const today = new Date();
                        const [timeHour] = time.split(":").map(Number);

                        let isPastTime = false;
                        if (
                          selectedDate.toDateString() === today.toDateString()
                        ) {
                          // For times 00:00-02:00, treat as next day (not past time)
                          if (timeHour >= 0 && timeHour <= 2) {
                            isPastTime = false; // These are next day times
                          } else {
                            // For normal day times, check if passed
                            const [, timeMinute] = time.split(":").map(Number);
                            const currentHour = today.getHours();
                            const currentMinute = today.getMinutes();

                            const timeInMinutes = timeHour * 60 + timeMinute;
                            const currentTimeInMinutes =
                              currentHour * 60 + currentMinute;

                            isPastTime = timeInMinutes <= currentTimeInMinutes;
                          }
                        }

                        return (
                          <div
                            key={time}
                            className={`p-3 text-center rounded-md border text-sm ${
                              available && !isPastTime
                                ? "bg-green-100 border-green-300 text-green-800"
                                : isPastTime
                                ? "bg-gray-100 border-gray-300 text-gray-500"
                                : "bg-red-100 border-red-300 text-red-800"
                            }`}
                            title={
                              isPastTime
                                ? "เวลาผ่านไปแล้ว"
                                : available
                                ? "ว่าง"
                                : `จองโดย ${booking?.user_name}`
                            }
                          >
                            <div className="font-medium">{time}</div>
                            <div className="text-xs mt-1">
                              {isPastTime
                                ? "หมดเวลาจอง"
                                : available
                                ? "ว่าง"
                                : "ไม่ว่าง"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* My Bookings Tab */}
          <TabsContent value="my-bookings">
            <MyBookings />
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  ตารางการจองห้อง
                </CardTitle>
                <CardDescription>รายการจองห้องดนตรีทั้งหมด</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-gray-500">กำลังโหลด...</p>
                ) : bookings.length === 0 ? (
                  <p className="text-center text-gray-500">
                    ยังไม่มีการจองห้อง
                  </p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {bookings
                      .filter((booking) => booking.status === "active")
                      .sort((a, b) => {
                        const dateA = new Date(
                          `${a.booking_date} ${a.start_time}`
                        );
                        const dateB = new Date(
                          `${b.booking_date} ${b.start_time}`
                        );
                        return dateA.getTime() - dateB.getTime();
                      })
                      .map((booking) => (
                        <div
                          key={booking.id}
                          className="p-4 border rounded-lg bg-gray-50"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1 text-gray-500" />
                              <span className="font-medium">
                                {booking.user_name || "ไม่ระบุชื่อ"}
                              </span>
                            </div>
                            {getStatusBadge(booking.status)}
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(
                                booking.booking_date
                              ).toLocaleDateString("en-GB")}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {booking.start_time} - {booking.end_time}
                            </div>
                            {booking.purpose && (
                              <div className="mt-2">
                                <span className="font-medium">
                                  วัตถุประสงค์:
                                </span>{" "}
                                {booking.purpose}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
