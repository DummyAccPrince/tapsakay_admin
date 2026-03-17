<script setup lang="ts">
import { Search, Filter, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/lib/utils'
import type { Trip, Bus, Driver } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

interface TripWithRelations extends Trip {
  buses: Bus
  drivers: Driver
}

const trips = ref<TripWithRelations[]>([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('all')

const statistics = ref({
  total_trips: 0,
  ongoing_trips: 0,
  completed_trips: 0,
  total_revenue: 0
})

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const fetchTrips = async () => {
  loading.value = true
  try {
    let query = supabase
      .from('trips')
      .select(`
        *,
        buses:bus_id(*),
        drivers:driver_id(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter.value !== 'all') {
      query = query.eq('status', statusFilter.value)
    }

    const { data, error } = await query

    if (error) throw error
    trips.value = (data || []) as TripWithRelations[]
  } catch (error) {
    console.error('Error fetching trips:', error)
  } finally {
    loading.value = false
  }
}

const fetchStatistics = async () => {
  try {
    const [totalRes, ongoingRes, completedRes, revenueRes] = await Promise.all([
      supabase.from('trips').select('id', { count: 'exact', head: true }),
      supabase.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'ongoing'),
      supabase.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('trips').select('total_fare_collected').eq('status', 'completed')
    ])

    statistics.value = {
      total_trips: totalRes.count || 0,
      ongoing_trips: ongoingRes.count || 0,
      completed_trips: completedRes.count || 0,
      total_revenue: revenueRes.data?.reduce((sum, t) => sum + Number(t.total_fare_collected), 0) || 0
    }
  } catch (error) {
    console.error('Error fetching statistics:', error)
  }
}

const filteredTrips = computed(() => {
  if (!searchQuery.value) return trips.value
  const query = searchQuery.value.toLowerCase()
  return trips.value.filter(t =>
    t.buses?.bus_number?.toLowerCase().includes(query) ||
    t.buses?.route_name?.toLowerCase().includes(query) ||
    t.drivers?.full_name?.toLowerCase().includes(query)
  )
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ongoing': return 'default'
    case 'completed': return 'success'
    case 'cancelled': return 'destructive'
    default: return 'secondary'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ongoing': return Clock
    case 'completed': return CheckCircle
    case 'cancelled': return XCircle
    default: return Clock
  }
}

const formatDuration = (startTime: string, endTime: string | null) => {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const diff = end.getTime() - start.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Real-time subscription
onMounted(() => {
  fetchTrips()
  fetchStatistics()

  // Subscribe to trips changes
  const channel = supabase
    .channel('trips-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
      fetchTrips()
      fetchStatistics()
    })
    .subscribe()

  onUnmounted(() => {
    supabase.removeChannel(channel)
  })
})

watch(statusFilter, fetchTrips)
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Trips</h1>
        <p class="text-gray-500 mt-1">Monitor all bus trips and routes</p>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <UiCard class="p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Total Trips</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ statistics.total_trips }}</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-lg">
            <TrendingUp class="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </UiCard>

      <UiCard class="p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Ongoing</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ statistics.ongoing_trips }}</p>
          </div>
          <div class="p-3 bg-orange-100 rounded-lg">
            <Clock class="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </UiCard>

      <UiCard class="p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Completed</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ statistics.completed_trips }}</p>
          </div>
          <div class="p-3 bg-green-100 rounded-lg">
            <CheckCircle class="h-6 w-6 text-green-600" />
          </div>
        </div>
      </UiCard>

      <UiCard class="p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Total Revenue</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ formatCurrency(statistics.total_revenue) }}</p>
          </div>
          <div class="p-3 bg-emerald-100 rounded-lg">
            <TrendingUp class="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <UiInput
          v-model="searchQuery"
          placeholder="Search trips..."
          class="pl-10"
        />
      </div>
      <UiSelect
        v-model="statusFilter"
        :options="statusOptions"
        class="w-full sm:w-48"
      />
    </div>

    <!-- Trips Table -->
    <UiCard>
      <UiTable>
        <thead>
          <tr class="border-b">
            <th class="text-left p-4 font-medium text-gray-500">Bus</th>
            <th class="text-left p-4 font-medium text-gray-500">Driver</th>
            <th class="text-left p-4 font-medium text-gray-500">Route</th>
            <th class="text-left p-4 font-medium text-gray-500">Duration</th>
            <th class="text-left p-4 font-medium text-gray-500">Passengers</th>
            <th class="text-left p-4 font-medium text-gray-500">Fare Collected</th>
            <th class="text-left p-4 font-medium text-gray-500">Status</th>
            <th class="text-left p-4 font-medium text-gray-500">Started</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="p-8 text-center text-gray-500">Loading...</td>
          </tr>
          <tr v-else-if="filteredTrips.length === 0">
            <td colspan="8" class="p-8 text-center text-gray-500">No trips found</td>
          </tr>
          <tr v-for="trip in filteredTrips" :key="trip.id" class="border-b last:border-0 hover:bg-gray-50">
            <td class="p-4">
              <div class="font-medium text-gray-900">{{ trip.buses?.bus_number }}</div>
              <div class="text-sm text-gray-500">{{ trip.buses?.plate_number }}</div>
            </td>
            <td class="p-4 text-gray-600">{{ trip.drivers?.full_name }}</td>
            <td class="p-4">
              <div class="text-gray-900">{{ trip.buses?.route_name }}</div>
              <div v-if="trip.start_location" class="text-sm text-gray-500">{{ trip.start_location }}</div>
            </td>
            <td class="p-4 text-gray-600">{{ formatDuration(trip.start_time, trip.end_time) }}</td>
            <td class="p-4 text-center">
              <span class="font-medium text-gray-900">{{ trip.total_passengers }}</span>
            </td>
            <td class="p-4 font-medium text-gray-900">{{ formatCurrency(Number(trip.total_fare_collected)) }}</td>
            <td class="p-4">
              <div class="flex items-center gap-2">
                <component :is="getStatusIcon(trip.status)" class="h-4 w-4" />
                <UiBadge :variant="getStatusColor(trip.status)">
                  {{ trip.status }}
                </UiBadge>
              </div>
            </td>
            <td class="p-4 text-sm text-gray-600">{{ formatDate(trip.start_time) }}</td>
          </tr>
        </tbody>
      </UiTable>
    </UiCard>
  </div>
</template>
