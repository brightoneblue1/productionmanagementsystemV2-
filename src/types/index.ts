export type UserRole = 'admin' | 'supervisor' | 'operator' | 'tank_filler' | 'kapa'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  employee_id: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
