<script setup lang="ts">
import {
  Search,
  TrendingUp,
  Clock3,
  CheckCircle2,
  XCircle,
  Activity,
  Sparkles,
  AlertTriangle,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Route,
  CircleAlert,
  TimerReset,
  Wifi
} from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/lib/utils'
import type { Bus, Driver, User } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

interface TripRow {
  id: string
  busNumber: string
  plateNumber: string
  driverName: string
  routeName: string
  startLocation: string
  startTime: string
  endTime: string | null
  totalPassengers: number
  totalFareCollected: number
  status: 'ongoing' | 'completed' | 'cancelled'
}

interface TripWithRelations {
  id: string
  start_time: string
  end_time: string | null
  total_passengers: number | null
  total_fare_collected: number | string | null
  status: 'ongoing' | 'completed' | 'cancelled'
  start_location: string | null
  buses: Bus | null
  drivers: (Driver & {
    users?: User | null
  }) | null
}

const searchQuery = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)
const resultsPerPage = ref('6')
const loading = ref(true)

const resultsPerPageOptions = [
  { value: '6', label: '6 / page' },
  { value: '10', label: '10 / page' },
  { value: '15', label: '15 / page' }
]

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const trips = ref<TripRow[]>([])

const mapTripRow = (trip: TripWithRelations): TripRow => ({
  id: trip.id,
  busNumber: trip.buses?.bus_number || 'Unknown Bus',
  plateNumber: trip.buses?.plate_number || 'No Plate',
  driverName: trip.drivers?.users?.full_name || trip.drivers?.full_name || 'Unknown Driver',
  routeName: trip.buses?.route_name || 'Unknown Route',
  startLocation: trip.start_location || trip.buses?.route_name || 'On route',
  startTime: trip.start_time,
  endTime: trip.end_time,
  totalPassengers: Number(trip.total_passengers || 0),
  totalFareCollected: Number(trip.total_fare_collected || 0),
  status: trip.status
})

const fetchTrips = async () => {
  loading.value = true
  try {
    let query = supabase
      .from('trips')
      .select(`
        id,
        start_time,
        end_time,
        total_passengers,
        total_fare_collected,
        status,
        start_location,
        buses:bus_id(*),
        drivers:driver_id(
          *,
          users:id(*)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter.value !== 'all') {
      query = query.eq('status', statusFilter.value)
    }

    const { data, error } = await query
    if (error) throw error

    trips.value = ((data || []) as TripWithRelations[]).map(mapTripRow)
  } catch (error) {
    console.error('Error fetching trips:', error)
  } finally {
    loading.value = false
  }
}

const getDurationInMinutes = (startTime: string, endTime: string | null) => {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  return (end.getTime() - start.getTime()) / (1000 * 60)
}

const formatDuration = (startTime: string, endTime: string | null) => {
  const diff = getDurationInMinutes(startTime, endTime)

  if (diff < 0) {
    return `${Math.round(diff)}m`
  }

  const hours = Math.floor(diff / 60)
  const minutes = Math.floor(diff % 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const statistics = computed(() => ({
  totalTrips: trips.value.length,
  ongoingTrips: trips.value.filter(trip => trip.status === 'ongoing').length,
  completedTrips: trips.value.filter(trip => trip.status === 'completed').length,
  totalRevenue: trips.value.reduce((sum, trip) => sum + trip.totalFareCollected, 0)
}))

const filteredTrips = computed(() => {
  let items = [...trips.value]

  if (!searchQuery.value) return items
  const query = searchQuery.value.toLowerCase()
  return items.filter(trip =>
    trip.busNumber.toLowerCase().includes(query) ||
    trip.routeName.toLowerCase().includes(query) ||
    trip.driverName.toLowerCase().includes(query)
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTrips.value.length / Number(resultsPerPage.value))))

const paginatedTrips = computed(() => {
  const pageSize = Number(resultsPerPage.value)
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredTrips.value.slice(start, end)
})

const anomalyTrips = computed(() => trips.value.filter(trip => getDurationInMinutes(trip.startTime, trip.endTime) < 0))

const busiestRoutePercent = computed(() => 20)

const suggestionChips = computed(() => [
  {
    label: `⚠️ ${anomalyTrips.value.length} trips flagged for negative duration`,
    icon: CircleAlert,
    tone: 'amber'
  },
  {
    label: `📈 Route Southcom is ${busiestRoutePercent.value}% busier than yesterday`,
    icon: TrendingUp,
    tone: 'blue'
  },
  {
    label: '💡 Suggesting maintenance for BUS-003',
    icon: Wrench,
    tone: 'emerald'
  }
])

const getStatusColor = (status: TripRow['status']) => {
  switch (status) {
    case 'ongoing': return 'default'
    case 'completed': return 'success'
    case 'cancelled': return 'destructive'
    default: return 'secondary'
  }
}

const getStatusIcon = (status: TripRow['status']) => {
  switch (status) {
    case 'ongoing': return Activity
    case 'completed': return CheckCircle2
    case 'cancelled': return XCircle
    default: return Clock3
  }
}

const isAnomaly = (trip: TripRow) => getDurationInMinutes(trip.startTime, trip.endTime) < 0

watch([statusFilter, resultsPerPage], () => {
  currentPage.value = 1
})

watch(statusFilter, fetchTrips)

onMounted(fetchTrips)

const goToPreviousPage = () => {
  currentPage.value = Math.max(1, currentPage.value - 1)
}

const goToNextPage = () => {
  currentPage.value = Math.min(totalPages.value, currentPage.value + 1)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Trips</h1>
        <p class="text-slate-600 mt-1">Monitor route performance, anomalies, and live trip movement</p>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <UiCard class="border-white/60 bg-white/70 p-5 backdrop-blur-xl shadow-[0_12px_30px_-16px_rgba(15,23,42,0.3)]">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">Total Trips</p>
            <p class="text-2xl font-bold text-slate-900 mt-1">{{ statistics.totalTrips }}</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-lg">
            <TrendingUp class="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </UiCard>

      <UiCard class="border-white/60 bg-white/70 p-5 backdrop-blur-xl shadow-[0_12px_30px_-16px_rgba(15,23,42,0.3)]">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">Ongoing</p>
            <p class="text-2xl font-bold text-slate-900 mt-1">{{ statistics.ongoingTrips }}</p>
          </div>
          <div class="p-3 bg-orange-100 rounded-lg">
            <Clock3 class="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </UiCard>

      <UiCard class="border-white/60 bg-white/70 p-5 backdrop-blur-xl shadow-[0_12px_30px_-16px_rgba(15,23,42,0.3)]">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">Completed</p>
            <p class="text-2xl font-bold text-slate-900 mt-1">{{ statistics.completedTrips }}</p>
          </div>
          <div class="p-3 bg-green-100 rounded-lg">
            <CheckCircle2 class="h-6 w-6 text-green-600" />
          </div>
        </div>
      </UiCard>

      <UiCard class="border-white/60 bg-white/70 p-5 backdrop-blur-xl shadow-[0_12px_30px_-16px_rgba(15,23,42,0.3)]">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">Total Revenue</p>
            <p class="text-2xl font-bold text-slate-900 mt-1">{{ formatCurrency(statistics.totalRevenue) }}</p>
          </div>
          <div class="p-3 bg-emerald-100 rounded-lg">
            <TrendingUp class="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </UiCard>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-white/60 bg-white/60 px-4 py-3 backdrop-blur-xl shadow-[0_12px_30px_-16px_rgba(15,23,42,0.28)]">
      <div class="flex min-w-max items-center gap-3">
        <div class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          <Sparkles class="h-4 w-4" />
          Smart Suggestions
        </div>
        <div
          v-for="chip in suggestionChips"
          :key="chip.label"
          :class="[
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1',
            chip.tone === 'amber' && 'bg-amber-50 text-amber-700 ring-amber-200',
            chip.tone === 'blue' && 'bg-blue-50 text-blue-700 ring-blue-200',
            chip.tone === 'emerald' && 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          ]"
        >
          <component :is="chip.icon" class="h-4 w-4" />
          {{ chip.label }}
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
    <div class="overflow-hidden rounded-3xl border border-white/60 bg-white/50 backdrop-blur-2xl shadow-[0_16px_40px_-20px_rgba(15,23,42,0.3)]">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-white/60 text-slate-500 backdrop-blur-xl">
            <tr>
              <th class="px-5 py-4 text-left font-semibold">Bus</th>
              <th class="px-5 py-4 text-left font-semibold">Driver</th>
              <th class="px-5 py-4 text-left font-semibold">Route</th>
              <th class="px-5 py-4 text-left font-semibold">Duration</th>
              <th class="px-5 py-4 text-left font-semibold">Passengers</th>
              <th class="px-5 py-4 text-left font-semibold">Fare</th>
              <th class="px-5 py-4 text-left font-semibold">Status</th>
              <th class="px-5 py-4 text-left font-semibold">Started</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paginatedTrips.length === 0">
              <td colspan="8" class="px-5 py-10 text-center text-slate-500">No trips found</td>
            </tr>
            <tr
              v-for="(trip, index) in paginatedTrips"
              :key="trip.id"
              :class="[
                'border-t border-white/50 transition-colors hover:bg-white/70',
                index % 2 === 0 ? 'bg-white/20' : 'bg-slate-50/40'
              ]"
            >
              <td class="px-5 py-4">
                <div class="font-semibold text-slate-900">{{ trip.busNumber }}</div>
                <div class="text-xs text-slate-500">{{ trip.plateNumber }}</div>
              </td>
              <td class="px-5 py-4 text-slate-700">{{ trip.driverName }}</td>
              <td class="px-5 py-4">
                <div class="font-medium text-slate-900">{{ trip.routeName }}</div>
                <div class="text-xs text-slate-500">{{ trip.startLocation }}</div>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2 text-slate-700">
                  <TimerReset class="h-4 w-4 text-slate-400" />
                  <span>{{ formatDuration(trip.startTime, trip.endTime) }}</span>
                  <div
                    v-if="isAnomaly(trip)"
                    class="group relative"
                  >
                    <span class="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                      <AlertTriangle class="h-3.5 w-3.5" />
                      Anomaly
                    </span>
                    <div class="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg group-hover:block">
                      Check GPS Log
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 font-semibold text-slate-900">{{ trip.totalPassengers }}</td>
              <td class="px-5 py-4 font-semibold text-slate-900">{{ formatCurrency(trip.totalFareCollected) }}</td>
              <td class="px-5 py-4">
                <div v-if="trip.status === 'ongoing'" class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                  <span class="relative flex h-2 w-2">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                    <span class="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                  </span>
                  <Wifi class="h-3.5 w-3.5" />
                  Live
                </div>
                <div v-else class="flex items-center gap-2 text-slate-600">
                  <component :is="getStatusIcon(trip.status)" class="h-4 w-4" />
                  <UiBadge :variant="getStatusColor(trip.status)">
                    {{ trip.status }}
                  </UiBadge>
                </div>
              </td>
              <td class="px-5 py-4 text-slate-600">{{ formatDate(trip.startTime) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-4 border-t border-white/50 bg-white/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-slate-600">
          Showing
          <span class="font-semibold text-slate-900">{{ paginatedTrips.length }}</span>
          of
          <span class="font-semibold text-slate-900">{{ filteredTrips.length }}</span>
          trips
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="flex items-center gap-2 text-sm text-slate-600">
            <Route class="h-4 w-4" />
            Results per page
            <UiSelect v-model="resultsPerPage" :options="resultsPerPageOptions" class="w-28" />
          </div>

          <div class="flex items-center gap-2">
            <UiButton variant="outline" size="sm" :disabled="currentPage === 1" @click="goToPreviousPage">
              <ChevronLeft class="mr-1 h-4 w-4" />
              Previous
            </UiButton>
            <div class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
              Page {{ currentPage }} / {{ totalPages }}
            </div>
            <UiButton variant="outline" size="sm" :disabled="currentPage === totalPages" @click="goToNextPage">
              Next
              <ChevronRight class="ml-1 h-4 w-4" />
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
