export interface User {
  id: number
  clerk_id: string
  email: string
  name: string
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}

export interface RoomBooking {
  id: number
  user_id: number
  user_name: string
  user_email: string
  booking_date: string
  start_time: string
  end_time: string
  purpose?: string
  status: 'active' | 'cancelled' | 'completed'
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: number
  name: string
  description?: string
  quantity: number
  available_quantity: number
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'broken'
  created_at: string
  updated_at: string
}

export interface EquipmentLoan {
  id: number
  user_id: number
  user_name: string
  user_email: string
  equipment_id: number
  equipment_name: string
  quantity: number
  loan_date: string
  return_date?: string
  expected_return_date: string
  status: 'borrowed' | 'returned' | 'overdue' | 'lost'
  notes?: string
  returned_by_name?: string
  returned_by_email?: string
  created_at: string
  updated_at: string
}

export interface MaintenanceRequest {
  id: number
  user_id: number
  user_name: string
  user_email: string
  equipment_id?: number
  equipment_name?: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  reported_date: string
  started_date?: string
  completed_date?: string
  admin_notes?: string
  handled_by_name?: string
  handled_by_email?: string
  is_repair_completed: boolean
  repair_cost?: number
  repair_notes?: string
  created_at: string
  updated_at: string
}