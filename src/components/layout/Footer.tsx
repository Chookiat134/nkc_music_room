// .scr/components/layout/Footer.tsx
export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              {/* <Guitar className="h-6 w-6 text-blue-600" /> */}
              <span className="text-lg font-semibold text-gray-900">
                Music Room
              </span>
            </div>
            <p className="text-gray-600">
              ระบบจองห้องดนตรีและยืม/คืนอุปกรณ์ดนตรี
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              บริการ
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>จองห้องดนตรี</li>
              <li>ยืม/คืนอุปกรณ์</li>
              <li>แจ้งซ่อมอุปกรณ์</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              ติดต่อ
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>โทร: 02-xxx-xxxx</li>
              <li>อีเมล: info@musicroom.com</li>
              <li>เวลาทำการ: 9:00 - 18:00 น.</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          © 2024 Music Room Booking System. All rights reserved.
        </div>
      </div>
    </footer>
  )
}