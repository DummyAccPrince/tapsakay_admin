export interface User {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'driver' | 'passenger'
  full_name: string
  phone_number: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Bus {
  id: string
  bus_number: string
  plate_number: string
  capacity: number
  route_name: string
  route_description: string | null
  status: 'active' | 'inactive' | 'maintenance'
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  driver_license_number: string
  license_expiry_date: string
  assigned_bus_id: string | null
  is_on_duty: boolean
  current_latitude: number | null
  current_longitude: number | null
  last_location_update: string | null
  total_trips: number
  rating: number
  created_at: string
  updated_at: string
  current_trip_id: string | null
  full_name: string | null
  license_image_url: string | null
  user?: User
  bus?: Bus
}

export interface NfcCard {
  id: string
  card_number: string
  card_type: 'reloadable' | 'single_use'
  owner_id: string | null
  balance: number
  is_active: boolean
  is_blocked: boolean
  discount_type: 'none' | 'student' | 'senior' | 'pwd' | null
  last_used_at: string | null
  expiry_date: string | null
  created_at: string
  updated_at: string
  uid: string | null
  owner?: User
}

export interface Trip {
  id: string
  bus_id: string
  driver_id: string
  start_time: string
  end_time: string | null
  start_location: string | null
  end_location: string | null
  start_latitude: number | null
  start_longitude: number | null
  end_latitude: number | null
  end_longitude: number | null
  total_distance: number | null
  total_passengers: number
  total_fare_collected: number
  status: 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  bus?: Bus
  driver?: Driver
}

export interface Transaction {
  id: string
  trip_id: string | null
  passenger_id: string
  nfc_card_id: string
  bus_id: string | null
  driver_id: string | null
  transaction_type: 'tap_in' | 'tap_out' | 'reload'
  amount: number
  balance_before: number
  balance_after: number
  discount_applied: number
  discount_type: 'none' | 'student' | 'senior' | 'pwd' | null
  location_latitude: number | null
  location_longitude: number | null
  location_name: string | null
  status: 'success' | 'failed' | 'pending'
  created_at: string
  admin_id: string | null
  passenger?: User
  nfc_card?: NfcCard
  bus?: Bus
  driver?: Driver
}

export interface PassengerTrip {
  id: string
  trip_id: string
  passenger_id: string
  nfc_card_id: string
  tap_in_time: string
  tap_out_time: string | null
  tap_in_location: string | null
  tap_out_location: string | null
  tap_in_latitude: number | null
  tap_in_longitude: number | null
  tap_out_latitude: number | null
  tap_out_longitude: number | null
  distance_traveled: number | null
  fare_amount: number | null
  discount_applied: number
  final_amount: number | null
  status: 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  passenger_count: number
  driver_confirmed: boolean
  driver_confirmed_at: string | null
  passenger_breakdown: {
    regular: number
    student: number
    senior: number
    pwd: number
  }
}

export interface DashboardStats {
  totalUsers: number
  totalDrivers: number
  totalBuses: number
  totalCards: number
  totalTransactions: number
  totalRevenue: number
  activeTrips: number
}
