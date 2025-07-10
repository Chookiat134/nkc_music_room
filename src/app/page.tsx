import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { 
  Calendar, 
  Guitar, 
  Wrench, 
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function HomePage() {
  const { userId } = await auth()

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <Guitar className="h-16 w-16 text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Music Room
              <span className="text-blue-600"> Booking</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              ระบบจองห้องดนตรีและยืม/คืนอุปกรณ์ดนตรี ที่ใช้งานง่าย มีประสิทธิภาพ
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" className="text-lg px-8 py-3">
                  เริ่มใช้งาน
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                  เข้าสู่ระบบ
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ฟีเจอร์หลัก
            </h2>
            <p className="text-lg text-gray-600">
              ทุกสิ่งที่คุณต้องการสำหรับการจัดการห้องดนตรี
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>จองห้องดนตรี</CardTitle>
                <CardDescription>
                  จองห้องฝึกซ้อมล่วงหน้า ตรวจสอบเวลาว่างได้แบบเรียลไทม์
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Guitar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>ยืม/คืนอุปกรณ์</CardTitle>
                <CardDescription>
                  ระบบยืม/คืนอุปกรณ์ดนตรี ติดตามสถานะได้ตลอดเวลา
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Wrench className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>แจ้งซ่อม</CardTitle>
                <CardDescription>
                  แจ้งปัญหาอุปกรณ์ได้ทันที ติดตามความคืบหน้าการซ่อม
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // User is logged in - show dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ยินดีต้อนรับ
        </h1>
        <p className="text-gray-600">
          เลือกบริการที่คุณต้องการใช้งาน
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Link href="/booking">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <CardTitle>จองห้องดนตรี</CardTitle>
                <CardDescription>
                  จองห้องฝึกซ้อมสำหรับการใช้งาน
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/equipment">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Guitar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <CardTitle>ยืม/คืนอุปกรณ์</CardTitle>
                <CardDescription>
                  จัดการการยืมและคืนอุปกรณ์ดนตรี
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/maintenance">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Wrench className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <CardTitle>แจ้งซ่อม</CardTitle>
                <CardDescription>
                  รายงานปัญหาและขอการซ่อมแซม
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              การจองล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-8">
              ยังไม่มีการจองห้อง
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Guitar className="h-5 w-5 mr-2" />
              อุปกรณ์ที่ยืม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-8">
              ยังไม่มีการยืมอุปกรณ์
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}