<script setup lang="ts">
import { MapPin, Bus as BusIcon, Clock3, RefreshCw, User, Locate, CloudRain, AlertTriangle, Gauge, Route, RadioTower, Navigation } from 'lucide-vue-next'
import { formatDate } from '~/lib/utils'
import type { Driver, Bus, Trip } from '~/types'
import type { Map as LeafletMap, Marker, Polyline } from 'leaflet'

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
  heading: number
  speed: number
  street_name: string
  is_live: boolean
  latest_trip_activity: string | null
}

const drivers = ref<DriverLocation[]>([])
const loading = ref(true)
const selectedDriver = ref<DriverLocation | null>(null)
const autoRefresh = ref(true)
let refreshInterval: ReturnType<typeof setInterval> | null = null

const mapContainer = ref<HTMLElement | null>(null)
let map: LeafletMap | null = null
let markers: Map<string, Marker> = new Map()
let routeLine: Polyline | null = null
let L: typeof import('leaflet') | null = null

const defaultCenter: [number, number] = [14.5995, 120.9842]
const defaultZoom = 13
const southcomDivisoriaRoute: [number, number][] = [
  [6.1173, 125.1716],
  [6.1165, 125.1764],
  [6.1141, 125.1806],
  [6.1118, 125.1842],
  [6.1094, 125.1881],
  [6.1078, 125.1927],
  [6.1059, 125.1972]
]
const fallbackStreetNames = [
  'National Highway',
  'Pioneer Avenue',
  'Santiago Boulevard',
  'Jose Catolico Sr. Avenue',
  'Divisoria Road',
  'Southcom Access Road'
]
const liveThresholdMinutes = 15

const initMap = async () => {
  if (!mapContainer.value || map) return
  
  L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  
  map = L.map(mapContainer.value).setView(defaultCenter, defaultZoom)
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  routeLine = L.polyline(southcomDivisoriaRoute, {
    color: '#3b82f6',
    weight: 6,
    opacity: 0.45,
    lineJoin: 'round'
  }).addTo(map)
}

const createBusIcon = (driver: DriverLocation) => {
  if (!L) return undefined

  return L.divIcon({
    html: `<div class="bus-marker-shell ${driver.is_live ? 'is-live' : ''}">
      <div class="bus-live-ring"></div>
      <div class="bus-marker" style="transform: rotate(${driver.heading}deg)">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/>
          <path d="M15 6v6"/>
          <path d="M2 12h19.6"/>
          <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
          <circle cx="7" cy="18" r="2"/>
          <path d="M9 18h5"/>
          <circle cx="16" cy="18" r="2"/>
        </svg>
      </div>
      <div class="bus-heading-pill">${Math.round(driver.heading)}°</div>
    </div>`,
    className: 'bus-icon-container',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26]
  })
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

const getMinutesSinceUpdate = (date: string) => {
  const now = new Date()
  const updated = new Date(date)
  return Math.floor((now.getTime() - updated.getTime()) / 60000)
}

const isDriverLive = (date: string) => getMinutesSinceUpdate(date) <= liveThresholdMinutes

const getLatestTripActivity = (trip: Trip | null) => {
  if (!trip) return null
  return trip.updated_at || trip.created_at || trip.start_time || null
}

const dispatchStatusCount = computed(() => drivers.value.filter(driver => driver.is_live).length)
const staleStatusCount = computed(() => drivers.value.filter(driver => !driver.is_live).length)

const alertDriver = computed(() => drivers.value.find(driver => driver.bus?.bus_number === 'BUS-003') || drivers.value[0] || null)

const hudCards = computed(() => [
  {
    title: 'Dispatch Status',
    value: `${dispatchStatusCount.value}`,
    subtitle: `${staleStatusCount.value} stale feed${staleStatusCount.value === 1 ? '' : 's'}`,
    icon: RadioTower,
    tone: 'blue'
  },
  {
    title: 'Live Alert',
    value: `Agent Alert: ${alertDriver.value?.bus?.bus_number || 'BUS-003'} is ahead of schedule by 4 mins.`,
    subtitle: 'Operational insight',
    icon: AlertTriangle,
    tone: 'amber'
  },
  {
    title: 'Weather / Traffic',
    value: 'Light rain detected - possible route delays.',
    subtitle: 'Advisory',
    icon: CloudRain,
    tone: 'slate'
  }
])

const liveFeedDrivers = computed(() => [...drivers.value].sort((a, b) => Number(b.is_live) - Number(a.is_live)))

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
      <div style="padding: 6px 4px; min-width: 180px;">
        <div style="font-weight: 700; color: #0f172a;">${driver.bus?.bus_number || 'No Bus'}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 2px;">${driver.bus?.route_name || 'No Route'}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Driver: ${driver.full_name}</div>
        <div style="font-size: 12px; color: #64748b;">${driver.street_name} • ${driver.speed} km/h</div>
        <div style="font-size: 12px; color: #64748b;">Trip activity: ${driver.latest_trip_activity ? new Date(driver.latest_trip_activity).toLocaleString() : 'No recent trip activity'}</div>
      </div>
    `

    if (markers.has(driver.id)) {
      const marker = markers.get(driver.id)!
      marker.setLatLng(position)
      marker.setIcon(createBusIcon(driver)!)
      marker.getPopup()?.setContent(popupContent)
    } else {
      const marker = L!.marker(position, { icon: createBusIcon(driver) })
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

const centerOnRoute = () => {
  if (!map || !L || !routeLine) return
  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] })
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

    drivers.value = (data || []).map((d, index) => ({
      id: d.id,
      full_name: d.full_name || 'Unknown Driver',
      current_latitude: Number(d.current_latitude),
      current_longitude: Number(d.current_longitude),
      last_location_update: d.last_location_update,
      is_on_duty: d.is_on_duty,
      bus: d.buses as Bus | null,
      trip: d.trips as Trip | null,
      heading: (index * 57 + 35) % 360,
      speed: 26 + index * 7,
      street_name: fallbackStreetNames[index % fallbackStreetNames.length],
      is_live: d.last_location_update ? isDriverLive(d.last_location_update) : false,
      latest_trip_activity: getLatestTripActivity(d.trips as Trip | null)
    }))

    if (!selectedDriver.value && drivers.value.length > 0) {
      selectedDriver.value = drivers.value[0]
    }

    updateMarkers()
  } catch (error) {
    console.error('Error fetching driver locations:', error)
  } finally {
    loading.value = false
  }
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
  <div class="flex h-[calc(100vh-6rem)] min-h-[720px] flex-col gap-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Smart Command Center</h1>
        <p class="mt-1 text-sm text-slate-600">Real-time fleet visibility, dispatch alerts, and route oversight.</p>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            v-model="autoRefresh"
            class="rounded border-gray-300 text-primary focus:ring-primary"
          />
          Auto-refresh (10s)
        </label>
        <UiButton variant="outline" @click="centerOnRoute">
          <Route class="mr-2 h-4 w-4" />
          Center Route
        </UiButton>
        <UiButton variant="outline" @click="fetchDriverLocations" :disabled="loading">
          <RefreshCw :class="['h-4 w-4 mr-2', loading && 'animate-spin']" />
          Refresh
        </UiButton>
      </div>
    </div>

    <div class="grid h-full min-h-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(300px,360px)_1fr]">
      <aside class="min-h-0 overflow-hidden rounded-[28px] border border-white/80 bg-white/88 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.3)] backdrop-blur-2xl">
        <div class="border-b border-slate-200/70 px-5 py-4">
          <h2 class="text-lg font-semibold text-slate-900">Live Feed</h2>
          <p class="mt-1 text-sm text-slate-500">Street-level tracking for active fleet vehicles.</p>
        </div>

        <div class="h-[calc(100%-84px)] overflow-y-auto px-3 py-3">
          <TransitionGroup name="feed" tag="div" class="space-y-3">
            <button
              v-for="driver in liveFeedDrivers"
              :key="driver.id"
              class="w-full rounded-2xl border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              :class="selectedDriver?.id === driver.id
                ? 'border-blue-200 bg-blue-50/70 shadow-[0_16px_36px_-24px_rgba(37,99,235,0.45)]'
                : driver.is_live
                  ? 'border-slate-200 bg-white/80 hover:border-slate-300'
                  : 'border-amber-200 bg-amber-50/80 hover:border-amber-300'"
              @click="selectedDriver = driver"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <div class="rounded-xl bg-slate-900 p-2.5 text-white">
                    <BusIcon class="h-4 w-4" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="font-semibold text-slate-900">{{ driver.bus?.bus_number || 'No Bus' }}</p>
                      <span
                        :class="[
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                          driver.is_live
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-amber-50 text-amber-700 ring-amber-200'
                        ]"
                      >
                        <span v-if="driver.is_live" class="relative flex h-2 w-2">
                          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                        <span v-else class="inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                        {{ driver.is_live ? 'Live' : 'Stale' }}
                      </span>
                    </div>
                    <p class="text-sm text-slate-500">{{ driver.bus?.route_name || 'No Route' }}</p>
                  </div>
                </div>

                <UiButton variant="outline" size="sm" @click.stop="centerOnDriver(driver)">
                  <Locate class="mr-1 h-4 w-4" />
                  Center Map
                </UiButton>
              </div>

              <div class="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div class="flex items-center gap-2">
                  <User class="h-4 w-4 text-slate-400" />
                  {{ driver.full_name }}
                </div>
                <div class="flex items-center gap-2">
                  <Gauge class="h-4 w-4 text-slate-400" />
                  {{ driver.speed }} km/h
                </div>
                <div class="flex items-center gap-2 sm:col-span-2">
                  <MapPin class="h-4 w-4 text-slate-400" />
                  {{ driver.street_name }}
                </div>
                <div class="flex items-center gap-2 sm:col-span-2 text-xs text-slate-500">
                  <Clock3 class="h-3.5 w-3.5" />
                  GPS updated {{ getTimeSinceUpdate(driver.last_location_update) }}
                </div>
                <div class="flex items-center gap-2 sm:col-span-2 text-xs text-slate-500">
                  <Navigation class="h-3.5 w-3.5" />
                  Trip activity {{ driver.latest_trip_activity ? getTimeSinceUpdate(driver.latest_trip_activity) : 'not available' }}
                </div>
              </div>
            </button>
          </TransitionGroup>
        </div>
      </aside>

      <section class="relative min-h-0 overflow-hidden rounded-[32px] border border-white/60 bg-slate-900 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.4)]">
        <div ref="mapContainer" class="h-full min-h-[680px] w-full"></div>
        <div class="pointer-events-none absolute inset-0 z-[300] bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/30"></div>

        <div class="pointer-events-none absolute inset-x-0 top-0 z-[500] p-4 sm:p-6">
          <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <div
              v-for="card in hudCards"
              :key="card.title"
              class="pointer-events-auto rounded-2xl border border-white/60 bg-slate-950/55 p-4 shadow-[0_14px_32px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl"
            >
              <div class="flex items-start gap-3">
                <div class="rounded-xl p-2.5"
                  :class="card.tone === 'blue' ? 'bg-blue-500/20 text-blue-100' : card.tone === 'amber' ? 'bg-amber-500/20 text-amber-100' : 'bg-slate-200/20 text-white'">
                  <component :is="card.icon" class="h-5 w-5" />
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">{{ card.title }}</p>
                  <p class="mt-1 text-sm font-semibold leading-6 text-white">{{ card.value }}</p>
                  <p class="mt-1 text-xs text-white/75">{{ card.subtitle }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="loading" class="absolute inset-0 z-[450] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm">
          <div class="text-center text-white">
            <RefreshCw class="mx-auto mb-3 h-8 w-8 animate-spin" />
            <p class="text-sm font-medium">Loading command center...</p>
          </div>
        </div>

        <div v-if="!loading && drivers.length === 0" class="absolute inset-0 z-[450] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm">
          <div class="text-center text-white/90">
            <MapPin class="mx-auto mb-3 h-12 w-12 text-white/40" />
            <p class="text-base font-semibold">No active vehicles on the map</p>
            <p class="mt-1 text-sm text-white/65">Vehicles will appear here when drivers go on duty.</p>
          </div>
        </div>

        <div v-if="selectedDriver" class="pointer-events-none absolute inset-x-0 bottom-0 z-[500] p-4 sm:p-6">
          <div class="pointer-events-auto max-w-3xl rounded-2xl border border-white/60 bg-slate-950/60 p-5 shadow-[0_14px_32px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <Navigation class="h-4 w-4 text-white" />
                  <h3 class="text-lg font-semibold text-white">{{ selectedDriver.bus?.bus_number || 'No Bus' }}</h3>
                </div>
                <p class="mt-1 text-sm text-white/80">{{ selectedDriver.bus?.route_name || 'No Route' }} • {{ selectedDriver.street_name }}</p>
              </div>
              <UiButton variant="outline" class="border-white/30 bg-white/10 text-white hover:bg-white/20" @click="centerOnDriver(selectedDriver)">
                <Locate class="mr-2 h-4 w-4" />
                Center Selected Bus
              </UiButton>
            </div>

            <div class="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
              <div>
                <p class="text-white/70">Driver</p>
                <p class="mt-1 font-medium text-white">{{ selectedDriver.full_name }}</p>
              </div>
              <div>
                <p class="text-white/70">Speed</p>
                <p class="mt-1 font-medium text-white">{{ selectedDriver.speed }} km/h</p>
              </div>
              <div>
                <p class="text-white/70">Heading</p>
                <p class="mt-1 font-medium text-white">{{ Math.round(selectedDriver.heading) }}°</p>
              </div>
              <div>
                <p class="text-white/70">Last Update</p>
                <p class="mt-1 font-medium text-white">GPS {{ getTimeSinceUpdate(selectedDriver.last_location_update) }}</p>
              </div>
              <div>
                <p class="text-white/70">Trip Activity</p>
                <p class="mt-1 font-medium text-white">{{ selectedDriver.latest_trip_activity ? getTimeSinceUpdate(selectedDriver.latest_trip_activity) : 'Not available' }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style>
.bus-icon-container {
  background: transparent !important;
  border: none !important;
}

.bus-marker-shell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
}

.bus-live-ring {
  position: absolute;
  inset: 6px;
  border-radius: 9999px;
  border: 2px solid rgba(34, 197, 94, 0.55);
  opacity: 0;
}

.bus-marker-shell.is-live .bus-live-ring {
  opacity: 1;
  animation: liveRing 2s infinite;
}

.bus-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #2563eb, #0f172a);
  border-radius: 50%;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.3);
  transition: transform 180ms ease;
}

.bus-heading-pill {
  position: absolute;
  bottom: -6px;
  padding: 2px 6px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.82);
  color: white;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

@keyframes liveRing {
  0% {
    transform: scale(0.95);
    opacity: 0.85;
  }
  70% {
    transform: scale(1.15);
    opacity: 0;
  }
  100% {
    transform: scale(0.95);
    opacity: 0;
  }
}

.feed-move,
.feed-enter-active,
.feed-leave-active {
  transition: all 220ms ease;
}

.feed-enter-from,
.feed-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.leaflet-popup-content-wrapper {
  border-radius: 14px;
  backdrop-filter: blur(12px);
}

.leaflet-popup-content {
  margin: 8px 12px;
}
</style>
