<script setup lang="ts">
import { MapPin, Bus as BusIcon, Clock, RefreshCw, User, Locate } from 'lucide-vue-next'
import { formatDate } from '~/lib/utils'
import type { Driver, Bus, Trip } from '~/types'
import type { Map as LeafletMap, Marker, Icon } from 'leaflet'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

interface DriverLocation {
  id: string
  full_name: string
  current_latitude: number
  current_longitude: number
  last_location_update: string
  is_on_duty: boolean
  bus: Bus | null
  trip: Trip | null
}

const drivers = ref<DriverLocation[]>([])
const loading = ref(true)
const selectedDriver = ref<DriverLocation | null>(null)
const autoRefresh = ref(true)
let refreshInterval: ReturnType<typeof setInterval> | null = null

const mapContainer = ref<HTMLElement | null>(null)
let map: LeafletMap | null = null
let markers: Map<string, Marker> = new Map()
let L: typeof import('leaflet') | null = null

const defaultCenter: [number, number] = [14.5995, 120.9842]
const defaultZoom = 13

const initMap = async () => {
  if (!mapContainer.value || map) return
  
  L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  
  map = L.map(mapContainer.value).setView(defaultCenter, defaultZoom)
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)
}

const createBusIcon = () => {
  if (!L) return undefined
  return L.divIcon({
    html: `<div class="bus-marker">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#16a34a" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 6v6"/>
        <path d="M15 6v6"/>
        <path d="M2 12h19.6"/>
        <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
        <circle cx="7" cy="18" r="2"/>
        <path d="M9 18h5"/>
        <circle cx="16" cy="18" r="2"/>
      </svg>
    </div>`,
    className: 'bus-icon-container',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })
}

const updateMarkers = () => {
  if (!map || !L) return
  
  const currentIds = new Set(drivers.value.map(d => d.id))
  
  markers.forEach((marker, id) => {
    if (!currentIds.has(id)) {
      map?.removeLayer(marker)
      markers.delete(id)
    }
  })
  
  drivers.value.forEach(driver => {
    const position: [number, number] = [driver.current_latitude, driver.current_longitude]
    const popupContent = `
      <div class="p-2">
        <div class="font-semibold">${driver.bus?.bus_number || 'No Bus'}</div>
        <div class="text-sm text-gray-600">${driver.bus?.route_name || 'No Route'}</div>
        <div class="text-xs text-gray-500 mt-1">Driver: ${driver.full_name}</div>
      </div>
    `
    
    if (markers.has(driver.id)) {
      const marker = markers.get(driver.id)!
      marker.setLatLng(position)
      marker.getPopup()?.setContent(popupContent)
    } else {
      const marker = L!.marker(position, { icon: createBusIcon() })
        .addTo(map!)
        .bindPopup(popupContent)
        .on('click', () => {
          selectedDriver.value = driver
        })
      markers.set(driver.id, marker)
    }
  })
  
  if (drivers.value.length > 0 && markers.size > 0) {
    const bounds = L.latLngBounds(drivers.value.map(d => [d.current_latitude, d.current_longitude]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }
}

const centerOnDriver = (driver: DriverLocation) => {
  if (!map) return
  map.setView([driver.current_latitude, driver.current_longitude], 16)
  const marker = markers.get(driver.id)
  if (marker) {
    marker.openPopup()
  }
}

const fetchDriverLocations = async () => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        id,
        full_name,
        current_latitude,
        current_longitude,
        last_location_update,
        is_on_duty,
        buses:assigned_bus_id(*),
        trips:current_trip_id(*)
      `)
      .eq('is_on_duty', true)
      .not('current_latitude', 'is', null)
      .not('current_longitude', 'is', null)

    if (error) throw error

    drivers.value = (data || []).map(d => ({
      id: d.id,
      full_name: d.full_name || 'Unknown Driver',
      current_latitude: Number(d.current_latitude),
      current_longitude: Number(d.current_longitude),
      last_location_update: d.last_location_update,
      is_on_duty: d.is_on_duty,
      bus: d.buses as Bus | null,
      trip: d.trips as Trip | null
    }))
    
    updateMarkers()
  } catch (error) {
    console.error('Error fetching driver locations:', error)
  } finally {
    loading.value = false
  }
}

const getTimeSinceUpdate = (date: string) => {
  const now = new Date()
  const updated = new Date(date)
  const diffMs = now.getTime() - updated.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hr ago`
  return formatDate(date)
}

const startAutoRefresh = () => {
  if (refreshInterval) clearInterval(refreshInterval)
  refreshInterval = setInterval(fetchDriverLocations, 10000)
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

watch(autoRefresh, (val) => {
  if (val) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

onMounted(async () => {
  await initMap()
  await fetchDriverLocations()
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Live Bus Management</h1>
        <p class="text-gray-500 mt-1">Real-time vehicle tracking</p>
      </div>
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            v-model="autoRefresh"
            class="rounded border-gray-300 text-primary focus:ring-primary"
          />
          Auto-refresh (10s)
        </label>
        <UiButton variant="outline" @click="fetchDriverLocations" :disabled="loading">
          <RefreshCw :class="['h-4 w-4 mr-2', loading && 'animate-spin']" />
          Refresh
        </UiButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Leaflet Map -->
      <div class="lg:col-span-2">
        <UiCard class="h-[500px] overflow-hidden relative">
          <div ref="mapContainer" class="w-full h-full z-0"></div>
          <div v-if="loading" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div class="text-center">
              <RefreshCw class="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
              <p class="text-gray-500">Loading map...</p>
            </div>
          </div>
          <div v-if="!loading && drivers.length === 0" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div class="text-center">
              <MapPin class="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p class="text-gray-500">No active vehicles on the map</p>
              <p class="text-sm text-gray-400 mt-1">Vehicles will appear when drivers go on duty</p>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Active Vehicles List -->
      <div>
        <UiCard class="h-[500px] overflow-hidden flex flex-col">
          <div class="p-4 border-b">
            <h3 class="font-semibold text-gray-900">Active Vehicles</h3>
            <p class="text-sm text-gray-500">{{ drivers.length }} on duty</p>
          </div>

          <div class="flex-1 overflow-y-auto">
            <div v-if="loading" class="p-8 text-center text-gray-500">
              Loading...
            </div>
            <div v-else-if="drivers.length === 0" class="p-8 text-center text-gray-500">
              No active vehicles
            </div>
            <div v-else class="divide-y">
              <div
                v-for="driver in drivers"
                :key="driver.id"
                class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                :class="selectedDriver?.id === driver.id && 'bg-primary/5'"
                @click="selectedDriver = driver"
              >
                <div class="flex items-start gap-3">
                  <div class="p-2 bg-green-100 rounded-lg">
                    <BusIcon class="h-5 w-5 text-green-600" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <p class="font-medium text-gray-900 truncate">
                        {{ driver.bus?.bus_number || 'No Bus' }}
                      </p>
                      <UiBadge variant="success" class="text-xs">Active</UiBadge>
                    </div>
                    <p class="text-sm text-gray-500 truncate">
                      {{ driver.bus?.route_name || 'No Route' }}
                    </p>
                    <div class="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <User class="h-3 w-3" />
                      <span>{{ driver.full_name }}</span>
                    </div>
                    <div class="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Clock class="h-3 w-3" />
                      <span>{{ getTimeSinceUpdate(driver.last_location_update) }}</span>
                    </div>
                  </div>
                  <button
                    @click.stop="centerOnDriver(driver)"
                    class="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                    title="Center on map"
                  >
                    <Locate class="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </UiCard>
      </div>
    </div>

    <!-- Selected Vehicle Details -->
    <div v-if="selectedDriver" class="mt-6">
      <UiCard class="p-6">
        <h3 class="font-semibold text-gray-900 mb-4">Vehicle Details</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p class="text-sm text-gray-500">Driver</p>
            <p class="font-medium text-gray-900">{{ selectedDriver.full_name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Bus</p>
            <p class="font-medium text-gray-900">{{ selectedDriver.bus?.bus_number || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Route</p>
            <p class="font-medium text-gray-900">{{ selectedDriver.bus?.route_name || 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Last Update</p>
            <p class="font-medium text-gray-900">{{ getTimeSinceUpdate(selectedDriver.last_location_update) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Latitude</p>
            <p class="font-mono text-gray-900">{{ selectedDriver.current_latitude.toFixed(6) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Longitude</p>
            <p class="font-mono text-gray-900">{{ selectedDriver.current_longitude.toFixed(6) }}</p>
          </div>
          <div v-if="selectedDriver.trip">
            <p class="text-sm text-gray-500">Trip Status</p>
            <UiBadge variant="success">{{ selectedDriver.trip.status }}</UiBadge>
          </div>
          <div v-if="selectedDriver.trip">
            <p class="text-sm text-gray-500">Passengers</p>
            <p class="font-medium text-gray-900">{{ selectedDriver.trip.total_passengers }}</p>
          </div>
        </div>
      </UiCard>
    </div>
  </div>
</template>

<style>
.bus-icon-container {
  background: transparent !important;
  border: none !important;
}

.bus-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(22, 163, 74, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0);
  }
}

.leaflet-popup-content-wrapper {
  border-radius: 8px;
}

.leaflet-popup-content {
  margin: 8px 12px;
}
</style>
